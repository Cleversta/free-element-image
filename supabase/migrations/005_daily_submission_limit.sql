-- Run after 002. One submission attempt per IP per UTC day.
-- Existing same-day counters count toward the new limit. Safe to rerun.
begin;
create or replace function public.reserve_submission(p_actor_hash text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  day_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
begin
  if p_actor_hash is null or p_actor_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid actor';
  end if;
  -- Serialize the short quota transaction across all application instances.
  perform pg_advisory_xact_lock(748291);
  delete from public.submission_limits where window_start < now() - interval '2 days';
  if coalesce((select attempts from public.submission_limits where scope = 'all' and window_start = day_start), 0) >= 100
    or coalesce((select sum(attempts) from public.submission_limits where scope = p_actor_hash and window_start >= day_start), 0) >= 1 then
    return false;
  end if;
  insert into public.submission_limits (scope, window_start, attempts)
    values ('all', day_start, 1), (p_actor_hash, day_start, 1)
    on conflict (scope, window_start) do update
    set attempts = public.submission_limits.attempts + 1;
  return true;
end;
$$;
revoke all on function public.reserve_submission(text) from public, anon, authenticated;
grant execute on function public.reserve_submission(text) to service_role;
notify pgrst, 'reload schema';
commit;
