// Dữ liệu công khai cho trang khách: thông tin doanh nghiệp, danh sách xe, tuyến định mức.
// Không có tài xế, chuyến hay thông tin khách. Đọc bằng SUPABASE_SERVICE_KEY vì khóa công khai không còn đọc được DB.
import { hasServiceKey, loadState } from './_shared.js';

const TENANT_FIELDS = ['id', 'name', 'shortName', 'hotline', 'taxCode', 'defaultDispatchFeePercent', 'siteContent', 'taxiFare'];
const VEHICLE_FIELDS = [
  'id', 'tenantId', 'plateNumber', 'brand', 'model', 'vehicleType', 'seatCategory', 'year', 'color',
  'serviceMode', 'dailyRateSelfDrive', 'fuelType', 'fuelCostPerKm', 'highwayTollMultiplier', 'status',
];
const PRESET_FIELDS = ['id', 'name', 'routeType', 'defaultDistanceKm', 'baseToll4To7Seats', 'description'];

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj?.[k] !== undefined).map((k) => [k, obj[k]]));

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!hasServiceKey()) return res.status(503).json({ error: 'not_configured' });

  try {
    const state = await loadState();
    if (!state) return res.status(502).json({ error: 'load_failed' });
    const tenant = state.tenants?.find((t) => t.id === state.activeTenantId) || state.tenants?.[0];
    if (!tenant) return res.status(404).json({ error: 'no_tenant' });

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      tenant: pick(tenant, TENANT_FIELDS),
      // Trang khách chỉ hiện ảnh đầu tiên, nên chỉ gửi ảnh đó cho nhẹ.
      // Biển trắng (xe cá nhân) không gửi số biển ra ngoài.
      vehicles: (state.vehicles || [])
        .filter((v) => v.tenantId === tenant.id)
        .map((v) => ({
          ...pick(v, VEHICLE_FIELDS),
          plateNumber: v.plateColor === 'YELLOW' ? v.plateNumber : '',
          images: (v.images || []).slice(0, 1),
        })),
      highwayPresets: (state.highwayPresets || []).map((p) => pick(p, PRESET_FIELDS)),
    });
  } catch {
    return res.status(500).json({ error: 'server_error' });
  }
}
