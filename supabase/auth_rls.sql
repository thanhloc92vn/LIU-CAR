-- ============================================================================
-- Haydixe — Phân quyền bằng Supabase Auth + khóa dữ liệu (chạy SAU schema.sql và telegram_links.sql)
-- Supabase -> SQL Editor -> dán toàn bộ -> Run. Chạy lại nhiều lần không sao.
--
-- Sau khi chạy:
--   * Khóa publishable (nằm trên trang khách) KHÔNG còn đọc/ghi được dữ liệu nào.
--   * Admin (SUPER_ADMIN / DISPATCHER / ACCOUNTANT): xem và sửa toàn bộ.
--   * Tài xế (DRIVER): chỉ xem chuyến của mình qua driver_state(), chỉ thao tác qua driver_trip_action().
--   * Trang khách đi qua máy chủ Vercel (api/public-*.js) bằng SUPABASE_SERVICE_KEY.
--
-- Tạo người dùng: Dashboard -> Authentication -> Users -> "Add user" (tick Auto Confirm) hoặc "Invite".
--   Tài xế không có email: đặt email là <số điện thoại>@taixe.haydixe.vn, khi đăng nhập chỉ cần gõ số điện thoại.
-- Cấp quyền: chủ hệ thống vào app -> "Bảo mật Admin" -> Cấp quyền (gọi admin_set_staff bên dưới).
-- Tài khoản chủ hệ thống đầu tiên: xem mục 9 cuối file.
-- Nhớ tắt đăng ký tự do: Authentication -> Sign In / Providers -> tắt "Allow new users to sign up".
-- ============================================================================

-- 1. Danh sách nhân sự được phép vào app
create table if not exists public.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null check (role in ('SUPER_ADMIN', 'DISPATCHER', 'ACCOUNTANT', 'DRIVER')),
  driver_id text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (role <> 'DRIVER' or driver_id is not null)
);
alter table public.staff enable row level security;

