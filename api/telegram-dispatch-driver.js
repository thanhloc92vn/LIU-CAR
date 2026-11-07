// Điều hành điều phối tài xế cho một chuyến: nhắn riêng tài xế (nếu đã liên kết Telegram) và báo nhóm.
// Chỉ nhận mã chuyến. Máy chủ chỉ gửi khi chuyến đã được đánh dấu điều phối (dispatchedAt) trong dữ liệu đã lưu.
// Biến môi trường: TELEGRAM_BOT_TOKEN, TELEGRAM_DISPATCH_CHAT_ID.
import {
  ADMIN_ROLES,
  buildTripLines,
  getLinkByDriver,
  loadState,
  sendMessage,
  sendPickupLocation,
  staffCaller,
} from './_shared.js';

const recent = new Map();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const groupId = process.env.TELEGRAM_DISPATCH_CHAT_ID;
  if (!token || !groupId) return res.status(503).json({ error: 'not_configured' });
  // Chỉ nhân sự quản trị đang đăng nhập được điều phối và nhắn tài xế
  if (!(await staffCaller(req, ADMIN_ROLES))) return res.status(401).json({ error: 'unauthorized' });

  const tripId = typeof req.body?.tripId === 'string' ? req.body.tripId : '';
  if (!tripId) return res.status(400).json({ error: 'missing_trip_id' });

  try {
    const state = await loadState();
    const trip = state?.trips?.find((t) => t.id === tripId);
    if (!trip) return res.status(404).json({ error: 'trip_not_found' });
    // Chuyến tự lái không có tài xế; chuyến chưa điều phối thì không nhắn ai
    if (trip.bookingType === 'SELF_DRIVE' || !trip.driverId) return res.status(400).json({ error: 'no_driver' });
    if (!trip.dispatchedAt) return res.status(404).json({ error: 'not_dispatched_yet' });

    const key = `${tripId}:${trip.driverId}`;
    if (recent.get(key) && Date.now() - recent.get(key) < 15000) {
      return res.status(200).json({ ok: true, skipped: 'recently_sent' });
    }

    const vehicle = state.vehicles?.find((v) => v.id === trip.vehicleId);
    const driver = state.drivers?.find((d) => d.id === trip.driverId);
    if (!driver) return res.status(400).json({ error: 'no_driver' });

    const details = buildTripLines(trip, vehicle).join('\n');
    let dm = 'not_linked';
    const link = await getLinkByDriver(driver.id);
    if (link?.chat_id) {
      const ok = await sendMessage(
        token,
        link.chat_id,
        `Bạn được điều phối chuyến #${trip.tripCode}\n\n${details}\n\nVui lòng xác nhận nhận chuyến trên ứng dụng Thuê xe nhà.`
      );
      dm = ok ? 'sent' : 'failed';
      if (ok) await sendPickupLocation(token, link.chat_id, trip).catch(() => false);
    }

    await sendMessage(
      token,
      groupId,
      `ĐIỀU PHỐI #${trip.tripCode}: ${driver.fullName} ${driver.telegramUsername || ''}`.trim() +
        `\n${trip.pickupLocation} → ${trip.dropoffLocation} · ${trip.tripDate} (${trip.departureTime})` +
        (dm === 'sent' ? '\nĐã nhắn riêng cho tài xế.' : '\nTài xế chưa liên kết Telegram nên chưa nhắn riêng được.')
    );

    recent.set(key, Date.now());
    return res.status(200).json({ ok: true, dm });
  } catch {
    return res.status(500).json({ error: 'server_error' });
  }
}
