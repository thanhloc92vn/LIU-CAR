import { AuthUserSession, FleetDatabase } from '../types/fleet';
import { calculateTripFinancials } from '../utils/calculations';

const DEFAULT_SUPABASE_URL = 'https://bxlonbaitqfpwcblzzpw.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_hx8j9L2F_gBIQzrPcWOZxA_yyy5qGPo';

const ENV_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const ENV_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

// Tài xế không có email: tài khoản tạo trong Supabase là <số điện thoại>@taixe.haydixe.vn, đăng nhập chỉ cần gõ số
export const DRIVER_EMAIL_DOMAIN = 'taixe.haydixe.vn';

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  return {
    url: (ENV_URL || DEFAULT_SUPABASE_URL).trim().replace(/\/$/, ''),
    anonKey: (ENV_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY).trim(),
  };
}

// ---- Phiên đăng nhập Supabase Auth (token lưu trong sessionStorage, tự làm mới trước khi hết hạn) ----

interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // giây
}

const AUTH_KEY = 'HAYDIXE_SB_AUTH';

let auth: StoredAuth | null = (() => {
  try {
    return JSON.parse(sessionStorage.getItem(AUTH_KEY) || 'null');
  } catch {
    return null;
  }
})();

function storeAuth(data: any) {
  auth = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
  };
  sessionStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export function signOutSupabase() {
  const token = auth?.accessToken;
  auth = null;
  sessionStorage.removeItem(AUTH_KEY);
  if (token) {
    const { url, anonKey } = getSupabaseCredentials();
    fetch(`${url}/auth/v1/logout`, {
      method: 'POST',
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
}

async function accessToken(): Promise<string | null> {
  if (!auth) return null;
  if (auth.expiresAt - 60 > Date.now() / 1000) return auth.accessToken;
  const { url, anonKey } = getSupabaseCredentials();
  try {
    const res = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: anonKey },
      body: JSON.stringify({ refresh_token: auth.refreshToken }),
    });
    const data = await res.json();
    if (res.ok && data?.access_token) {
      storeAuth(data);
      return data.access_token;
    }
  } catch {
    // Mất mạng: giữ phiên, lần gọi sau thử làm mới lại
    return null;
  }
  signOutSupabase();
  return null;
}

export const isSignedIn = () => !!auth;

