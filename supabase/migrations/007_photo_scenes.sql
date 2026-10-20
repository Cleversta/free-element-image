-- Photo projects embed normalized images so approved scenes remain editable.
-- Apply after 004_editable_scenes.sql and before deploying photo publishing.
alter table public.images drop constraint if exists images_editable_scene_check;
alter table public.images add constraint images_editable_scene_check
  check (editable_scene is null or octet_length(editable_scene) <= 3145728);
