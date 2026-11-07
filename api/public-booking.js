// Khách đặt lịch trên trang công khai. Máy chủ chỉ nhận các trường khách được điền, tự đặt mã/trạng thái,
// nối chuyến vào DB bằng RPC append_trip (không ghi đè dữ liệu khác) rồi báo nhóm điều hành Telegram.
// Biến môi trường: SUPABASE_SERVICE_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_DISPATCH_CHAT_ID (Telegram không bắt buộc).
import { randomInt } from 'node:crypto';
import {
  clientIp,
  hasServiceKey,
  limited,
  loadState,
  rpc,
  sendMessage,
  sendPickupLocation,
  verifyHuman,
} from './_shared.js';
import { buildMessage } from './telegram-notify-trip.js';

// Chống spam: mỗi IP 5 lần/10 phút, mỗi SĐT 3 lần/ngày, cả hệ thống tối đa 30 lịch online/giờ
const IP_MAX = 5;
const IP_WINDOW_SEC = 10 * 60;
const PHONE_MAX = 3;
const PHONE_WINDOW_SEC = 24 * 60 * 60;
const GLOBAL_MAX_PER_HOUR = 30;
const ONLINE_NOTE = '[Khách đặt trực tuyến';
const BUSY = 'Hệ thống đang nhận quá nhiều lịch, vui lòng gọi hotline để được hỗ trợ ngay.';
// Mã tra cứu khó đoán (khách tra cứu bằng mã + SĐT); bỏ ký tự dễ nhầm O/0, I/1/L
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const randomCode = (n) => Array.from({ length: n }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');
// Phí giao xe tự lái tận nơi; trang khách hiển thị cùng con số (DELIVERY_FEE trong PublicCustomerBookingPortal)
const DELIVERY_FEE = 100000;

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
  if (await limited(`booking:ip:${clientIp(req)}`, IP_MAX, IP_WINDOW_SEC)) {
    return res.status(429).json({ error: 'Bạn đặt quá nhiều lần. Vui lòng thử lại sau ít phút hoặc gọi hotline.' });
  }

  const b = req.body || {};
  const customerName = str(b.customerName, 100);
  const customerPhone = str(b.customerPhone, 20);
  const tripDate = str(b.tripDate, 10);
  const bookingType = b.bookingType === 'SELF_DRIVE' ? 'SELF_DRIVE' : 'WITH_DRIVER';
  const routeType = ['HIGHWAY', 'NATIONAL_ROAD', 'MIXED'].includes(b.routeType) ? b.routeType : 'HIGHWAY';
  const time = (v, d) => (/^\d{2}:\d{2}$/.test(v || '') ? v : d);
  const date = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : undefined);
  const selfDrive = bookingType === 'SELF_DRIVE';
  const delivery = selfDrive && b.deliveryMode === 'DELIVERY';
  const tripEndDate = selfDrive && date(b.tripEndDate) >= tripDate ? date(b.tripEndDate) : undefined;

  if (!customerName || !/^[0-9+ .-]{8,20}$/.test(customerPhone) || !/^\d{4}-\d{2}-\d{2}$/.test(tripDate)) {
    return res.status(400).json({ error: 'Vui lòng nhập đúng họ tên, số điện thoại và ngày đi.' });
  }
  if (!(await verifyHuman(req, b.turnstileToken))) {
    return res.status(403).json({ error: 'Chưa xác minh được bạn là người thật. Vui lòng tải lại trang rồi thử lại.' });
  }
  const phoneDigits = customerPhone.replace(/\D/g, '');
  if (await limited(`booking:phone:${phoneDigits}`, PHONE_MAX, PHONE_WINDOW_SEC)) {
    return res.status(429).json({ error: 'Số điện thoại này đã đặt nhiều lần hôm nay, vui lòng gọi hotline.' });
  }

  try {
    const state = await loadState();
    const vehicle = state?.vehicles?.find((v) => v.id === b.vehicleId);
    if (!vehicle) return res.status(400).json({ error: 'Xe không còn trên hệ thống, vui lòng chọn xe khác.' });

    const trips = state.trips || [];
    // Cùng SĐT, cùng ngày đã có lịch chờ xác nhận thì không nhận thêm (không trả mã chuyến cũ để tránh lộ)
    const duplicate = trips.some(
      (t) =>
        t.status === 'PENDING_CONFIRM' &&
        t.tripDate === tripDate &&
        String(t.customerPhone || '').replace(/\D/g, '') === phoneDigits
    );
    if (duplicate) {
      return res.status(409).json({
        error: 'Bạn đã có lịch đang chờ xác nhận cho ngày này. Vui lòng chờ chúng tôi gọi lại hoặc gọi hotline.',
      });
    }
    // Trần tổng: chặn tràn lịch giả khi bị spam từ nhiều IP
    const hourAgo = Date.now() - 60 * 60 * 1000;
    const recentOnline = trips.filter(
      (t) => String(t.notes || '').startsWith(ONLINE_NOTE) && Date.parse(t.createdAt) > hourAgo
    ).length;
    if (recentOnline >= GLOBAL_MAX_PER_HOUR) return res.status(429).json({ error: BUSY });

    const now = Date.now();
    const trip = {
      id: `TRIP-${now}`,
      tenantId: vehicle.tenantId,
      tripCode: `KH-${tripDate.slice(5, 7)}${tripDate.slice(8, 10)}-${randomCode(6)}`,
      bookingType,
      vehicleId: vehicle.id,
      // Khách đặt xong chưa có tài xế: điều hành sẽ chọn và điều phối trên hệ thống
      driverId: '',
      taggedDriverIds: [],
      customerName,
      customerPhone,
      customerCccd: str(b.customerCccd, 20) || undefined,
      customerLicense: str(b.customerLicense, 20) || undefined,
      ...(selfDrive && {
        customerBirthDate: date(b.customerBirthDate),
        customerAddress: str(b.customerAddress, 200) || undefined,
        customerCccdIssueDate: date(b.customerCccdIssueDate),
        customerCccdIssuePlace: str(b.customerCccdIssuePlace, 100) || undefined,
        deliveryMode: delivery ? 'DELIVERY' : 'SELF_PICKUP',
      }),
      tripDate,
      tripEndDate,
      departureTime: time(b.departureTime, '07:30'),
      returnTime: time(b.returnTime, '19:30'),
      pickupLocation: selfDrive && !delivery ? 'Khách tự đến lấy xe' : str(b.pickupLocation) || 'TP.HCM',
      ...(!(selfDrive && !delivery) && pickupCoords(b.pickupLat, b.pickupLng)),
      dropoffLocation: str(b.dropoffLocation) || 'Theo lộ trình',
      routeType,
      routeDetail: str(b.routeDetail) || 'Theo lộ trình khách chọn',
      distanceKm: num(b.distanceKm),
      isRoundTrip: b.isRoundTrip !== false,
      // Giá tạm tính từ trang khách; điều hành kiểm tra lại trước khi xác nhận
      baseFareRevenue: num(b.baseFareRevenue),
      surchargeRevenue: delivery ? DELIVERY_FEE : 0,
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
