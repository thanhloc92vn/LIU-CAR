// Khách tra cứu lịch đã đặt bằng số điện thoại đặt xe; mã chuyến không bắt buộc.
// Chỉ có SĐT: che điểm đón/trả, biển số và tài xế (ai biết SĐT khách cũng tra được).
// Có thêm đúng mã chuyến: trả đủ. Không bao giờ trả CCCD/GPLX hay chi phí.
import { clientIp, hasServiceKey, limited, loadState, verifyHuman } from './_shared.js';
const digits = (s) => String(s || '').replace(/\D/g, '');

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!hasServiceKey()) return res.status(503).json({ error: 'not_configured' });
  if (await limited(`lookup:ip:${clientIp(req)}`, 20, 10 * 60)) {
    return res.status(429).json({ error: 'Tra cứu quá nhiều lần. Vui lòng thử lại sau ít phút.' });
  }
  if (!(await verifyHuman(req, req.query?.t))) {
    return res.status(403).json({ error: 'Chưa xác minh được bạn là người thật. Vui lòng tải lại trang rồi thử lại.' });
  }

  const code = String(req.query?.code || '').trim().replace(/^#/, '').toUpperCase();
  const phone = digits(req.query?.phone);
  if (phone.length < 8) return res.status(400).json({ error: 'Cần nhập số điện thoại đặt xe' });

  try {
    const state = await loadState();
    if (!state) return res.status(502).json({ error: 'load_failed' });
    const trips = (state.trips || []).filter(
      (t) => digits(t.customerPhone) === phone && (!code || String(t.tripCode || '').toUpperCase() === code)
    );
    const full = Boolean(code);
    return res.status(200).json({
      trips: trips.map((t) => {
        const v = state.vehicles?.find((x) => x.id === t.vehicleId);
        const d = full && t.dispatchedAt ? state.drivers?.find((x) => x.id === t.driverId) : null;
        return {
          tripCode: t.tripCode,
          status: t.status,
          tripDate: t.tripDate,
          departureTime: t.departureTime,
          pickupLocation: full ? t.pickupLocation : null,
          dropoffLocation: full ? t.dropoffLocation : null,
          vehicle: v
            ? { seatCategory: v.seatCategory, brand: v.brand, model: v.model, plateNumber: full ? v.plateNumber : null }
            : null,
          driver: d ? { fullName: d.fullName, phone: d.phone } : null,
        };
      }),
    });
  } catch {
    return res.status(500).json({ error: 'server_error' });
  }
}
