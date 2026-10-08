-- When each task was finished, for progress insights. Kept by a trigger so
-- every write path (save_plan's upsert included) records it the same way:
-- set when a task becomes done, kept while it stays done, cleared if reopened.
alter table tasks add column completed_at timestamptz;
update tasks set completed_at = updated_at where status = 'done';
create index tasks_user_completed_idx on tasks (user_id, completed_at) where completed_at is not null;

create or replace function track_task_completion()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'done' then
    if tg_op = 'UPDATE' and old.status = 'done' then
      new.completed_at := coalesce(old.completed_at, now());
    else
      new.completed_at := coalesce(new.completed_at, now());
    end if;
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger on_task_write
  before insert or update on tasks
  for each row execute function track_task_completion();
