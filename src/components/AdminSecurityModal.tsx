import React, { useEffect, useState } from 'react';
import { Copy, ExternalLink, Globe, KeyRound, Lock, ShieldCheck, Trash2, UserCheck, UserPlus, X } from 'lucide-react';
import { Driver } from '../types/fleet';
import {
  adminUsers,
  changeMyPassword,
  deleteStaff,
  DRIVER_EMAIL_DOMAIN,
  listStaff,
  setStaff,
  StaffMember,
  StaffRole,
} from '../services/supabaseClient';

interface AdminSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSuperAdmin: boolean;
  drivers: Driver[];
  showToast: (msg: string) => void;
}

const ROLE_LABELS: Record<StaffRole, string> = {
  SUPER_ADMIN: 'Chủ hệ thống',
  DISPATCHER: 'Điều hành xe',
  ACCOUNTANT: 'Kế toán',
  DRIVER: 'Tài xế',
};

// Người dùng nằm trong Supabase Auth (mật khẩu do Supabase giữ). Chủ hệ thống tạo tài khoản, cấp/thu quyền
// và đặt lại mật khẩu ở đây; việc tạo/đặt mật khẩu chạy trên máy chủ (api/admin-users.js).
export const AdminSecurityModal: React.FC<AdminSecurityModalProps> = ({
  isOpen,
  onClose,
  isSuperAdmin,
  drivers,
  showToast,
}) => {
  const [copiedLink, setCopiedLink] = useState<'PUBLIC' | 'ADMIN' | null>(null);
  const [staff, setStaffList] = useState<StaffMember[]>([]);
  const [busy, setBusy] = useState(false);

  // Tạo tài khoản (có mật khẩu) hoặc cấp quyền cho tài khoản đã có (để trống mật khẩu)
  const [email, setEmail] = useState('');
  const [grantPass, setGrantPass] = useState('');
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [resetPass, setResetPass] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<StaffRole>('DISPATCHER');
  const [driverId, setDriverId] = useState('');

  const [newPass, setNewPass] = useState('');

  const refresh = () => listStaff().then(setStaffList);

  useEffect(() => {
    if (isOpen) refresh();
  }, [isOpen]);

  if (!isOpen) return null;

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://liu-car.vercel.app';
  const publicUrl = `${origin}/`;
  const adminLoginUrl = `${origin}/admin`;

  const handleCopy = (url: string, type: 'PUBLIC' | 'ADMIN') => {
    navigator.clipboard?.writeText(url);
    setCopiedLink(type);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  const driverName = (id: string | null) => drivers.find((d) => d.id === id)?.fullName || id || '';

  const save = async (m: Parameters<typeof setStaff>[0], doneMsg: string) => {
    setBusy(true);
    const r = await setStaff(m);
    setBusy(false);
    if (!r.ok) {
      showToast(r.error || 'Không lưu được quyền');
      return false;
    }
    showToast(doneMsg);
    refresh();
    return true;
  };

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    const login = email.trim().toLowerCase();
    // Tài xế có thể nhập số điện thoại; tài khoản tương ứng là <số>@taixe.haydixe.vn
    const fullEmail = login.includes('@') ? login : `${login.replace(/\D/g, '')}@${DRIVER_EMAIL_DOMAIN}`;
    const drv = drivers.find((d) => d.id === driverId);
    const member = {
      email: fullEmail,
      role,
      fullName: fullName.trim() || (role === 'DRIVER' ? drv?.fullName || '' : ''),
      driverId: role === 'DRIVER' ? driverId : undefined,
    };
    let ok: boolean;
    if (grantPass) {
      setBusy(true);
      const r = await adminUsers({ action: 'create', password: grantPass, ...member });
      setBusy(false);
      ok = r.ok;
      showToast(r.ok ? `Đã tạo tài khoản ${ROLE_LABELS[role]} ${login}` : r.error || 'Không tạo được tài khoản');
      if (ok) refresh();
    } else {
      ok = await save({ ...member, active: true }, `Đã cấp quyền ${ROLE_LABELS[role]} cho ${fullEmail}`);
    }
    if (ok) {
      setEmail('');
      setFullName('');
      setGrantPass('');
    }
  };

  const handleResetPassword = async (userId: string) => {
    setBusy(true);
    const r = await adminUsers({ action: 'reset_password', userId, password: resetPass });
    setBusy(false);
    showToast(r.ok ? 'Đã đặt mật khẩu mới' : r.error || 'Không đặt lại được mật khẩu');
    if (r.ok) {
      setResetFor(null);
      setResetPass('');
    }
  };

  const handleChangePassword = async () => {
    if (newPass.trim().length < 8) {
      showToast('Mật khẩu mới cần ít nhất 8 ký tự');
      return;
    }
    const r = await changeMyPassword(newPass.trim());
    showToast(r.ok ? 'Đã đổi mật khẩu của bạn' : r.error || 'Không đổi được mật khẩu');
    if (r.ok) setNewPass('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white text-slate-900 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold">Tài khoản & phân quyền</h3>
              <p className="text-xs text-slate-500">
                Đăng nhập bằng Supabase Auth: admin thấy và sửa toàn bộ, tài xế chỉ thấy chuyến của mình
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* 0. Hai Đường Link Tách Biệt: Link Khách Hàng Đặt Xe vs Link Đăng Nhập Quản Trị Riêng */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-3 border border-slate-800">
            <div className="font-extrabold text-sm flex items-center gap-2 text-blue-300">
              <Globe className="w-4 h-4 text-blue-400" />
              <span>Cấu hình 2 đường link tách biệt (khách đặt xe & quản trị riêng)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Public link */}
              <div className="bg-slate-800/90 rounded-xl p-3 border border-slate-700 space-y-1.5">
                <div className="text-xs font-bold text-emerald-300">
                  Link web công khai cho khách đặt xe:
                </div>
                <div className="font-mono text-xs text-white bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-700 truncate">
                  {publicUrl}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleCopy(publicUrl, 'PUBLIC')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedLink === 'PUBLIC' ? 'Đã copy!' : 'Copy link gửi khách'}</span>
                  </button>
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs transition"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Mở trang khách</span>
                  </a>
                </div>
              </div>

              {/* Private Admin Login link */}
              <div className="bg-slate-800/90 rounded-xl p-3 border border-blue-500/40 space-y-1.5">
                <div className="text-xs font-bold text-amber-300">
                  Link đăng nhập quản trị riêng (Nội bộ):
                </div>
                <div className="font-mono text-xs text-amber-200 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-700 truncate">
                  {adminLoginUrl}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleCopy(adminLoginUrl, 'ADMIN')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedLink === 'ADMIN' ? 'Đã copy!' : 'Copy link Admin'}</span>
                  </button>
                  <span className="text-xs text-slate-400">
                    (Hoặc vào <code className="text-slate-200">/quan-tri</code>,{' '}
                    <code className="text-slate-200">/login</code>)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 1. Danh sách người dùng được phép vào app */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              Người dùng được phép đăng nhập ({staff.length})
            </h4>
            <div className="space-y-2.5">
              {staff.map((m) => (
                <div
                  key={m.user_id}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    m.active ? 'bg-slate-50 border-slate-200' : 'bg-rose-50/60 border-rose-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">{m.full_name || m.email}</span>
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-xs">
                        {ROLE_LABELS[m.role]}
                      </span>
                      {!m.active && (
                        <span className="px-2 py-0.5 rounded-full font-bold text-xs bg-rose-100 text-rose-800">
                          Đã khóa
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500">
                      {m.email}
                      {m.role === 'DRIVER' && ` • Hồ sơ tài xế: ${driverName(m.driver_id)}`}
                    </div>
                    {resetFor === m.user_id && (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={resetPass}
                          onChange={(e) => setResetPass(e.target.value)}
                          placeholder="Mật khẩu mới (ít nhất 8 ký tự)"
                          autoComplete="new-password"
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
                        />
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleResetPassword(m.user_id)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
                        >
                          Lưu
                        </button>
                      </div>
                    )}
                  </div>

                  {isSuperAdmin && m.role !== 'SUPER_ADMIN' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setResetFor(resetFor === m.user_id ? null : m.user_id);
                          setResetPass('');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold transition"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        Đặt lại mật khẩu
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          save(
                            {
                              email: m.email,
                              role: m.role,
                              fullName: m.full_name,
                              driverId: m.driver_id || undefined,
                              active: !m.active,
                            },
                            m.active ? `Đã khóa ${m.email}` : `Đã mở khóa ${m.email}`
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold transition"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        {m.active ? 'Khóa' : 'Mở khóa'}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={async () => {
                          if (await deleteStaff(m.user_id)) {
                            showToast(`Đã thu hồi quyền của ${m.email}`);
                            refresh();
                          } else showToast('Không thu hồi được quyền');
                        }}
                        className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 transition"
                        title="Thu hồi quyền đăng nhập"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 2. Cấp quyền (chủ hệ thống) & đổi mật khẩu của mình */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isSuperAdmin && (
              <form onSubmit={handleGrant} className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  Tạo tài khoản & cấp quyền
                </h4>
                <p className="text-slate-500">
                  Nhân viên nhập email, tài xế nhập số điện thoại (đăng nhập bằng số điện thoại đó). Để trống mật khẩu
                  nếu tài khoản đã có sẵn và chỉ cần cấp hoặc đổi quyền.
                </p>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email hoặc số điện thoại tài xế"
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
                  required
                />
                <input
                  type="text"
                  value={grantPass}
                  onChange={(e) => setGrantPass(e.target.value)}
                  placeholder="Mật khẩu đăng nhập (ít nhất 8 ký tự)"
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as StaffRole)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-bold"
                  >
                    {(Object.keys(ROLE_LABELS) as StaffRole[]).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  {role === 'DRIVER' ? (
                    <select
                      value={driverId}
                      onChange={(e) => setDriverId(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
                      required
                    >
                      <option value="">Chọn hồ sơ tài xế...</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.fullName} ({d.phone})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Họ và tên..."
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
                    />
                  )}
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5"
                >
                  {grantPass ? '+ Tạo tài khoản' : '+ Cấp quyền'}
                </button>
              </form>
            )}

            <div className="bg-blue-50/70 rounded-xl p-4 border border-blue-200 space-y-2.5">
              <h4 className="font-bold text-blue-950 flex items-center gap-1.5 text-xs">
                <KeyRound className="w-4 h-4 text-blue-600" />
                Đổi mật khẩu của tôi
              </h4>
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Mật khẩu mới (ít nhất 8 ký tự)"
                autoComplete="new-password"
                className="w-full rounded-lg border border-blue-300 bg-white px-2.5 py-1.5 text-xs font-semibold"
              />
              <button
                type="button"
                onClick={handleChangePassword}
                className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Lưu mật khẩu mới
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