// Gọi REST/RPC bằng token của người đang đăng nhập (RLS quyết định được thấy gì)
async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await accessToken();
  if (!token) throw new Error('AUTH_EXPIRED');
  const { url, anonKey } = getSupabaseCredentials();
  return fetch(`${url}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
}

async function rpc<T>(
  name: string,
  args: object
): Promise<{ ok: boolean; data?: T; code?: string; error?: string }> {
  try {
    const res = await api(`/rest/v1/rpc/${name}`, { method: 'POST', body: JSON.stringify(args) });
    const data = await res.json().catch(() => null);
    if (res.ok) return { ok: true, data };
    return { ok: false, code: data?.code, error: data?.message || `Lỗi ${res.status}` };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message === 'AUTH_EXPIRED' ? 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại' : 'Lỗi kết nối Supabase',
    };
  }
}

export type StaffRole = 'SUPER_ADMIN' | 'DISPATCHER' | 'ACCOUNTANT' | 'DRIVER';

export interface StaffMember {
  user_id: string;
  email: string;
  full_name: string;
  role: StaffRole;
  driver_id: string | null;
  active: boolean;
  created_at: string;
}

// Đăng nhập bằng email (hoặc số điện thoại tài xế), rồi đọc quyền trong bảng staff
export async function signInWithSupabaseAuth(
  login: string,
  password: string
): Promise<{ ok: boolean; session?: AuthUserSession; error?: string }> {
  const { url, anonKey } = getSupabaseCredentials();
  const clean = login.trim().toLowerCase();
  const email = clean.includes('@') ? clean : `${clean.replace(/\D/g, '')}@${DRIVER_EMAIL_DOMAIN}`;
  try {
    const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: anonKey },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok || !data?.access_token) {
      return { ok: false, error: 'Sai email / số điện thoại hoặc mật khẩu' };
    }
    storeAuth(data);

    const profRes = await api(`/rest/v1/staff?user_id=eq.${data.user?.id}&select=*`);
    const rows: StaffMember[] = profRes.ok ? await profRes.json() : [];
    const me = rows[0];
    if (!me || !me.active) {
      signOutSupabase();
      return {
        ok: false,
        error: me
          ? 'Tài khoản đã bị khóa. Liên hệ chủ hệ thống.'
          : 'Tài khoản chưa được cấp quyền vào hệ thống. Liên hệ chủ hệ thống.',
      };
    }
    return {
      ok: true,
      session: {
        id: me.user_id,
        username: me.email,
        fullName: me.full_name || me.email,
        role: me.role === 'DRIVER' ? 'DRIVER' : 'ADMIN',
        subRole: me.role === 'DRIVER' ? undefined : me.role,
        driverId: me.driver_id || undefined,
        loginAt: new Date().toISOString(),
      },
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Lỗi kết nối Supabase Auth' };
  }
}

export async function changeMyPassword(password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await api('/auth/v1/user', { method: 'PUT', body: JSON.stringify({ password }) });
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => null);
    return { ok: false, error: data?.msg || data?.message || 'Không đổi được mật khẩu' };
  } catch {
    return { ok: false, error: 'Phiên đăng nhập đã hết hạn' };
  }
}

// ---- Quản lý người dùng (chỉ chủ hệ thống; quyền được kiểm tra trong DB) ----

export async function listStaff(): Promise<StaffMember[]> {
  try {
    const res = await api('/rest/v1/staff?select=*&order=created_at');
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
}

export function setStaff(m: {
  email: string;
  role: StaffRole;
  fullName: string;
  driverId?: string;
  active: boolean;
}) {
  return rpc<void>('admin_set_staff', {
    p_email: m.email,
    p_role: m.role,
    p_full_name: m.fullName,
    p_driver_id: m.driverId || null,
    p_active: m.active,
  });
}

// Tạo tài khoản đăng nhập / đặt lại mật khẩu: chạy trên máy chủ (cần khóa dịch vụ), chỉ chủ hệ thống gọi được
export async function adminUsers(
  body:
    | { action: 'create'; email: string; password: string; role: StaffRole; fullName: string; driverId?: string }
    | { action: 'reset_password'; userId: string; password: string }
): Promise<{ ok: boolean; error?: string }> {
  const token = await accessToken();
  if (!token) return { ok: false, error: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại' };
  try {
    const res = await fetch('/api/admin-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    return res.ok ? { ok: true } : { ok: false, error: data?.error || `Lỗi ${res.status}` };
  } catch {
    return { ok: false, error: 'Không kết nối được máy chủ' };
  }
}

export async function deleteStaff(userId: string): Promise<boolean> {
  try {
    const res = await api(`/rest/v1/staff?user_id=eq.${userId}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}

// ---- Dữ liệu ----

// Bản DB lần cuối đọc/lưu thành công (để biết người khác đã sửa gì kể từ đó)
let base: { payload: FleetDatabase; updatedAt: string } | null = null;

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// Gộp 3 bên theo id: giữ thay đổi của mình, nhận thêm thay đổi của người khác (đơn khách mới, tài xế xác nhận)
function mergeById(baseArr: any[] = [], local: any[] = [], server: any[] = []): any[] {
  const baseMap = new Map(baseArr.map((x) => [x.id, x]));
  const localMap = new Map(local.map((x) => [x.id, x]));
  const serverIds = new Set(server.map((x) => x.id));
  const added = local.filter((x) => !serverIds.has(x.id) && !baseMap.has(x.id));
  const kept = server.flatMap((s) => {
    const b = baseMap.get(s.id);
    const l = localMap.get(s.id);
    if (!l) return b && same(b, s) ? [] : [s]; // mình đã xóa: bỏ, trừ khi người khác vừa sửa
    return [b && same(b, l) ? s : l];
  });
  return [...added, ...kept];
}

export function mergeState(baseDb: FleetDatabase, local: FleetDatabase, server: FleetDatabase): FleetDatabase {
  const out: any = {};
  const keys = new Set([...Object.keys(server), ...Object.keys(local)]);
  keys.forEach((k) => {
    const b = (baseDb as any)[k];
    const l = (local as any)[k];
    const s = (server as any)[k];
    const byId = [b, l, s].every((v) => v === undefined || (Array.isArray(v) && v.every((x) => x?.id)));
    out[k] = byId ? mergeById(b, l, s) : same(b, l) ? s : l;
  });
  return out;
}

