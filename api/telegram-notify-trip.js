// Báo lịch chuyến mới vào nhóm điều hành Telegram (chỉ nhóm; tài xế chỉ được nhắn riêng khi điều hành điều phối,
// xem telegram-dispatch-driver.js). Nội dung tin được dựng ở máy chủ từ dữ liệu đã lưu, không nhận chữ từ trình duyệt.
// Biến môi trường: TELEGRAM_BOT_TOKEN, TELEGRAM_DISPATCH_CHAT_ID.

import { buildTripLines, loadState, sendMessage, sendPickupLocation } from './_shared.js';

// Chống bấm lặp: cùng một chuyến không gửi lại trong 30 giây (theo từng máy chủ đang chạy)
const recent = new Map();

export function buildMessage(trip, vehicle, driver) {
  const lines = [`LỊCH MỚI #${trip.tripCode}`, ...buildTripLines(trip, vehicle)];
  if (trip.bookingType !== 'SELF_DRIVE') {
    lines.push(
      trip.dispatchedAt && driver
        ? `Tài xế: ${driver.fullName} ${driver.telegramUsername || ''} · ${driver.phone}`.trim()
        : 'Tài xế: chờ điều hành điều phối'
    );
  } else {
    lines.push('Chuyến tự lái: chủ xe hoặc điều hành xác nhận trên ứng dụng Thuê xe nhà.');
  }
  return lines.join(String.fromCharCode(10));
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

    const text = buildMessage(trip, vehicle, driver);
    const sent = await sendMessage(token, chatId, text);
    if (!sent) return res.status(502).json({ error: 'telegram_failed' });
    await sendPickupLocation(token, chatId, trip).catch(() => false);

    recent.set(tripId, Date.now());
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'server_error' });
  }
}
