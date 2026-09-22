-- Apply after 001_images.sql. Safe to rerun to repair a partial setup.
-- Existing quota counters are preserved. Shared limits survive serverless restarts.
begin;
create table if not exists public.submission_limits (
  scope text not null,
  window_start timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0),
  primary key (scope, window_start)
);
alter table public.submission_limits enable row level security;
revoke all on public.submission_limits from public, anon, authenticated;
grant select on public.submission_limits to service_role;

create or replace function public.reserve_submission(p_actor_hash text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  hour_start timestamptz := date_trunc('hour', now());
  day_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
begin
  if p_actor_hash is null or p_actor_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid actor';
  end if;
  -- Serialize the short quota transaction across all application instances.
  perform pg_advisory_xact_lock(748291);
  delete from public.submission_limits where window_start < now() - interval '2 days';
  if coalesce((select attempts from public.submission_limits where scope = 'all' and window_start = day_start), 0) >= 100
    or coalesce((select attempts from public.submission_limits where scope = p_actor_hash and window_start = hour_start), 0) >= 5 then
    return false;
  end if;
  insert into public.submission_limits (scope, window_start, attempts)
    values ('all', day_start, 1), (p_actor_hash, hour_start, 1)
    on conflict (scope, window_start) do update
    set attempts = public.submission_limits.attempts + 1;
  return true;
end;
$$;
revoke all on function public.reserve_submission(text) from public, anon, authenticated;
grant execute on function public.reserve_submission(text) to service_role;
notify pgrst, 'reload schema';
commit;
