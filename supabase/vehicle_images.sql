-- ============================================================================
-- Haydixe — Kho ảnh xe trên Supabase Storage (chạy SAU auth_rls.sql)
-- Supabase -> SQL Editor -> dán toàn bộ -> Run. Chạy lại nhiều lần không sao.
--
-- Ảnh xe không còn nhét vào fleet_state dưới dạng base64 (làm mỗi lần lưu nặng ~1MB),
-- mà nằm trong bucket công khai `vehicle-images`; dữ liệu xe chỉ giữ đường link.
-- Ai cũng xem được ảnh (trang khách cần), chỉ admin (is_admin) được tải lên / xóa.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vehicle-images', 'vehicle-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin upload vehicle images" on storage.objects;
create policy "admin upload vehicle images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vehicle-images' and public.is_admin());

drop policy if exists "admin delete vehicle images" on storage.objects;
create policy "admin delete vehicle images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'vehicle-images' and public.is_admin());