const withoutAccounts = (db: FleetDatabase): FleetDatabase => {
  const copy = { ...db };
  delete copy.adminAccounts;
  return copy;
};

// Admin: đọc toàn bộ DB
export async function loadAdminState(): Promise<FleetDatabase | null> {
  try {
    const res = await api('/rest/v1/fleet_state?id=eq.MAIN_STATE&select=payload,updated_at');
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows?.[0]) return null;
    const payload = rows[0].payload as FleetDatabase;
    base = { payload, updatedAt: rows[0].updated_at };
    // Bảng `tenants` là nguồn chính cho thông tin đơn vị: sửa/xóa trực tiếp trên Supabase
    // phải có hiệu lực, nếu không lần lưu kế tiếp sẽ ghi đè lại từ bản snapshot cũ.
    try {
      const tRes = await api('/rest/v1/tenants?select=*');
      const tRows = tRes.ok ? await tRes.json() : null;
      if (Array.isArray(tRows) && tRows.length > 0 && payload.tenants) {
        return {
          ...payload,
          tenants: payload.tenants
            .filter((t) => tRows.some((r: any) => r.id === t.id))
            .map((t) => {
              const r = tRows.find((x: any) => x.id === t.id);
              return {
                ...t,
                name: r.name ?? t.name,
                shortName: r.short_name ?? t.shortName,
                taxCode: r.tax_code ?? t.taxCode,
                hotline: r.hotline ?? t.hotline,
                bankInfo: r.bank_info ?? t.bankInfo,
                defaultDispatchFeePercent: r.default_dispatch_fee_percent ?? t.defaultDispatchFeePercent,
              };
            }),
        };
      }
    } catch {
      // dùng tenants trong snapshot
    }
    return payload;
  } catch {
    return null;
  }
}

// Admin: lưu có kiểm tra phiên bản. Nếu người khác vừa sửa thì gộp, lưu lại và trả về bản đã gộp.
export async function saveAdminState(
  db: FleetDatabase
): Promise<{ ok: boolean; merged?: FleetDatabase; error?: string }> {
  if (!base) return { ok: false, error: 'Chưa tải được dữ liệu gốc' };
  let local = withoutAccounts(db);
  if (same(local, base.payload)) return { ok: true };

  let r = await rpc<string>('save_state', { p_payload: local, p_base: base.updatedAt });
  let merged: FleetDatabase | undefined;
  if (!r.ok && r.code === '40001') {
    const sentBase = base.payload;
    const server = await loadAdminState();
    if (!server || !base) return { ok: false, error: 'Không tải lại được dữ liệu mới nhất' };
    merged = mergeState(sentBase, local, server);
    local = merged;
    r = await rpc<string>('save_state', { p_payload: local, p_base: base.updatedAt });
  }
  if (!r.ok) return { ok: false, error: r.error };
  base = { payload: local, updatedAt: r.data as string };
  syncRelationalTables(local).catch(() => {});
  return { ok: true, merged };
}

// Tài xế: chỉ nhận phần dữ liệu của mình (lọc trong DB)
export async function loadDriverState(): Promise<FleetDatabase | null> {
  const r = await rpc<FleetDatabase>('driver_state', {});
  return r.ok ? (r.data as FleetDatabase) : null;
}

export function driverTripAction(
  tripId: string,
  action: 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'ADD_EXPENSE',
  expense?: { kind: string; amount: number; note: string }
) {
  return rpc<void>('driver_trip_action', {
    p_trip_id: tripId,
    p_action: action,
    p_kind: expense?.kind ?? null,
    p_amount: expense?.amount ?? null,
    p_note: expense?.note ?? null,
  });
}

