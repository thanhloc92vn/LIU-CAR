-- ============================================================================
-- Haydixe — Full Supabase PostgreSQL Schema
-- Copy toàn bộ nội dung này dán vào: Supabase -> SQL Editor -> Bấm "Run"
-- ============================================================================

-- 1. Bảng Đơn vị Vận tải / Chi nhánh (Multi-Tenant SaaS)
create table if not exists public.tenants (
  id text primary key,
  name text not null,
  short_name text not null,
  tax_code text,
  hotline text,
  bank_info text,
  default_dispatch_fee_percent numeric default 10,
  auto_fuel_deduction_enabled boolean default true,
  auto_highway_toll_enabled boolean default true,
  telegram_bot_token text,
  telegram_group_chat_id text,
  zalo_oa_name text,
  created_at timestamptz default now()
);

-- 2. Bảng Đội xe (Hãng xe, Loại xe, Loại ghế 4 chỗ, 7 chỗ, 16 chỗ...)
create table if not exists public.vehicles (
  id text primary key,
  tenant_id text not null references public.tenants(id) on delete cascade,
  plate_number text not null,
  brand text not null,
  model text not null,
  vehicle_type text not null,
  seat_category text not null,
  year integer default 2025,
  color text,
  service_mode text default 'BOTH',
  daily_rate_self_drive numeric default 0,
  fuel_cost_per_km numeric default 0,
  highway_toll_multiplier numeric default 1.0,
  status text default 'AVAILABLE',
  current_odo_km numeric default 0,
  inspection_expiry text,
  insurance_expiry text,
  notes text,
  updated_at timestamptz default now()
);

create index if not exists idx_vehicles_tenant_id on public.vehicles(tenant_id);
create index if not exists idx_vehicles_seat_category on public.vehicles(seat_category);

-- 3. Bảng Hồ sơ Tài xế / Người lái
create table if not exists public.drivers (
  id text primary key,
  tenant_id text not null references public.tenants(id) on delete cascade,
  code text not null,
  full_name text not null,
  phone text not null,
  cccd text,
  license_number text,
  license_class text default 'B2',
  license_expiry text,
  experience_years integer default 5,
  address text,
  bank_name text,
  bank_account text,
  telegram_username text,
  zalo_phone text,
  status text default 'ACTIVE',
  base_commission_percent numeric default 10,
  notes text,
  updated_at timestamptz default now()
);

create index if not exists idx_drivers_tenant_id on public.drivers(tenant_id);
create index if not exists idx_drivers_full_name on public.drivers(full_name);

-- 4. Bảng Lịch trình Chuyến đi, Doanh thu, Tự cấn trừ & Chi phí Phạt / Đậu xe
create table if not exists public.trips (
  id text primary key,
  tenant_id text not null references public.tenants(id) on delete cascade,
  trip_code text not null,
  booking_type text default 'WITH_DRIVER',
  vehicle_id text references public.vehicles(id) on delete set null,
  driver_id text references public.drivers(id) on delete set null,
  tagged_driver_ids jsonb default '[]'::jsonb,
  customer_name text not null,
  customer_phone text,
  trip_date text not null,
  departure_time text,
  return_time text,
  pickup_location text,
  dropoff_location text,
  route_type text not null, -- HIGHWAY (Cao tốc) | NATIONAL_ROAD (Quốc lộ) | MIXED
  route_detail text,
  distance_km numeric default 0,
  is_round_trip boolean default true,
  base_fare_revenue numeric default 0,
  surcharge_revenue numeric default 0,
  payment_collected_by text default 'COMPANY_BANK',
  auto_highway_toll numeric default 0,
  auto_fuel_quota numeric default 0,
  auto_dispatch_fee numeric default 0,
  manual_expense_total numeric default 0,
  manual_expense_note text,
  parking_fee numeric default 0,
  parking_note text,
  traffic_fine_fee numeric default 0,
  traffic_fine_note text,
  other_risk_fee numeric default 0,
  other_risk_note text,
  net_remaining_to_account numeric default 0,
  status text default 'PENDING_CONFIRM',
  bot_channel text default 'BOTH',
  bot_confirmed_at text,
  bot_confirmed_by_driver_name text,
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_trips_tenant_id on public.trips(tenant_id);
create index if not exists idx_trips_driver_id on public.trips(driver_id);
create index if not exists idx_trips_trip_date on public.trips(trip_date);

-- 5. Bảng Đồng bộ Trạng thái Thời gian thực cho App Web & Di động
create table if not exists public.fleet_state (
  id text primary key default 'MAIN_STATE',
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- 6. Bật Row-Level Security (RLS) và phân quyền API
alter table public.tenants enable row level security;
alter table public.vehicles enable row level security;
alter table public.drivers enable row level security;
alter table public.trips enable row level security;
alter table public.fleet_state enable row level security;

drop policy if exists "Public access tenants" on public.tenants;
create policy "Public access tenants" on public.tenants for all to anon, authenticated using (true) with check (true);

drop policy if exists "Public access vehicles" on public.vehicles;
create policy "Public access vehicles" on public.vehicles for all to anon, authenticated using (true) with check (true);

drop policy if exists "Public access drivers" on public.drivers;
create policy "Public access drivers" on public.drivers for all to anon, authenticated using (true) with check (true);

drop policy if exists "Public access trips" on public.trips;
create policy "Public access trips" on public.trips for all to anon, authenticated using (true) with check (true);

drop policy if exists "Public access fleet_state" on public.fleet_state;
create policy "Public access fleet_state" on public.fleet_state for all to anon, authenticated using (true) with check (true);

grant all on table public.tenants to anon, authenticated;
grant all on table public.vehicles to anon, authenticated;
grant all on table public.drivers to anon, authenticated;
grant all on table public.trips to anon, authenticated;
grant all on table public.fleet_state to anon, authenticated;
-- Liên kết tài xế với tài khoản Telegram. Chỉ máy chủ (service_role) được ghi; app đọc để hiện trạng thái.
create table if not exists public.telegram_links (
  driver_id text primary key,
  chat_id bigint not null,
  code_used text not null,
  telegram_username text,
  linked_at timestamptz not null default now()
);
create index if not exists idx_telegram_links_chat on public.telegram_links(chat_id);

alter table public.telegram_links enable row level security;

-- App (khóa công khai) chỉ được đọc; không có chính sách ghi nên chỉ service_role ghi được
drop policy if exists "Read telegram links" on public.telegram_links;
create policy "Read telegram links" on public.telegram_links for select to anon, authenticated using (true);
