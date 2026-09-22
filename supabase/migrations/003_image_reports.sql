-- Run after migrations 001 and 002. Safe to rerun.
begin;
create table if not exists public.image_reports (
  id uuid primary key default gen_random_uuid(),
  image_id uuid not null references public.images(id),
  reporter_hash text not null check (reporter_hash ~ '^[a-f0-9]{64}$'),
  reason text not null check (reason in ('spam','inappropriate','rights','broken')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (image_id, reporter_hash)
);
create index if not exists image_reports_open on public.image_reports(image_id) where resolved_at is null;
alter table public.image_reports enable row level security;
revoke all on public.image_reports from public, anon, authenticated;
grant select, update on public.image_reports to service_role;
create or replace function public.report_image(p_slug text, p_reason text, p_actor_hash text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  target uuid;
  hour_start timestamptz := date_trunc('hour', now());
  day_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  actor_scope text := 'report:' || p_actor_hash;
begin
  if p_actor_hash is null or p_actor_hash !~ '^[a-f0-9]{64}$' or p_reason is null or p_reason not in ('spam','inappropriate','rights','broken') then raise exception 'Invalid report'; end if;
  perform pg_advisory_xact_lock(748292);
  select id into target from public.images where slug=p_slug and status='published' for share;
  if target is null then return 'not_found'; end if;
  if exists(select 1 from public.image_reports where image_id=target and reporter_hash=p_actor_hash) then return 'received'; end if;
  if coalesce((select attempts from public.submission_limits where scope='reports-all' and window_start=day_start),0)>=1000
    or coalesce((select attempts from public.submission_limits where scope=actor_scope and window_start=hour_start),0)>=5 then return 'limited'; end if;
  delete from public.submission_limits where scope like 'report%' and window_start<now()-interval '2 days';
  insert into public.submission_limits(scope,window_start,attempts) values ('reports-all',day_start,1),(actor_scope,hour_start,1)
    on conflict(scope,window_start) do update set attempts=public.submission_limits.attempts+1;
  insert into public.image_reports(image_id,reporter_hash,reason) values(target,p_actor_hash,p_reason);
  return 'received';
end;
$$;
revoke all on function public.report_image(text,text,text) from public,anon,authenticated;
grant execute on function public.report_image(text,text,text) to service_role;
notify pgrst, 'reload schema';
commit;