export async function loadTelegramLinks(): Promise<{ driver_id: string; linked_at: string }[]> {
  try {
    const res = await api('/rest/v1/telegram_links?select=driver_id,linked_at');
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
}

// Bản sao dạng bảng (tenants, vehicles, drivers, trips) để xem trên Supabase Table Editor
async function syncRelationalTables(db: FleetDatabase): Promise<void> {
  if (db.tenants?.length) {
    await api(`/rest/v1/tenants`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(
        db.tenants.map((t) => ({
          id: t.id,
          name: t.name,
          short_name: t.shortName,
          tax_code: t.taxCode,
          hotline: t.hotline,
          bank_info: t.bankInfo,
          default_dispatch_fee_percent: t.defaultDispatchFeePercent,
          auto_fuel_deduction_enabled: t.autoFuelDeductionEnabled,
          auto_highway_toll_enabled: t.autoHighwayTollEnabled,
          telegram_bot_token: t.telegramBotToken || '',
          telegram_group_chat_id: t.telegramGroupChatId || '',
          zalo_oa_name: t.zaloOaName || '',
        }))
      ),
    }).catch(() => {});
  }

  if (db.vehicles?.length) {
    await api(`/rest/v1/vehicles`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(
        db.vehicles.map((v) => ({
          id: v.id,
          tenant_id: v.tenantId,
          plate_number: v.plateNumber,
          brand: v.brand,
          model: v.model,
          vehicle_type: v.vehicleType,
          seat_category: v.seatCategory,
          year: v.year,
          color: v.color,
          service_mode: v.serviceMode,
          daily_rate_self_drive: v.dailyRateSelfDrive,
          fuel_cost_per_km: v.fuelCostPerKm,
          highway_toll_multiplier: v.highwayTollMultiplier,
          status: v.status,
          current_odo_km: v.currentOdoKm,
          inspection_expiry: v.inspectionExpiry,
          insurance_expiry: v.insuranceExpiry,
          notes: v.notes || '',
        }))
      ),
    }).catch(() => {});
  }

  if (db.drivers?.length) {
    await api(`/rest/v1/drivers`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(
        db.drivers.map((d) => ({
          id: d.id,
          tenant_id: d.tenantId,
          code: d.code,
          full_name: d.fullName,
          phone: d.phone,
          cccd: d.cccd,
          license_number: d.licenseNumber,
          license_class: d.licenseClass,
          license_expiry: d.licenseExpiry,
          experience_years: d.experienceYears,
          address: d.address,
          bank_name: d.bankName,
          bank_account: d.bankAccount,
          telegram_username: d.telegramUsername,
          zalo_phone: d.zaloPhone,
          status: d.status,
          base_commission_percent: d.baseCommissionPercent,
          notes: d.notes || '',
        }))
      ),
    }).catch(() => {});
  }

  if (db.trips?.length) {
    await api(`/rest/v1/trips`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(
        db.trips.map((tr) => {
          const fin = calculateTripFinancials(tr);
          return {
            id: tr.id,
            tenant_id: tr.tenantId,
            trip_code: tr.tripCode,
            booking_type: tr.bookingType,
            vehicle_id: tr.vehicleId,
            driver_id: tr.driverId,
            tagged_driver_ids: tr.taggedDriverIds,
            customer_name: tr.customerName,
            customer_phone: tr.customerPhone,
            trip_date: tr.tripDate,
            departure_time: tr.departureTime,
            return_time: tr.returnTime,
            pickup_location: tr.pickupLocation,
            dropoff_location: tr.dropoffLocation,
            route_type: tr.routeType,
            route_detail: tr.routeDetail,
            distance_km: tr.distanceKm,
            is_round_trip: tr.isRoundTrip,
            base_fare_revenue: tr.baseFareRevenue,
            surcharge_revenue: tr.surchargeRevenue,
            payment_collected_by: tr.paymentCollectedBy,
            auto_highway_toll: tr.autoHighwayToll,
            auto_fuel_quota: tr.autoFuelQuota,
            auto_dispatch_fee: tr.autoDispatchFee,
            manual_expense_total: tr.manualExpenseTotal,
            manual_expense_note: tr.manualExpenseNote,
            parking_fee: tr.parkingFee,
            parking_note: tr.parkingNote,
            traffic_fine_fee: tr.trafficFineFee,
            traffic_fine_note: tr.trafficFineNote,
            other_risk_fee: tr.otherRiskFee,
            other_risk_note: tr.otherRiskNote,
            net_remaining_to_account: fin.netRemainingToAccount,
            status: tr.status,
            bot_channel: tr.botChannel,
            bot_confirmed_at: tr.botConfirmedAt || '',
            bot_confirmed_by_driver_name: tr.botConfirmedByDriverName || '',
            notes: tr.notes || '',
          };
        })
      ),
    }).catch(() => {});
  }
}
