// Khách đặt lịch trên trang công khai. Máy chủ chỉ nhận các trường khách được điền, tự đặt mã/trạng thái,
// nối chuyến vào DB bằng RPC append_trip (không ghi đè dữ liệu khác) rồi báo nhóm điều hành Telegram.
// Biến môi trường: SUPABASE_SERVICE_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_DISPATCH_CHAT_ID (Telegram không bắt buộc).
import { hasServiceKey, loadState, rateLimited, rpc, sendMessage, sendPickupLocation } from './_shared.js';
import { buildMessage } from './telegram-notify-trip.js';

const hits = new Map();

const str = (v, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.round(Number(v)) : 0);
// Toạ độ điểm đón chỉ nhận khi nằm trong khung lãnh thổ Việt Nam
const pickupCoords = (lat, lng) => {
  const a = Number(lat);
  const b = Number(lng);
  return a >= 7 && a <= 24 && b >= 101 && b <= 118 ? { pickupLat: a, pickupLng: b } : {};
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!hasServiceKey()) return res.status(503).json({ error: 'not_configured' });
  if (rateLimited(hits, req, 5, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'Bạn đặt quá nhiều lần. Vui lòng thử lại sau ít phút hoặc gọi hotline.' });
  }

  const b = req.body || {};
  const customerName = str(b.customerName, 100);
  const customerPhone = str(b.customerPhone, 20);
  const tripDate = str(b.tripDate, 10);
  const bookingType = b.bookingType === 'SELF_DRIVE' ? 'SELF_DRIVE' : 'WITH_DRIVER';
  const routeType = ['HIGHWAY', 'NATIONAL_ROAD', 'MIXED'].includes(b.routeType) ? b.routeType : 'HIGHWAY';
  const time = (v, d) => (/^\d{2}:\d{2}$/.test(v || '') ? v : d);

  if (!customerName || !/^[0-9+ .-]{8,20}$/.test(customerPhone) || !/^\d{4}-\d{2}-\d{2}$/.test(tripDate)) {
    return res.status(400).json({ error: 'Vui lòng nhập đúng họ tên, số điện thoại và ngày đi.' });
  }

  try {
    const state = await loadState();
    const vehicle = state?.vehicles?.find((v) => v.id === b.vehicleId);
    if (!vehicle) return res.status(400).json({ error: 'Xe không còn trên hệ thống, vui lòng chọn xe khác.' });

    const now = Date.now();
    const trip = {
      id: `TRIP-${now}`,
      tenantId: vehicle.tenantId,
      tripCode: `KH-${tripDate.slice(5, 7)}${tripDate.slice(8, 10)}-${Math.floor(100 + Math.random() * 900)}`,
      bookingType,
      vehicleId: vehicle.id,
      // Khách đặt xong chưa có tài xế: điều hành sẽ chọn và điều phối trên hệ thống
      driverId: '',
      taggedDriverIds: [],
      customerName,
      customerPhone,
      customerCccd: str(b.customerCccd, 20) || undefined,
      customerLicense: str(b.customerLicense, 20) || undefined,
      tripDate,
      departureTime: time(b.departureTime, '07:30'),
      returnTime: time(b.returnTime, '19:30'),
      pickupLocation: str(b.pickupLocation) || 'TP.HCM',
      ...pickupCoords(b.pickupLat, b.pickupLng),
      dropoffLocation: str(b.dropoffLocation) || 'Theo lộ trình',
      routeType,
      routeDetail: str(b.routeDetail) || 'Theo lộ trình khách chọn',
      distanceKm: num(b.distanceKm),
      isRoundTrip: b.isRoundTrip !== false,
      // Giá tạm tính từ trang khách; điều hành kiểm tra lại trước khi xác nhận
      baseFareRevenue: num(b.baseFareRevenue),
      surchargeRevenue: 0,
      paymentCollectedBy: 'COMPANY_BANK',
      autoHighwayToll: num(b.autoHighwayToll),
      autoFuelQuota: num(b.autoFuelQuota),
      autoDispatchFee: num(b.autoDispatchFee),
      manualExpenseTotal: 0,
      manualExpenseNote: '',
      parkingFee: 0,
      parkingNote: '',
      trafficFineFee: 0,
      trafficFineNote: '',
      otherRiskFee: 0,
      otherRiskNote: '',
      status: 'PENDING_CONFIRM',
      botChannel: 'BOTH',
      notes: str(b.notes, 500) ? `[Khách đặt trực tuyến]: ${str(b.notes, 500)}` : '[Khách đặt trực tuyến trên Web/App]',
      createdAt: new Date(now).toISOString(),
    };

    const text = buildMessage(trip, vehicle, null);
    const log = {
      id: `LOG-${now}`,
      tenantId: trip.tenantId,
      tripId: trip.id,
      tripCode: trip.tripCode,
      timestamp: new Date(now).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
      channel: 'TELEGRAM',
      recipientName: 'Tài xế',
      recipientHandle: '',
      messageType: 'BOOKING_CONFIRM',
      content: `[KHÁCH ĐẶT TRỰC TUYẾN TRÊN WEB]\n${text}`,
      status: 'SENT_WAITING',
    };

    if (!(await rpc('append_trip', { p_trip: trip, p_log: log }))) {
      return res.status(502).json({ error: 'Chưa lưu được lịch, vui lòng thử lại hoặc gọi hotline.' });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_DISPATCH_CHAT_ID;
    if (token && chatId) {
      await sendMessage(token, chatId, text).catch(() => false);
      await sendPickupLocation(token, chatId, trip).catch(() => false);
    }

    return res.status(200).json({ ok: true, trip });
  } catch {
    return res.status(500).json({ error: 'server_error' });
  }
}
