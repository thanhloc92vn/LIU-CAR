import React, { useState } from 'react';
import {
  AlertCircle,
  Car,
  CheckCircle2,
  KeyRound,
  Lock,
  ShieldCheck,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { AdminAccount, AuthUserSession, Driver } from '../types/fleet';
import { isSupabaseConfigured, signInWithSupabaseAuth } from '../services/supabaseClient';

interface AuthLoginGateProps {
  adminAccounts: AdminAccount[];
  drivers: Driver[];
  companyName: string;
  onLoginSuccess: (session: AuthUserSession) => void;
  onRequestAdminAccess: (newAccount: Omit<AdminAccount, 'id' | 'createdAt' | 'status'>) => void;
  onBackToPublicPortal?: () => void;
}

export const AuthLoginGate: React.FC<AuthLoginGateProps> = ({
  adminAccounts,
  drivers,
  companyName,
  onLoginSuccess,
  onRequestAdminAccess,
  onBackToPublicPortal,
}) => {
  const [mode, setMode] = useState<'ADMIN_LOGIN' | 'DRIVER_LOGIN' | 'REGISTER_REQUEST'>(
    'ADMIN_LOGIN'
  );

  // Admin login state
  const [usernameOrEmail, setUsernameOrEmail] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Driver login state
  const [selectedDriverPhone, setSelectedDriverPhone] = useState(drivers[0]?.phone || '');
  const [driverPin, setDriverPin] = useState('');

  // Request new staff/admin account state
  const [reqFullName, setReqFullName] = useState('');
  const [reqUsername, setReqUsername] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqPassword, setReqPassword] = useState('');
  const [reqRole, setReqRole] = useState<'DISPATCHER' | 'ACCOUNTANT'>('DISPATCHER');

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const cleanUser = usernameOrEmail.trim().toLowerCase();
    const cleanPass = password.trim();

    // 1. Check against local/synced adminAccounts list
    const matched = adminAccounts.find(
      (acc) =>
        acc.username.toLowerCase() === cleanUser || acc.email.toLowerCase() === cleanUser
    );

    if (matched) {
      if (matched.status === 'PENDING_APPROVAL') {
        setLoading(false);
        setErrorMsg(
          'Tài khoản này đang ở trạng thái CHỜ ADMIN XÁC NHẬN. Vui lòng liên hệ Chủ hệ thống (Super Admin) bấm phê duyệt quyền đăng nhập!'
        );
        return;
      }
      if (matched.status === 'LOCKED') {
        setLoading(false);
        setErrorMsg('Tài khoản này đã bị khóa quyền truy cập bởi Quản trị viên.');
        return;
      }

      // Allow default master password or exact match
      const isDefaultAdmin =
        matched.username === 'admin' &&
        (cleanPass === matched.passwordHash || cleanPass === '123456');

      if (cleanPass === matched.passwordHash || isDefaultAdmin) {
        setLoading(false);
        onLoginSuccess({
          id: matched.id,
          username: matched.username,
          fullName: matched.fullName,
          role: 'ADMIN',
          subRole: matched.role,
          loginAt: new Date().toISOString(),
        });
        return;
      }
    }

    // 2. Also try Supabase Auth if configured and user entered an email
    if (isSupabaseConfigured() && cleanUser.includes('@')) {
      const sbAuth = await signInWithSupabaseAuth(cleanUser, cleanPass);
      if (sbAuth.ok) {
        setLoading(false);
        onLoginSuccess({
          id: sbAuth.userId || 'SB-ADMIN',
          username: sbAuth.email || cleanUser,
          fullName: `Quản trị viên (${sbAuth.email})`,
          role: 'ADMIN',
          subRole: 'SUPER_ADMIN',
          loginAt: new Date().toISOString(),
        });
        return;
      }
    }

    setLoading(false);
    setErrorMsg(
      'Tên đăng nhập hoặc mật khẩu không đúng. (Mặc định lần đầu: Tài khoản "admin" / Mật khẩu "LiuCar@2026" hoặc "123456")'
    );
  };

  const handleDriverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const drv = drivers.find(
      (d) =>
        d.phone === selectedDriverPhone.trim() ||
        d.code.toLowerCase() === selectedDriverPhone.trim().toLowerCase()
    );

    if (!drv) {
      setErrorMsg('Không tìm thấy hồ sơ tài xế với Số điện thoại / Mã tài xế này.');
      return;
    }

    if (driverPin.trim() !== '1234' && driverPin.trim() !== drv.phone.slice(-4)) {
      setErrorMsg(
        'Mã PIN tài xế không đúng (Mã PIN mặc định: 1234 hoặc 4 số cuối điện thoại).'
      );
      return;
    }

    onLoginSuccess({
      id: drv.id,
      username: drv.code,
      fullName: drv.fullName,
      role: 'DRIVER',
      driverId: drv.id,
      loginAt: new Date().toISOString(),
    });
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!reqUsername.trim() || !reqPassword.trim() || !reqFullName.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ Họ tên, Tên đăng nhập và Mật khẩu.');
      return;
    }

    const exists = adminAccounts.some(
      (a) => a.username.toLowerCase() === reqUsername.trim().toLowerCase()
    );
    if (exists) {
      setErrorMsg('Tên đăng nhập này đã tồn tại trên hệ thống.');
      return;
    }

    onRequestAdminAccess({
      username: reqUsername.trim(),
      email: reqEmail.trim() || `${reqUsername.trim()}@liucar.vn`,
      fullName: reqFullName.trim(),
      passwordHash: reqPassword.trim(),
      role: reqRole,
    });

    setSuccessMsg(
      'Đã gửi yêu cầu cấp quyền! Tài khoản của bạn đang ở trạng thái "Chờ Admin Xác Nhận". Sau khi Admin bấm duyệt, bạn có thể đăng nhập.'
    );
    setReqFullName('');
    setReqUsername('');
    setReqEmail('');
    setReqPassword('');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Banner */}
        <div className="bg-white text-slate-900 p-6 text-center space-y-2 border-b border-slate-200">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 mx-auto flex items-center justify-center">
            <Car className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-lg font-extrabold tracking-tight">SmartFleet Pro</h1>
          <p className="text-sm text-slate-500">{companyName}</p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-xs font-medium text-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Cổng xác thực & phân quyền quản trị</span>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-3 bg-slate-100 p-1.5 gap-1 border-b border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setMode('ADMIN_LOGIN');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1 transition ${
              mode === 'ADMIN_LOGIN'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>Admin</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('DRIVER_LOGIN');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1 transition ${
              mode === 'DRIVER_LOGIN'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Tài xế</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('REGISTER_REQUEST');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1 transition ${
              mode === 'REGISTER_REQUEST'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 shrink-0" />
            <span>Xin cấp quyền</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* MODE 1: ADMIN LOGIN */}
          {mode === 'ADMIN_LOGIN' && (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tài khoản Quản trị / Email Admin *
                </label>
                <input
                  type="text"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="admin hoặc email@liucar.vn"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu Quản trị *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu Admin..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold transition flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>{loading ? 'Đang xác thực...' : 'Đăng Nhập Quản Trị Hệ Thống'}</span>
              </button>

              {/* Hộp gợi ý nhanh lần đầu */}
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <div className="font-bold text-slate-800 flex items-center justify-between">
                  <span>Tài khoản Admin mặc định khởi tạo:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setUsernameOrEmail('admin');
                      setPassword('LiuCar@2026');
                    }}
                    className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold hover:bg-blue-200 transition"
                  >
                    Điền nhanh
                  </button>
                </div>
                <div>
                  • Tài khoản: <code className="font-bold text-slate-900">admin</code> | Mật khẩu:{' '}
                  <code className="font-bold text-slate-900">LiuCar@2026</code> (hoặc{' '}
                  <code>123456</code>)
                </div>
                <div className="text-xs text-slate-500">
                  * Sau khi đăng nhập, bạn bấm nút <strong>&ldquo;Bảo mật Admin&rdquo;</strong> trên góc trên để đổi mật khẩu riêng và phê duyệt các nhân viên điều hành đang chờ xác nhận.
                </div>
              </div>
            </form>
          )}

          {/* MODE 2: DRIVER LOGIN */}
          {mode === 'DRIVER_LOGIN' && (
            <form onSubmit={handleDriverSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chọn Tài Xế / Nhập Số Điện Thoại *
                </label>
                <select
                  value={selectedDriverPhone}
                  onChange={(e) => setSelectedDriverPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900"
                >
                  {drivers.map((d) => (
                    <option key={d.id} value={d.phone}>
                      {d.fullName} ({d.code} • SĐT: {d.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mã PIN Tài Xế *
                </label>
                <input
                  type="password"
                  value={driverPin}
                  onChange={(e) => setDriverPin(e.target.value)}
                  placeholder="Nhập mã PIN (Mặc định: 1234)"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-900"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold transition"
              >
                Đăng Nhập Cổng Tài Xế
              </button>

              <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-200 text-xs text-emerald-900">
                <strong>Phân quyền Tài xế:</strong> Tài xế chỉ xem được lịch chạy của cá nhân mình, bấm xác nhận nhận chuyến và báo chi phí đậu xe / phạt giao thông (không xem được toàn bộ doanh thu công ty).
              </div>
            </form>
          )}

          {/* MODE 3: REGISTER REQUEST (WAITING FOR ADMIN APPROVAL) */}
          {mode === 'REGISTER_REQUEST' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div className="text-xs text-slate-600 bg-indigo-50 p-3 rounded-xl border border-indigo-200">
                Nhân viên Điều hành hoặc Kế toán đăng ký tài khoản tại đây. Tài khoản tạo mới sẽ ở trạng thái <strong>&Ldquo;chờ Admin xác nhận&rdquo;</strong> trước khi được phép đăng nhập.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Họ và tên *</label>
                <input
                  type="text"
                  value={reqFullName}
                  onChange={(e) => setReqFullName(e.target.value)}
                  placeholder="VD: Lê Thị Hương (Kế toán)"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên đăng nhập *
                  </label>
                  <input
                    type="text"
                    value={reqUsername}
                    onChange={(e) => setReqUsername(e.target.value)}
                    placeholder="ketoan01"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vai trò</label>
                  <select
                    value={reqRole}
                    onChange={(e) => setReqRole(e.target.value as 'DISPATCHER' | 'ACCOUNTANT')}
                    className="w-full rounded-xl border border-slate-300 px-2.5 py-2 text-xs font-bold"
                  >
                    <option value="DISPATCHER">Điều hành xe</option>
                    <option value="ACCOUNTANT">Kế toán đối soát</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={reqEmail}
                  onChange={(e) => setReqEmail(e.target.value)}
                  placeholder="huong@liucar.vn"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu đăng ký *
                </label>
                <input
                  type="password"
                  value={reqPassword}
                  onChange={(e) => setReqPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-extrabold transition"
              >
                Gửi Yêu Cầu Chờ Admin Duyệt
              </button>
            </form>
          )}

          {onBackToPublicPortal && (
            <div className="pt-3 border-t border-slate-200 text-center">
              <button
                type="button"
                onClick={onBackToPublicPortal}
                className="text-xs font-bold text-slate-500 hover:text-blue-600 transition"
              >
                ← Quay về Trang Chủ Đặt Xe Công Khai (Dành cho Khách hàng)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
