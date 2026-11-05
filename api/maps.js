// Gợi ý địa chỉ và tính quãng đường qua Vietmap (v4). Khóa VIETMAP_API_KEY chỉ nằm ở server.
//   GET /api/maps?type=autocomplete&input=...       -> { predictions: [{ description, placeId }] }
//   GET /api/maps?type=route&from=<placeId>&to=<placeId> -> { km, minutes, line: [[lng,lat],...], bbox }
import { rateLimited } from './_shared.js';

const BASE = 'https://maps.vietmap.vn/api';
const hits = new Map();

async function vietmap(path, params) {
  const qs = new URLSearchParams({ apikey: process.env.VIETMAP_API_KEY });
  for (const [k, v] of Object.entries(params)) [].concat(v).forEach((x) => qs.append(k, x));
  const r = await fetch(`${BASE}/${path}?${qs}`);
  if (!r.ok) throw new Error(`vietmap ${path} ${r.status}`);
  return r.json();
}

async function placeLatLng(refId) {
  const d = await vietmap('place/v4', { refid: refId });
  if (typeof d?.lat !== 'number') throw new Error('place_not_found');
  return `${d.lat},${d.lng}`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.VIETMAP_API_KEY) return res.status(503).json({ error: 'not_configured' });
  if (rateLimited(hits, req, 300, 10 * 60 * 1000)) return res.status(429).json({ error: 'too_many_requests' });

  const type = req.query?.type;
  try {
    if (type === 'autocomplete') {
      const input = String(req.query?.input || '').trim().slice(0, 120);
      if (input.length < 2) return res.status(200).json({ predictions: [] });
      const d = await vietmap('autocomplete/v4', { text: input });
      return res.status(200).json({
        predictions: (Array.isArray(d) ? d : []).slice(0, 6).map((p) => ({ description: p.display, placeId: p.ref_id })),
      });
    }

    if (type === 'route') {
      const from = String(req.query?.from || '');
      const to = String(req.query?.to || '');
      if (!from || !to) return res.status(400).json({ error: 'missing_points' });
      const points = await Promise.all([placeLatLng(from), placeLatLng(to)]);
      const d = await vietmap('route/v4', { point: points, vehicle: 'car', points_encoded: 'false' });
      const path = d?.paths?.[0];
      if (!path) return res.status(404).json({ error: 'no_route' });
      // Rút gọn đường đi còn tối đa ~400 điểm, đủ vẽ bản đồ nhỏ trên trang khách
      const coords = path.points?.coordinates || [];
      const step = Math.max(1, Math.ceil(coords.length / 400));
      const line = coords.filter((_, i) => i % step === 0 || i === coords.length - 1);
      return res.status(200).json({
        km: Math.round(path.distance / 100) / 10,
        minutes: Math.round(path.time / 60000),
        line,
        bbox: path.bbox,
      });
    }

    return res.status(400).json({ error: 'unknown_type' });
  } catch (err) {
    return res.status(502).json({ error: err?.message || 'maps_failed' });
  }
}
