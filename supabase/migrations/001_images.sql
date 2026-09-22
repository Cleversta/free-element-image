-- Step 1: anonymous submissions. No visitor accounts or browser database access.
-- Apply once in the Supabase SQL editor for a new project.
begin;

create table public.images (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 180),
  title text not null check (char_length(btrim(title)) between 3 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  category text not null default 'nature' check (char_length(category) between 1 and 40),
  status text not null default 'uploading'
    check (status in ('uploading', 'pending', 'published', 'rejected', 'deleting', 'deleted')),
  management_token_hash text not null unique check (management_token_hash ~ '^[a-f0-9]{64}$'),
  private_object_prefix text not null unique,
  public_image_key text unique,
  public_thumbnail_key text unique,
  image_bytes bigint check (image_bytes between 1 and 10485760),
  image_width integer check (image_width between 1 and 8192),
  image_height integer check (image_height between 1 and 8192),
  license_code text check (char_length(license_code) between 1 and 80),
  sharing_consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  expires_at timestamptz,
  deleted_at timestamptz,
  constraint publication_requires_complete_image check (
    status <> 'published' or (
      public_image_key is not null and public_thumbnail_key is not null
      and image_bytes is not null and image_width is not null and image_height is not null
      and license_code is not null and published_at is not null and deleted_at is null
    )
  ),
  constraint deleted_image_has_timestamp check (status <> 'deleted' or deleted_at is not null)
);

create index images_gallery_recent on public.images (published_at desc, id)
  where status = 'published';
create index images_review_queue on public.images (created_at, id)
  where status = 'pending';
create index images_expired_uploads on public.images (expires_at)
  where status = 'uploading';

create function public.set_image_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger images_updated_at before update on public.images
  for each row execute function public.set_image_updated_at();

alter table public.images enable row level security;
-- No anon/authenticated policies: ALL access goes through the trusted backend.
-- Public gallery queries will return only published rows and safe columns.
revoke all on table public.images from public, anon, authenticated;
grant select, insert, update, delete on table public.images to service_role;
revoke all on function public.set_image_updated_at() from public, anon, authenticated;

comment on column public.images.management_token_hash is
  'SHA-256 of the random private management token. Never store the raw token or return this hash in gallery responses.';
comment on column public.images.license_code is
  'Set to the agreed reuse license only after source artwork rights are verified. No automatic public-domain claim.';
commit;
