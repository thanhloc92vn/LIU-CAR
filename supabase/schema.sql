-- ============================================================================
-- LIU-CAR (SmartFleet Pro) — Supabase PostgreSQL Schema
-- Hỗ trợ Multi-Tenant SaaS, Quản lý Xe, Tài xế, Lịch trình Cao tốc/Quốc lộ & Đối soát
-- ============================================================================

-- Bảng lưu trữ trạng thái đồng bộ đám mây (JSONB Snapshot + Multi-Tenant)
create table if not exists public.fleet_state (
  id text primary key default 'MAIN_STATE',
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- Bật Row Level Security (RLS) theo chuẩn bảo mật Supabase
alter table public.fleet_state enable row level security;

-- Cho phép đọc/ghi từ ứng dụng (có thể siết chặt theo JWT tenant_id khi bật Auth)
drop policy if exists "Allow anon and authenticated read fleet_state" on public.fleet_state;
create policy "Allow anon and authenticated read fleet_state"
  on public.fleet_state
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Allow anon and authenticated insert fleet_state" on public.fleet_state;
create policy "Allow anon and authenticated insert fleet_state"
  on public.fleet_state
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Allow anon and authenticated update fleet_state" on public.fleet_state;
create policy "Allow anon and authenticated update fleet_state"
  on public.fleet_state
  for update
  to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update on table public.fleet_state to anon, authenticated;
