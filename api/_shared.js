// Hàm dùng chung cho các endpoint Telegram (tên bắt đầu bằng "_" nên Vercel không coi là endpoint).
const DEFAULT_SUPABASE_URL = 'https://bxlonbaitqfpwcblzzpw.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_hx8j9L2F_gBIQzrPcWOZxA_yyy5qGPo';

export const supabaseUrl = () => (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, '');
export const hasServiceKey = () => Boolean(process.env.SUPABASE_SERVICE_KEY);
// Có khóa dịch vụ thì dùng (ghi được); không thì dùng khóa công khai (chỉ đọc)
const key = () => process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

const headers = (extra = {}) => ({ apikey: key(), Authorization: `Bearer ${key()}`, ...extra });

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

const ROUTE_LABELS = { HIGHWAY: 'Cao tốc', NATIONAL_ROAD: 'Quốc lộ', MIXED: 'Cao tốc + quốc lộ' };

// Nội dung chuyến gửi Telegram. Không có doanh thu hay tiền công vì nhóm có nhiều người xem.
export function buildTripLines(trip, vehicle) {
  const selfDrive = trip.bookingType === 'SELF_DRIVE';
  return [
    `Hình thức: ${selfDrive ? 'Thuê tự lái' : 'Có tài xế'}`,
    `Xe: ${vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.plateNumber}), ${vehicle.seatCategory}` : 'chưa chọn xe'}`,
    `Lộ trình: ${trip.pickupLocation} → ${trip.dropoffLocation}`,
    `Tuyến: ${ROUTE_LABELS[trip.routeType] || ''} · ${trip.distanceKm || 0} km`,
    `Thời gian: ${trip.tripDate}${trip.tripEndDate && trip.tripEndDate !== trip.tripDate ? ` → ${trip.tripEndDate}` : ''} (${trip.departureTime} - ${trip.returnTime})`,
    `Khách: ${trip.customerName} (${trip.customerPhone})`,
  ];
}
