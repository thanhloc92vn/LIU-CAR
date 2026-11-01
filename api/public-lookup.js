// Khách tra cứu lịch đã đặt: phải nhập đúng cả mã chuyến lẫn số điện thoại đặt xe.
// Chỉ trả các thông tin khách cần xem, không trả CCCD/GPLX hay chi phí.
import { hasServiceKey, loadState, rateLimited } from './_shared.js';

const hits = new Map();
const digits = (s) => String(s || '').replace(/\D/g, '');

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!hasServiceKey()) return res.status(503).json({ error: 'not_configured' });
  if (rateLimited(hits, req, 20, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'Tra cứu quá nhiều lần. Vui lòng thử lại sau ít phút.' });
  }

  const code = String(req.query?.code || '').trim().replace(/^#/, '').toUpperCase();
  const phone = digits(req.query?.phone);
  if (!code || phone.length < 8) return res.status(400).json({ error: 'Cần nhập mã chuyến và số điện thoại' });

  try {
    const state = await loadState();
    if (!state) return res.status(502).json({ error: 'load_failed' });
    const trips = (state.trips || []).filter(
      (t) => String(t.tripCode || '').toUpperCase() === code && digits(t.customerPhone) === phone
    );
    return res.status(200).json({
      trips: trips.map((t) => {
        const v = state.vehicles?.find((x) => x.id === t.vehicleId);
        const d = t.dispatchedAt ? state.drivers?.find((x) => x.id === t.driverId) : null;
        return {
          tripCode: t.tripCode,
          status: t.status,
          tripDate: t.tripDate,
          departureTime: t.departureTime,
          pickupLocation: t.pickupLocation,
          dropoffLocation: t.dropoffLocation,
          vehicle: v ? { seatCategory: v.seatCategory, brand: v.brand, model: v.model, plateNumber: v.plateNumber } : null,
          driver: d ? { fullName: d.fullName, phone: d.phone } : null,
        };
      }),
    });
  } catch {
    return res.status(500).json({ error: 'server_error' });
  }
}
