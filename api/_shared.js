// Hàm dùng chung cho các endpoint Telegram (tên bắt đầu bằng "_" nên Vercel không coi là endpoint).
const DEFAULT_SUPABASE_URL = 'https://bxlonbaitqfpwcblzzpw.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_hx8j9L2F_gBIQzrPcWOZxA_yyy5qGPo';

export const supabaseUrl = () => (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, '');
export const hasServiceKey = () => Boolean(process.env.SUPABASE_SERVICE_KEY);
// Có khóa dịch vụ thì dùng (ghi được); không thì dùng khóa công khai (chỉ đọc)
const key = () => process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

export const headers = (extra = {}) => ({ apikey: key(), Authorization: `Bearer ${key()}`, ...extra });

export const ADMIN_ROLES = ['SUPER_ADMIN', 'DISPATCHER', 'ACCOUNTANT'];

// Người gọi là nhân sự nào (theo token đăng nhập Supabase gửi trong header Authorization).
// Trả hàng staff nếu tài khoản đang hoạt động và có một trong các quyền `roles`, ngược lại null.
export async function staffCaller(req, roles) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token || !hasServiceKey()) return null;
  const res = await fetch(`${supabaseUrl()}/auth/v1/user`, {
    headers: { apikey: process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY, Authorization: `Bearer ${token}` },
  });
  const user = res.ok ? await res.json() : null;
  if (!user?.id) return null;
  const r = await fetch(`${supabaseUrl()}/rest/v1/staff?user_id=eq.${encodeURIComponent(user.id)}&select=*`, {
    headers: headers(),
  });
  const me = r.ok ? (await r.json())?.[0] : null;
  return me?.active && roles.includes(me.role) ? me : null;
}

export async function loadState() {
  const res = await fetch(`${supabaseUrl()}/rest/v1/fleet_state?id=eq.MAIN_STATE&select=payload`, {
    headers: headers(),
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0]?.payload || null;
}

export async function getLinkByDriver(driverId) {
  const res = await fetch(
    `${supabaseUrl()}/rest/v1/telegram_links?driver_id=eq.${encodeURIComponent(driverId)}&select=*`,
    { headers: headers() }
  );
  if (!res.ok) return null;
  return (await res.json())?.[0] || null;
}

export async function getLinkByChat(chatId) {
  const res = await fetch(`${supabaseUrl()}/rest/v1/telegram_links?chat_id=eq.${chatId}&select=*`, {
    headers: headers(),
  });
  if (!res.ok) return [];
  return (await res.json()) || [];
}

export async function saveLink({ driverId, chatId, code, username }) {
  const res = await fetch(`${supabaseUrl()}/rest/v1/telegram_links?on_conflict=driver_id`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' }),
    body: JSON.stringify({
      driver_id: driverId,
      chat_id: chatId,
      code_used: code,
      telegram_username: username || null,
      linked_at: new Date().toISOString(),
    }),
  });
  return res.ok;
}

// Gọi hàm SQL (RPC) bằng khóa máy chủ
export async function rpc(name, args) {
  const res = await fetch(`${supabaseUrl()}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(args),
  });
  return res.ok;
}

// IP khách: ưu tiên header do Vercel tự gắn (khách không giả được), chạy trên máy thì lấy x-forwarded-for
export const clientIp = (req) =>
  String(req.headers['x-real-ip'] || req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim() || 'unknown';

// Giới hạn số lần gọi theo IP trong một khoảng thời gian (theo từng máy chủ đang chạy)
export function rateLimited(store, req, max, windowMs) {
  return countInMemory(store, clientIp(req), max, windowMs);
}

function countInMemory(store, key, max, windowMs) {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now - entry.first > windowMs) {
    store.set(key, { count: 1, first: now });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}

const fallbackCounts = new Map();

// Đã vượt giới hạn chưa (đếm chung mọi máy chủ qua hit_rate_limit trong supabase/rate_limits.sql).
// Chưa cài SQL hoặc Supabase lỗi thì đếm tạm trong bộ nhớ của máy chủ này.
export async function limited(key, max, windowSec) {
  if (hasServiceKey()) {
    try {
      const res = await fetch(`${supabaseUrl()}/rest/v1/rpc/hit_rate_limit`, {
        method: 'POST',
        headers: headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ p_key: key, p_max: max, p_window_seconds: windowSec }),
      });
      if (res.ok) return (await res.json()) === true;
    } catch {
      // dùng bộ đếm tạm bên dưới
    }
  }
  return countInMemory(fallbackCounts, key, max, windowSec * 1000);
}

// Xác minh người thật bằng Cloudflare Turnstile. Chưa đặt TURNSTILE_SECRET_KEY thì bỏ qua (chưa bật).
export async function verifyHuman(req, token) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== 'string' || !token) return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: clientIp(req) }),
    });
    return (await res.json())?.success === true;
  } catch {
    return false;
  }
}

export async function sendMessage(token, chatId, text, replyTo) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_to_message_id: replyTo,
      allow_sending_without_reply: true,
    }),
  });
  return res.ok;
}

// Ghim vị trí điểm đón (tin vị trí của Telegram, bấm vào mở bản đồ chỉ đường). Chuyến không có toạ độ thì bỏ qua.
export async function sendPickupLocation(token, chatId, trip) {
  if (typeof trip.pickupLat !== 'number' || typeof trip.pickupLng !== 'number') return false;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendLocation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, latitude: trip.pickupLat, longitude: trip.pickupLng }),
  });
  return res.ok;
}

const ROUTE_LABELS ={ HIGHWAY: 'Cao tốc', NATIONAL_ROAD: 'Quốc lộ', MIXED: 'Cao tốc + quốc lộ' };

// Nội dung chuyến gửi Telegram. Không có doanh thu hay tiền công vì nhóm có nhiều người xem.
export function buildTripLines(trip, vehicle) {
  const selfDrive = trip.bookingType === 'SELF_DRIVE';
  return [
    `Hình thức: ${selfDrive ? 'Thuê tự lái' : 'Có tài xế'}`,
    ...(selfDrive && trip.deliveryMode
      ? [`Nhận xe: ${trip.deliveryMode === 'DELIVERY' ? `Giao tận nơi (${trip.pickupLocation})` : 'Khách tự đến lấy xe'}`]
      : []),
    `Xe: ${vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.plateNumber}), ${vehicle.seatCategory}` : 'chưa chọn xe'}`,
    `Lộ trình: ${trip.pickupLocation} → ${trip.dropoffLocation}`,
    ...(typeof trip.pickupLat === 'number' && typeof trip.pickupLng === 'number'
      ? [`Định vị điểm đón: https://www.google.com/maps?q=${trip.pickupLat},${trip.pickupLng}`]
      : []),
    `Tuyến: ${ROUTE_LABELS[trip.routeType] || ''} · ${trip.distanceKm || 0} km`,
    `Thời gian: ${trip.tripDate}${trip.tripEndDate && trip.tripEndDate !== trip.tripDate ? ` → ${trip.tripEndDate}` : ''} (${trip.departureTime} - ${trip.returnTime})`,
    `Khách: ${trip.customerName} (${trip.customerPhone})`,
  ];
}
