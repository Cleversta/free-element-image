-- Apply after 005. No existing images or counters are deleted.
begin;
create table if not exists public.submission_reservations (
  actor_hash text not null,
  token_hash text not null,
  created_at timestamptz not null default now(),
  attempts integer not null default 1,
  primary key (actor_hash, token_hash)
);
alter table public.submission_reservations enable row level security;
revoke all on public.submission_reservations from public, anon, authenticated;

create or replace function public.reserve_submission_attempt(p_actor_hash text, p_token_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare used integer;
begin
  if p_actor_hash is null or p_actor_hash !~ '^[a-f0-9]{64}$'
    or p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid reservation';
  end if;
  perform pg_advisory_xact_lock(748291);
  delete from public.submission_reservations where created_at < now() - interval '2 days';
  select attempts into used from public.submission_reservations
    where actor_hash = p_actor_hash and token_hash = p_token_hash;
  if found then
    -- Retries share one daily quota, but cannot render without a bound.
    if used >= 3 then return false; end if;
    update public.submission_reservations set attempts = attempts + 1
      where actor_hash = p_actor_hash and token_hash = p_token_hash;
    return true;
  end if;
  if not public.reserve_submission(p_actor_hash) then return false; end if;
  insert into public.submission_reservations(actor_hash, token_hash) values(p_actor_hash, p_token_hash);
  return true;
end;
$$;
revoke all on function public.reserve_submission_attempt(text, text) from public, anon, authenticated;
grant execute on function public.reserve_submission_attempt(text, text) to service_role;

create table if not exists public.owner_login_attempts (
  actor_hash text not null,
  window_start timestamptz not null,
  attempts integer not null default 1,
  primary key(actor_hash, window_start)
);
alter table public.owner_login_attempts enable row level security;
revoke all on public.owner_login_attempts from public, anon, authenticated;
create or replace function public.reserve_owner_login(p_actor_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare bucket timestamptz := date_bin(interval '15 minutes', now(), timestamptz '2020-01-01 00:00:00+00');
used integer;
begin
  if p_actor_hash is null or p_actor_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid actor'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_actor_hash, 7812));
  delete from public.owner_login_attempts where window_start < now() - interval '2 days';
  select attempts into used from public.owner_login_attempts where actor_hash = p_actor_hash and window_start = bucket;
  if coalesce(used, 0) >= 10 then return false; end if;
  insert into public.owner_login_attempts(actor_hash, window_start) values(p_actor_hash, bucket)
    on conflict(actor_hash, window_start) do update set attempts = public.owner_login_attempts.attempts + 1;
  return true;
end;
$$;
revoke all on function public.reserve_owner_login(text) from public, anon, authenticated;
grant execute on function public.reserve_owner_login(text) to service_role;
notify pgrst, 'reload schema';
commit;
