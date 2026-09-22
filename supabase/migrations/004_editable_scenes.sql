-- Run after migrations 001–003. Existing images remain download-only.
begin;
alter table public.images add column if not exists editable_scene text
  check (editable_scene is null or octet_length(editable_scene) <= 200000);
notify pgrst, 'reload schema';
commit;
