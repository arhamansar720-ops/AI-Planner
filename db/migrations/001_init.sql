-- Forma schema for a plain Postgres database (Render Postgres or any other).
-- Accounts, sign-in and sessions are part of the app; every table carries
-- user_id and the app scopes every query to the signed-in user.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  password_hash text,
  display_name text,
  avatar_url text,
  persona text,
  onboarded_at timestamptz,
  connections jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Google / Microsoft identities linked to a user.
create table oauth_accounts (
  provider text not null,
  provider_user_id text not null,
  user_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (provider, provider_user_id)
);
create index oauth_accounts_user_idx on oauth_accounts (user_id);

-- Sessions store only a SHA-256 of the cookie token.
create table sessions (
  id text primary key,
  user_id uuid not null references users (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index sessions_user_idx on sessions (user_id);

create table password_resets (
  token_hash text primary key,
  user_id uuid not null references users (id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);

create table user_preferences (
  user_id uuid primary key references users (id) on delete cascade,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  planning_style text not null default 'balanced' check (planning_style in ('balanced', 'ambitious', 'gentle')),
  default_duration_weeks integer check (default_duration_weeks between 1 and 104),
  daily_minutes integer not null default 60 check (daily_minutes between 10 and 960),
  blocked_weekdays smallint[] not null default '{}',
  response_style text not null default 'concise' check (response_style in ('concise', 'detailed')),
  weekly_summary boolean not null default true,
  task_reminders boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Every new user gets default preferences.
create or replace function create_default_preferences()
returns trigger
language plpgsql
as $$
begin
  insert into user_preferences (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_user_created
  after insert on users
  for each row execute function create_default_preferences();

-- ---------------------------------------------------------------------------
-- Plans
-- ---------------------------------------------------------------------------

create table plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  title text not null,
  description text not null default '',
  objective text not null default '',
  prompt text not null default '',
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  start_date date not null,
  end_date date not null,
  assumptions jsonb not null default '[]',
  priorities jsonb not null default '[]',
  next_actions jsonb not null default '[]',
  risks jsonb not null default '[]',
  constraints jsonb not null default '{}',
  notes text not null default '',
  model text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index plans_user_created_idx on plans (user_id, created_at desc);

create table phases (
  id uuid primary key,
  plan_id uuid not null references plans (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  title text not null,
  summary text not null default '',
  start_date date not null,
  end_date date not null,
  position integer not null default 0
);
create index phases_plan_idx on phases (plan_id);

create table tasks (
  id uuid primary key,
  plan_id uuid not null references plans (id) on delete cascade,
  phase_id uuid not null references phases (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  title text not null,
  description text not null default '',
  notes text not null default '',
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  start_date date not null,
  due_date date not null,
  estimated_minutes integer not null default 60,
  depends_on uuid[] not null default '{}',
  subtasks jsonb not null default '[]',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_plan_idx on tasks (plan_id);

create table milestones (
  id uuid primary key,
  plan_id uuid not null references plans (id) on delete cascade,
  phase_id uuid references phases (id) on delete set null,
  user_id uuid not null references users (id) on delete cascade,
  title text not null,
  description text not null default '',
  date date not null,
  reached boolean not null default false,
  position integer not null default 0
);
create index milestones_plan_idx on milestones (plan_id);

create table resources (
  id uuid primary key,
  plan_id uuid not null references plans (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  title text not null,
  kind text not null default 'other' check (kind in ('link', 'book', 'tool', 'course', 'person', 'other')),
  url text,
  note text not null default '',
  position integer not null default 0
);
create index resources_plan_idx on resources (plan_id);

create table schedule_items (
  id text primary key,
  plan_id uuid not null references plans (id) on delete cascade,
  task_id uuid not null references tasks (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  date date not null,
  start_minute integer not null,
  duration_minutes integer not null
);
create index schedule_items_plan_idx on schedule_items (plan_id, date);

-- ---------------------------------------------------------------------------
-- Assistant conversations
-- ---------------------------------------------------------------------------

create table conversations (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null unique references plans (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  changes jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- save_plan: write a whole plan aggregate atomically for one user.
-- ---------------------------------------------------------------------------

create or replace function save_plan(uid uuid, p_plan jsonb)
returns timestamptz
language plpgsql
as $$
declare
  pid uuid := (p_plan ->> 'id')::uuid;
  saved_at timestamptz := now();
begin
  insert into plans as p (
    id, user_id, title, description, objective, prompt, status, priority,
    start_date, end_date, assumptions, priorities, next_actions, risks,
    constraints, notes, model, created_at, updated_at
  ) values (
    pid, uid,
    p_plan ->> 'title',
    coalesce(p_plan ->> 'description', ''),
    coalesce(p_plan ->> 'objective', ''),
    coalesce(p_plan ->> 'prompt', ''),
    p_plan ->> 'status',
    p_plan ->> 'priority',
    (p_plan ->> 'startDate')::date,
    (p_plan ->> 'endDate')::date,
    coalesce(p_plan -> 'assumptions', '[]'),
    coalesce(p_plan -> 'priorities', '[]'),
    coalesce(p_plan -> 'nextActions', '[]'),
    coalesce(p_plan -> 'risks', '[]'),
    coalesce(p_plan -> 'constraints', '{}'),
    coalesce(p_plan ->> 'notes', ''),
    coalesce(p_plan ->> 'model', ''),
    coalesce((p_plan ->> 'createdAt')::timestamptz, saved_at),
    saved_at
  )
  on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    objective = excluded.objective,
    status = excluded.status,
    priority = excluded.priority,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    assumptions = excluded.assumptions,
    priorities = excluded.priorities,
    next_actions = excluded.next_actions,
    risks = excluded.risks,
    constraints = excluded.constraints,
    notes = excluded.notes,
    updated_at = saved_at
  where p.user_id = uid;

  if not exists (select 1 from plans where id = pid and user_id = uid) then
    raise exception 'plan not found' using errcode = '42501';
  end if;

  -- Remove children that no longer exist (schedule first, then tasks, then phases).
  delete from schedule_items where plan_id = pid;
  delete from tasks where plan_id = pid and id not in (
    select (x ->> 'id')::uuid from jsonb_array_elements(p_plan -> 'tasks') x);
  delete from milestones where plan_id = pid and id not in (
    select (x ->> 'id')::uuid from jsonb_array_elements(p_plan -> 'milestones') x);
  delete from resources where plan_id = pid and id not in (
    select (x ->> 'id')::uuid from jsonb_array_elements(p_plan -> 'resources') x);
  delete from phases where plan_id = pid and id not in (
    select (x ->> 'id')::uuid from jsonb_array_elements(p_plan -> 'phases') x);

  insert into phases (id, plan_id, user_id, title, summary, start_date, end_date, position)
  select (x ->> 'id')::uuid, pid, uid, x ->> 'title', coalesce(x ->> 'summary', ''),
         (x ->> 'startDate')::date, (x ->> 'endDate')::date, (x ->> 'order')::int
  from jsonb_array_elements(p_plan -> 'phases') x
  on conflict (id) do update set
    title = excluded.title, summary = excluded.summary, start_date = excluded.start_date,
    end_date = excluded.end_date, position = excluded.position
  where phases.plan_id = pid;

  insert into tasks (
    id, plan_id, phase_id, user_id, title, description, notes, status, priority,
    start_date, due_date, estimated_minutes, depends_on, subtasks, position, updated_at
  )
  select (x ->> 'id')::uuid, pid, (x ->> 'phaseId')::uuid, uid,
         x ->> 'title', coalesce(x ->> 'description', ''), coalesce(x ->> 'notes', ''),
         x ->> 'status', x ->> 'priority',
         (x ->> 'startDate')::date, (x ->> 'dueDate')::date,
         (x ->> 'estimatedMinutes')::int,
         coalesce(array(select jsonb_array_elements_text(x -> 'dependsOn'))::uuid[], '{}'),
         coalesce(x -> 'subtasks', '[]'),
         (x ->> 'order')::int,
         saved_at
  from jsonb_array_elements(p_plan -> 'tasks') x
  on conflict (id) do update set
    phase_id = excluded.phase_id, title = excluded.title, description = excluded.description,
    notes = excluded.notes, status = excluded.status, priority = excluded.priority,
    start_date = excluded.start_date, due_date = excluded.due_date,
    estimated_minutes = excluded.estimated_minutes, depends_on = excluded.depends_on,
    subtasks = excluded.subtasks, position = excluded.position, updated_at = saved_at
  where tasks.plan_id = pid;

  insert into milestones (id, plan_id, phase_id, user_id, title, description, date, reached, position)
  select (x ->> 'id')::uuid, pid, nullif(x ->> 'phaseId', '')::uuid, uid, x ->> 'title',
         coalesce(x ->> 'description', ''), (x ->> 'date')::date,
         coalesce((x ->> 'reached')::boolean, false), (x ->> 'order')::int
  from jsonb_array_elements(p_plan -> 'milestones') x
  on conflict (id) do update set
    phase_id = excluded.phase_id, title = excluded.title, description = excluded.description,
    date = excluded.date, reached = excluded.reached, position = excluded.position
  where milestones.plan_id = pid;

  insert into resources (id, plan_id, user_id, title, kind, url, note, position)
  select (x ->> 'id')::uuid, pid, uid, x ->> 'title', x ->> 'kind', nullif(x ->> 'url', ''),
         coalesce(x ->> 'note', ''), (x ->> 'order')::int
  from jsonb_array_elements(p_plan -> 'resources') x
  on conflict (id) do update set
    title = excluded.title, kind = excluded.kind, url = excluded.url,
    note = excluded.note, position = excluded.position
  where resources.plan_id = pid;

  insert into schedule_items (id, plan_id, task_id, user_id, date, start_minute, duration_minutes)
  select x ->> 'id', pid, (x ->> 'taskId')::uuid, uid, (x ->> 'date')::date,
         (x ->> 'startMinute')::int, (x ->> 'durationMinutes')::int
  from jsonb_array_elements(p_plan -> 'schedule') x;

  return saved_at;
end;
$$;
