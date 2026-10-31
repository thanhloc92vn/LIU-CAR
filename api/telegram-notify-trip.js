// Báo lịch chuyến mới vào nhóm điều hành Telegram.
// Chỉ nhận mã chuyến; nội dung tin được dựng ở máy chủ từ dữ liệu đã lưu, nên không ai gửi được chữ tùy ý vào nhóm.
// Biến môi trường: TELEGRAM_BOT_TOKEN, TELEGRAM_DISPATCH_CHAT_ID (và tùy chọn SUPABASE_URL, SUPABASE_ANON_KEY).

const DEFAULT_SUPABASE_URL = 'https://bxlonbaitqfpwcblzzpw.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_hx8j9L2F_gBIQzrPcWOZxA_yyy5qGPo';

// Chống bấm lặp: cùng một chuyến không gửi lại trong 30 giây (theo từng máy chủ đang chạy)
const recent = new Map();

const ROUTE_LABELS = { HIGHWAY: 'Cao tốc', NATIONAL_ROAD: 'Quốc lộ', MIXED: 'Cao tốc + quốc lộ' };

async function loadState() {
  const url = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, '');
  const key = process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;
  const res = await fetch(`${url}/rest/v1/fleet_state?id=eq.MAIN_STATE&select=payload`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0]?.payload || null;
}

function buildMessage(trip, vehicle, driver) {
  const selfDrive = trip.bookingType === 'SELF_DRIVE';
  const lines = [
    `LỊCH MỚI #${trip.tripCode}`,
    `Hình thức: ${selfDrive ? 'Thuê tự lái' : 'Có tài xế'}`,
    `Xe: ${vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.plateNumber}), ${vehicle.seatCategory}` : 'chưa chọn xe'}`,
    `Lộ trình: ${trip.pickupLocation} → ${trip.dropoffLocation}`,
    `Tuyến: ${ROUTE_LABELS[trip.routeType] || ''} · ${trip.distanceKm || 0} km`,
    `Thời gian: ${trip.tripDate}${trip.tripEndDate && trip.tripEndDate !== trip.tripDate ? ` → ${trip.tripEndDate}` : ''} (${trip.departureTime} - ${trip.returnTime})`,
    `Khách: ${trip.customerName} (${trip.customerPhone})`,
  ];
  if (!selfDrive) {
    lines.push(
      driver
        ? `Tài xế: ${driver.fullName} ${driver.telegramUsername || ''} · ${driver.phone}`.trim()
        : 'Tài xế: chưa gán'
    );
    lines.push('Tài xế vui lòng xác nhận nhận chuyến trên ứng dụng Haydixe.');
  } else {
    lines.push('Chuyến tự lái: chủ xe hoặc điều hành xác nhận trên ứng dụng Haydixe.');
  }
  return lines.join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_DISPATCH_CHAT_ID;
  if (!token || !chatId) return res.status(503).json({ error: 'not_configured' });

  const tripId = typeof req.body?.tripId === 'string' ? req.body.tripId : '';
  if (!tripId) return res.status(400).json({ error: 'missing_trip_id' });

  const last = recent.get(tripId);
  if (last && Date.now() - last < 30000) return res.status(200).json({ ok: true, skipped: 'recently_sent' });

  try {
    const state = await loadState();
    const trip = state?.trips?.find((t) => t.id === tripId);
    if (!trip) return res.status(404).json({ error: 'trip_not_found' });

    const vehicle = state.vehicles?.find((v) => v.id === trip.vehicleId);
    const driver = state.drivers?.find((d) => d.id === trip.driverId);

    const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: buildMessage(trip, vehicle, driver) }),
    });
    if (!tg.ok) return res.status(502).json({ error: 'telegram_failed' });

    recent.set(tripId, Date.now());
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'server_error' });
  }
}
