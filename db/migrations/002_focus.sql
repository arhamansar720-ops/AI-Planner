-- Focus timer sessions: real minutes spent, so plans can learn from them.
create table focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  plan_id uuid references plans (id) on delete set null,
  task_id uuid,
  task_title text not null default '',
  minutes integer not null check (minutes between 1 and 600),
  started_at timestamptz not null,
  ended_at timestamptz not null default now()
);
create index focus_sessions_user_idx on focus_sessions (user_id, ended_at desc);