create or replace function public.is_staff(roles text[] default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.staff s
    where s.user_id = auth.uid() and s.active and (roles is null or s.role = any(roles))
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff(array['SUPER_ADMIN', 'DISPATCHER', 'ACCOUNTANT']);
$$;

revoke all on function public.is_staff(text[]) from public, anon;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_staff(text[]) to authenticated;
grant execute on function public.is_admin() to authenticated;

revoke all on public.staff from anon;
grant select, delete on public.staff to authenticated;
drop policy if exists "staff read" on public.staff;
create policy "staff read" on public.staff for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "super admin delete staff" on public.staff;
create policy "super admin delete staff" on public.staff for delete to authenticated
  using (public.is_staff(array['SUPER_ADMIN']) and user_id <> auth.uid());

-- Chủ hệ thống cấp/sửa quyền cho một tài khoản đã tạo trong Authentication (tìm theo email)
create or replace function public.admin_set_staff(
  p_email text, p_role text, p_full_name text default '', p_driver_id text default null, p_active boolean default true
) returns void language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.is_staff(array['SUPER_ADMIN']) then
    raise exception 'Chỉ chủ hệ thống được cấp quyền' using errcode = '42501';
  end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then
    raise exception 'Chưa có tài khoản % trong Authentication. Tạo trong Supabase Dashboard trước.', p_email
      using errcode = 'P0002';
  end if;
  if uid = auth.uid() and (p_role <> 'SUPER_ADMIN' or not p_active) then
    raise exception 'Không thể tự hạ quyền hoặc tự khóa tài khoản của mình' using errcode = '42501';
  end if;
  insert into public.staff (user_id, email, full_name, role, driver_id, active)
  values (uid, lower(trim(p_email)), coalesce(p_full_name, ''), p_role,
          case when p_role = 'DRIVER' then nullif(p_driver_id, '') end, p_active)
  on conflict (user_id) do update set
    email = excluded.email, full_name = excluded.full_name, role = excluded.role,
    driver_id = excluded.driver_id, active = excluded.active;
end $$;
revoke all on function public.admin_set_staff(text, text, text, text, boolean) from public, anon;
grant execute on function public.admin_set_staff(text, text, text, text, boolean) to authenticated;

-- 2. fleet_state: chỉ admin đọc/sửa. Không ai (trừ máy chủ) được thêm/xóa dòng.
drop policy if exists "Public access fleet_state" on public.fleet_state;
revoke all on public.fleet_state from anon, authenticated;
grant select, update on public.fleet_state to authenticated;
drop policy if exists "admin read state" on public.fleet_state;
create policy "admin read state" on public.fleet_state for select to authenticated using (public.is_admin());
drop policy if exists "admin update state" on public.fleet_state;
create policy "admin update state" on public.fleet_state for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Dòng state duy nhất phải có sẵn (cài mới), vì app chỉ được sửa chứ không được thêm dòng
insert into public.fleet_state (id, payload) values ('MAIN_STATE', '{}'::jsonb) on conflict (id) do nothing;

-- Mật khẩu cũ lưu dạng chữ trong payload: xóa hẳn
update public.fleet_state set payload = payload - 'adminAccounts' where payload ? 'adminAccounts';

-- 3. Admin lưu có kiểm tra phiên bản: nếu dữ liệu đã đổi sau lần tải (khách đặt, tài xế xác nhận)
--    thì báo STALE_STATE để app gộp rồi lưu lại, không ghi đè mất thay đổi của người khác.
create or replace function public.save_state(p_payload jsonb, p_base timestamptz)
returns timestamptz language plpgsql security invoker set search_path = public as $$
declare cur timestamptz; ts timestamptz := clock_timestamp();
begin
  select updated_at into cur from public.fleet_state where id = 'MAIN_STATE' for update;
  if cur is null then raise exception 'NO_ACCESS' using errcode = '42501'; end if;
  if p_base is null or cur > p_base then raise exception 'STALE_STATE' using errcode = '40001'; end if;
  update public.fleet_state set payload = p_payload - 'adminAccounts', updated_at = ts where id = 'MAIN_STATE';
  return ts;
end $$;
revoke all on function public.save_state(jsonb, timestamptz) from public, anon;
grant execute on function public.save_state(jsonb, timestamptz) to authenticated;

-- 4. Lịch khách đặt trên web: chỉ máy chủ (service_role) gọi, nối thêm chuyến chứ không ghi đè state
create or replace function public.append_trip(p_trip jsonb, p_log jsonb default null)
returns void language sql security definer set search_path = public as $$
  update public.fleet_state
  set payload = jsonb_set(
        jsonb_set(payload, '{trips}', jsonb_build_array(p_trip) || coalesce(payload->'trips', '[]'::jsonb)),
        '{botLogs}',
        case when p_log is null then '[]'::jsonb else jsonb_build_array(p_log) end
          || coalesce(payload->'botLogs', '[]'::jsonb)),
      updated_at = clock_timestamp()
  where id = 'MAIN_STATE';
$$;
revoke all on function public.append_trip(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.append_trip(jsonb, jsonb) to service_role;

-- 5. Tài xế: các hàm phụ dùng chung
create or replace function public.norm_plate(p text)
returns text language sql immutable as $$ select regexp_replace(upper(coalesce(p, '')), '[^A-Z0-9]', '', 'g') $$;

-- Hồ sơ tài xế có phải chủ của chiếc xe này không (theo biển số), giống utils/party.ts
create or replace function public.owns_vehicle(d jsonb, v jsonb)
returns boolean language sql immutable as $$
  select d is not null and v is not null and d->>'partyType' = 'VEHICLE_OWNER'
    and exists (
      select 1 from jsonb_array_elements_text(
        case when jsonb_array_length(coalesce(d->'ownedPlateNumbers', '[]'::jsonb)) > 0 then d->'ownedPlateNumbers'
             else jsonb_build_array(coalesce(d->>'ownedPlateNumber', '')) end) p
      where public.norm_plate(p) <> '' and public.norm_plate(p) = public.norm_plate(v->>'plateNumber'));
$$;

-- Chuyến của tài xế: chuyến có tài xế đã điều phối cho chính họ, hoặc mọi chuyến dùng xe họ làm chủ
create or replace function public.driver_owns_trip(st jsonb, me jsonb, t jsonb)
returns boolean language sql immutable as $$
  select (t->>'bookingType' <> 'SELF_DRIVE' and t->>'driverId' = me->>'id'
          and (coalesce(t->>'dispatchedAt', '') <> '' or t->>'status' <> 'PENDING_CONFIRM'))
      or public.owns_vehicle(me, (select v from jsonb_array_elements(st->'vehicles') v where v->>'id' = t->>'vehicleId' limit 1));
$$;

create or replace function public.current_driver_id()
returns text language sql stable security definer set search_path = public as $$
  select driver_id from public.staff where user_id = auth.uid() and active and role = 'DRIVER';
$$;

revoke all on function public.norm_plate(text) from public, anon;
revoke all on function public.owns_vehicle(jsonb, jsonb) from public, anon;
revoke all on function public.driver_owns_trip(jsonb, jsonb, jsonb) from public, anon;
revoke all on function public.current_driver_id() from public, anon;

-- 6. Dữ liệu tài xế được xem: hồ sơ của mình, xe, chuyến của mình. Không có hồ sơ tài xế khác, log bot, chuyến người khác.
create or replace function public.driver_state()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare st jsonb; me jsonb; did text := public.current_driver_id();
begin
  if did is null then raise exception 'Tài khoản chưa được cấp quyền tài xế' using errcode = '42501'; end if;
  select payload into st from public.fleet_state where id = 'MAIN_STATE';
  select d into me from jsonb_array_elements(st->'drivers') d where d->>'id' = did limit 1;
  if me is null then raise exception 'Không tìm thấy hồ sơ tài xế %', did using errcode = 'P0002'; end if;
  return jsonb_build_object(
    'activeTenantId', st->'activeTenantId',
    'tenants', coalesce((select jsonb_agg(t - 'telegramBotToken' - 'bankInfo')
                         from jsonb_array_elements(st->'tenants') t where t->>'id' = me->>'tenantId'), '[]'::jsonb),
    'vehicles', coalesce((select jsonb_agg(v) from jsonb_array_elements(st->'vehicles') v
                          where v->>'tenantId' = me->>'tenantId'), '[]'::jsonb),
    'drivers', jsonb_build_array(me),
    'trips', coalesce((select jsonb_agg(t) from jsonb_array_elements(st->'trips') t
                       where public.driver_owns_trip(st, me, t)), '[]'::jsonb),
    'highwayPresets', coalesce(st->'highwayPresets', '[]'::jsonb),
    'journeyRoutes', coalesce(st->'journeyRoutes', '[]'::jsonb),
    'botLogs', '[]'::jsonb
  );
end $$;
revoke all on function public.driver_state() from public, anon;
grant execute on function public.driver_state() to authenticated;

-- 7. Thao tác của tài xế trên chuyến của mình. p_action: CONFIRMED | IN_PROGRESS | COMPLETED | ADD_EXPENSE
--    Luật giống nút trên thẻ chuyến trong App.tsx.
create or replace function public.driver_trip_action(
  p_trip_id text, p_action text, p_kind text default null, p_amount numeric default null, p_note text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  st jsonb; me jsonb; t jsonb; idx int; did text := public.current_driver_id();
  self_drive boolean; status text; who text; now_vn timestamp := now() at time zone 'Asia/Ho_Chi_Minh';
  label text; fee_key text; note_key text; log jsonb := null;
begin
  if did is null then raise exception 'Tài khoản chưa được cấp quyền tài xế' using errcode = '42501'; end if;
  select payload into st from public.fleet_state where id = 'MAIN_STATE' for update;
  select d into me from jsonb_array_elements(st->'drivers') d where d->>'id' = did limit 1;
  select e.value, e.ordinality - 1 into t, idx
    from jsonb_array_elements(st->'trips') with ordinality e where e.value->>'id' = p_trip_id;
  if t is null or me is null or not public.driver_owns_trip(st, me, t) then
    raise exception 'Không có quyền với chuyến này' using errcode = '42501';
  end if;

  self_drive := t->>'bookingType' = 'SELF_DRIVE';
  status := t->>'status';
  who := coalesce(me->>'fullName', '');

  if p_action = 'CONFIRMED' and status = 'PENDING_CONFIRM' then
    t := t || jsonb_build_object('status', 'CONFIRMED',
           'botConfirmedAt', to_char(now_vn, 'HH24:MI:SS FMDD/FMMM/YYYY'), 'botConfirmedByDriverName', who);
    if not self_drive then
      log := jsonb_build_object(
        'id', 'LOG-' || (extract(epoch from clock_timestamp()) * 1000)::bigint,
        'tenantId', t->>'tenantId', 'tripId', t->>'id', 'tripCode', t->>'tripCode',
        'timestamp', to_char(now_vn, 'HH24:MI:SS FMDD/FMMM/YYYY'), 'channel', 'AI_SYSTEM',
        'recipientDriverId', me->>'id', 'recipientName', who, 'recipientHandle', coalesce(me->>'phone', ''),
        'messageType', 'BOOKING_CONFIRM',
        'content', format('Tài xế %s đã bấm nút [XÁC NHẬN LỊCH #%s] trên ứng dụng. Hệ thống đã khóa lịch xe và ghi nhận tự cấn trừ.',
                          who, t->>'tripCode'),
        'status', 'DRIVER_CONFIRMED');
    end if;
  elsif p_action = 'IN_PROGRESS' and status = 'CONFIRMED' then
    t := t || jsonb_build_object('status', 'IN_PROGRESS');
  elsif p_action = 'COMPLETED' and (status = 'IN_PROGRESS' or (not self_drive and status = 'CONFIRMED')) then
    t := t || jsonb_build_object('status', 'COMPLETED',
           'completedAt', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'completedByName', who);
  elsif p_action = 'ADD_EXPENSE' and status in ('CONFIRMED', 'IN_PROGRESS') and coalesce(p_amount, 0) > 0 then
    fee_key := case p_kind when 'PARKING' then 'parkingFee' when 'TIRE' then 'otherRiskFee'
                           when 'FINE' then 'trafficFineFee' else 'manualExpenseTotal' end;
    note_key := case p_kind when 'PARKING' then 'parkingNote' when 'TIRE' then 'otherRiskNote'
                            when 'FINE' then 'trafficFineNote' else 'manualExpenseNote' end;
    label := format('%s (%s, %s)',
      coalesce(nullif(trim(p_note), ''), case p_kind when 'PARKING' then 'Đậu xe / bến bãi'
        when 'TIRE' then 'Vá lốp / sự cố xe' when 'FINE' then 'Phạt giao thông' else 'Chi phí khác (rửa xe, nước uống...)' end),
      who, to_char(now_vn, 'FMDD/FMMM/YYYY'));
    t := t || jsonb_build_object(
      fee_key, coalesce((t->>fee_key)::numeric, 0) + p_amount,
      note_key, case when coalesce(t->>note_key, '') = '' then label else (t->>note_key) || '; ' || label end);
  else
    raise exception 'Thao tác không hợp lệ với trạng thái hiện tại của chuyến' using errcode = '22023';
  end if;

  st := jsonb_set(st, array['trips', idx::text], t);
  if log is not null then
    st := jsonb_set(st, '{botLogs}', jsonb_build_array(log) || coalesce(st->'botLogs', '[]'::jsonb));
  end if;
  update public.fleet_state set payload = st, updated_at = clock_timestamp() where id = 'MAIN_STATE';
end $$;
revoke all on function public.driver_trip_action(text, text, text, numeric, text) from public, anon;
grant execute on function public.driver_trip_action(text, text, text, numeric, text) to authenticated;

-- 8. Bảng quan hệ (bản sao để xem trên Table Editor) và liên kết Telegram: chỉ admin
do $$ declare t text; begin
  foreach t in array array['tenants', 'vehicles', 'drivers', 'trips'] loop
    execute format('drop policy if exists "Public access %s" on public.%I', t, t);
    execute format('drop policy if exists "admin all %s" on public.%I', t, t);
    execute format('revoke all on public.%I from anon', t);
    execute format('create policy "admin all %s" on public.%I for all to authenticated
                    using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;

drop policy if exists "Read telegram links" on public.telegram_links;
drop policy if exists "admin read telegram links" on public.telegram_links;
revoke all on public.telegram_links from anon;
create policy "admin read telegram links" on public.telegram_links for select to authenticated using (public.is_admin());

-- 9. Chủ hệ thống đầu tiên: tạo user trong Authentication trước, rồi thay email và chạy:
-- insert into public.staff (user_id, email, full_name, role)
-- select id, email, 'Chủ hệ thống', 'SUPER_ADMIN' from auth.users where email = 'email-cua-ban@example.com'
-- on conflict (user_id) do update set role = 'SUPER_ADMIN', active = true;
