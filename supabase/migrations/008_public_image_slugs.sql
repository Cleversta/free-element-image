-- Add readable public page URLs while preserving the UUID-based internal slug
-- used by image storage, reports, edit links, and management flows.
begin;

alter table public.images add column if not exists public_slug text;

create or replace function public.image_public_slug_base(p_title text)
returns text language sql immutable set search_path = '' as $$
  with cleaned as (
    select coalesce(
    nullif(trim(both '-' from regexp_replace(
      regexp_replace(lower(coalesce(p_title, '')), '[^a-z0-9]+', '-', 'g'),
      '-+', '-', 'g'
    )), ''),
    'free'
    ) as value
  )
  select case when cleaned.value like '%-image' then cleaned.value
    else cleaned.value || '-image' end
  from cleaned;
$$;

with bases as (
  select id, public.image_public_slug_base(title) as base
  from public.images
), numbered as (
  select id, base, row_number() over (partition by base order by id) as position
  from bases
)
update public.images as image
set public_slug = case
  when numbered.position = 1 then numbered.base
  else numbered.base || '-' || numbered.position::text
end
from numbered
where image.id = numbered.id and image.public_slug is null;

alter table public.images alter column public_slug set not null;
alter table public.images add constraint images_public_slug_format
  check (public_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(public_slug) <= 180);
create unique index if not exists images_public_slug_unique on public.images(public_slug);

create or replace function public.set_image_public_slug()
returns trigger language plpgsql set search_path = '' as $$
declare
  base text;
  candidate text;
  suffix integer := 1;
begin
  if new.public_slug is not null then return new; end if;
  base := public.image_public_slug_base(new.title);
  perform pg_advisory_xact_lock(hashtextextended(base, 190826));
  candidate := base;
  while exists (select 1 from public.images where public_slug = candidate) loop
    suffix := suffix + 1;
    candidate := base || '-' || suffix::text;
  end loop;
  new.public_slug := candidate;
  return new;
end;
$$;

create trigger images_public_slug_before_insert
before insert on public.images
for each row execute function public.set_image_public_slug();

revoke all on function public.image_public_slug_base(text) from public, anon, authenticated;
grant execute on function public.image_public_slug_base(text) to service_role;
revoke all on function public.set_image_public_slug() from public, anon, authenticated;
notify pgrst, 'reload schema';
commit;
