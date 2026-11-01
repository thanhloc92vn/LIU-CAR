// Chủ hệ thống tạo tài khoản đăng nhập (Supabase Auth) và cấp quyền ngay trong app, hoặc đặt lại mật khẩu.
// Chỉ máy chủ có khóa dịch vụ mới tạo được user; người gọi phải gửi token đăng nhập và là SUPER_ADMIN đang hoạt động.
// Body: { action: 'create', email, password, role, fullName, driverId } | { action: 'reset_password', userId, password }
import { hasServiceKey, headers, supabaseUrl } from './_shared.js';

const ROLES = ['SUPER_ADMIN', 'DISPATCHER', 'ACCOUNTANT', 'DRIVER'];
const PUBLIC_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_hx8j9L2F_gBIQzrPcWOZxA_yyy5qGPo';

async function staffRow(userId) {
  const res = await fetch(`${supabaseUrl()}/rest/v1/staff?user_id=eq.${encodeURIComponent(userId)}&select=*`, {
    headers: headers(),
  });
  return res.ok ? (await res.json())?.[0] || null : null;
}

// Người gọi là ai (theo token đăng nhập của họ) và có phải chủ hệ thống không
async function callerId(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const res = await fetch(`${supabaseUrl()}/auth/v1/user`, {
    headers: { apikey: PUBLIC_KEY, Authorization: `Bearer ${token}` },
  });
  const user = res.ok ? await res.json() : null;
  if (!user?.id) return null;
  const me = await staffRow(user.id);
  return me?.active && me.role === 'SUPER_ADMIN' ? user.id : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!hasServiceKey()) return res.status(503).json({ error: 'Máy chủ chưa có SUPABASE_SERVICE_KEY' });

  try {
    const me = await callerId(req);
    if (!me) return res.status(403).json({ error: 'Chỉ chủ hệ thống được tạo tài khoản' });

    const b = req.body || {};
    const password = typeof b.password === 'string' ? b.password : '';
    if (password.length < 8) return res.status(400).json({ error: 'Mật khẩu cần ít nhất 8 ký tự' });

    if (b.action === 'reset_password') {
      const target = await staffRow(String(b.userId || ''));
      if (!target || target.user_id === me) {
        return res.status(400).json({ error: 'Không đặt lại được mật khẩu cho tài khoản này' });
      }
      const r = await fetch(`${supabaseUrl()}/auth/v1/admin/users/${target.user_id}`, {
        method: 'PUT',
        headers: headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ password }),
      });
      if (!r.ok) return res.status(502).json({ error: 'Supabase không đặt lại được mật khẩu' });
      return res.status(200).json({ ok: true });
    }

    if (b.action !== 'create') return res.status(400).json({ error: 'Thao tác không hợp lệ' });

    const email = String(b.email || '').trim().toLowerCase();
    const role = ROLES.includes(b.role) ? b.role : '';
    const driverId = role === 'DRIVER' ? String(b.driverId || '') : null;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !role || (role === 'DRIVER' && !driverId)) {
      return res.status(400).json({ error: 'Thiếu email/số điện thoại, vai trò hoặc hồ sơ tài xế' });
    }

    const created = await fetch(`${supabaseUrl()}/auth/v1/admin/users`, {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ email, password, email_confirm: true }),
    });
    const user = await created.json().catch(() => null);
    if (!created.ok || !user?.id) {
      const exists = created.status === 422 || /already|exists/i.test(user?.msg || user?.message || '');
      return res.status(created.status === 422 ? 409 : 502).json({
        error: exists
          ? 'Tài khoản này đã có. Để trống ô mật khẩu rồi bấm Cấp quyền, hoặc dùng nút Đặt lại mật khẩu.'
          : 'Supabase không tạo được tài khoản',
      });
    }

    const saved = await fetch(`${supabaseUrl()}/rest/v1/staff?on_conflict=user_id`, {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' }),
      body: JSON.stringify({
        user_id: user.id,
        email,
        full_name: String(b.fullName || '').slice(0, 100),
        role,
        driver_id: driverId,
        active: true,
      }),
    });
    if (!saved.ok) return res.status(502).json({ error: 'Đã tạo tài khoản nhưng chưa cấp được quyền, hãy bấm Cấp quyền lại' });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'server_error' });
  }
}
