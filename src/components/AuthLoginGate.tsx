import React, { useEffect, useState } from 'react';
import { AlertCircle, Car, KeyRound, ShieldCheck } from 'lucide-react';
import { AuthUserSession } from '../types/fleet';
import { signInWithSupabaseAuth } from '../services/supabaseClient';

interface AuthLoginGateProps {
  onLoginSuccess: (session: AuthUserSession) => void;
  onBackToPublicPortal?: () => void;
}

// Đăng nhập bằng Supabase Auth. Quyền (admin hay tài xế) lấy từ bảng staff, không kiểm tra ở trình duyệt.
export const AuthLoginGate: React.FC<AuthLoginGateProps> = ({
  onLoginSuccess,
  onBackToPublicPortal,
}) => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Chưa đăng nhập thì không đọc được DB: lấy tên công ty từ dữ liệu công khai
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    fetch('/api/public-catalog')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCompanyName(d?.tenant?.name || ''))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    const r = await signInWithSupabaseAuth(login, password);
    setLoading(false);
    if (r.ok && r.session) onLoginSuccess(r.session);
    else setErrorMsg(r.error || 'Đăng nhập không thành công');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Banner */}
        <div className="bg-white text-slate-900 p-6 text-center space-y-2 border-b border-slate-200">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 mx-auto flex items-center justify-center">
            <Car className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-lg font-extrabold tracking-tight">Thuê xe nhà</h1>
          <p className="text-sm text-slate-500">{companyName}</p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-xs font-medium text-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Cổng xác thực & phân quyền quản trị</span>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email (quản trị) hoặc số điện thoại (tài xế) *
              </label>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="email@congty.vn hoặc 0901234567"
                autoComplete="username"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mật khẩu *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                autoComplete="current-password"
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
              <span>{loading ? 'Đang xác thực...' : 'Đăng nhập'}</span>
            </button>
          </form>

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
