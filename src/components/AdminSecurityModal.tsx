import React, { useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  Copy,
  ExternalLink,
  Globe,
  KeyRound,
  Lock,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { AdminAccount } from '../types/fleet';
import { getSupabaseCredentials } from '../services/supabaseClient';

interface AdminSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminAccounts: AdminAccount[];
  onApproveAccount: (accountId: string) => void;
  onToggleLockAccount: (accountId: string) => void;
  onDeleteAccount: (accountId: string) => void;
  onUpdateAdminCredentials: (
    accountId: string,
    newUsername: string,
    newPassword: string
  ) => void;
  onCreateApprovedAdmin: (acc: Omit<AdminAccount, 'id' | 'createdAt'>) => void;
  onSaveSupabaseCreds: (url: string, anonKey: string) => void;
}

export const AdminSecurityModal: React.FC<AdminSecurityModalProps> = ({
  isOpen,
  onClose,
  adminAccounts,
  onApproveAccount,
  onToggleLockAccount,
  onDeleteAccount,
  onUpdateAdminCredentials,
  onCreateApprovedAdmin,
  onSaveSupabaseCreds,
}) => {
  const existingSb = getSupabaseCredentials();
  const [sbUrl, setSbUrl] = useState(existingSb.url);
  const [sbKey, setSbKey] = useState(existingSb.anonKey);

  const mainAdmin =
    adminAccounts.find((a) => a.role === 'SUPER_ADMIN') || adminAccounts[0];

  // Change username & password for primary admin
  const [editAdminUser, setEditAdminUser] = useState(mainAdmin?.username || 'admin');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [copiedLink, setCopiedLink] = useState<'PUBLIC' | 'ADMIN' | null>(null);

  // Add new admin directly
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newRole, setNewRole] = useState<AdminAccount['role']>('DISPATCHER');

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

  const pendingCount = adminAccounts.filter((a) => a.status === 'PENDING_APPROVAL').length;

  const handleCreateDirect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPass.trim()) return;
    onCreateApprovedAdmin({
      username: newUsername.trim(),
      email: `${newUsername.trim()}@liucar.vn`,
      fullName: newFullName.trim() || newUsername.trim(),
      passwordHash: newPass.trim(),
      role: newRole,
      status: 'APPROVED',
    });
    setNewUsername('');
    setNewFullName('');
    setNewPass('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <span>Quản Trị Bảo Mật & Xác Nhận Đăng Nhập Admin</span>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[11px] font-extrabold">
                    {pendingCount} chờ duyệt
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-300">
                Phê duyệt nhân viên xin cấp quyền, đổi mật khẩu Admin & cấu hình đồng bộ đám mây Supabase
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* 0. Hai Đường Link Tách Biệt: Link Khách Hàng Đặt Xe vs Link Đăng Nhập Quản Trị Riêng */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-3 border border-slate-800">
            <div className="font-extrabold text-sm flex items-center gap-2 text-blue-300">
              <Globe className="w-4 h-4 text-blue-400" />
              <span>Cấu Hình 2 Đường Link Tách Biệt (Khách Đặt Xe & Quản Trị Riêng)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Public link */}
              <div className="bg-slate-800/90 rounded-xl p-3 border border-slate-700 space-y-1.5">
                <div className="text-[11px] font-bold text-emerald-300">
                  🌐 1. Link Web Công Khai Cho Khách Đặt Xe:
                </div>
                <div className="font-mono text-xs text-white bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-700 truncate">
                  {publicUrl}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleCopy(publicUrl, 'PUBLIC')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedLink === 'PUBLIC' ? 'Đã copy!' : 'Copy link gửi khách'}</span>
                  </button>
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-[11px] transition"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Mở trang khách</span>
                  </a>
                </div>
              </div>

              {/* Private Admin Login link */}
              <div className="bg-slate-800/90 rounded-xl p-3 border border-blue-500/40 space-y-1.5">
                <div className="text-[11px] font-bold text-amber-300">
                  🔐 2. Link Đăng Nhập Quản Trị Riêng (Nội bộ):
                </div>
                <div className="font-mono text-xs text-amber-200 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-700 truncate">
                  {adminLoginUrl}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleCopy(adminLoginUrl, 'ADMIN')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedLink === 'ADMIN' ? 'Đã copy!' : 'Copy link Admin'}</span>
                  </button>
                  <span className="text-[10px] text-slate-400">
                    (Hoặc vào <code className="text-slate-200">/quan-tri</code>,{' '}
                    <code className="text-slate-200">/login</code>)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 1. Danh sách Tài khoản & Phê duyệt Đăng nhập */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              1. Danh Sách Tài Khoản Quản Trị & Xác Nhận Cho Phép Đăng Nhập ({adminAccounts.length})
            </h4>

            <div className="space-y-2.5">
              {adminAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    acc.status === 'PENDING_APPROVAL'
                      ? 'bg-amber-50 border-amber-300'
                      : acc.status === 'LOCKED'
                      ? 'bg-rose-50/60 border-rose-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">{acc.fullName}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-mono font-bold text-[11px]">
                        @{acc.username}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
                        {acc.role === 'SUPER_ADMIN'
                          ? '👑 Chủ Hệ Thống'
                          : acc.role === 'DISPATCHER'
                          ? '🚗 Điều Hành Xe'
                          : '💰 Kế Toán'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          acc.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : acc.status === 'PENDING_APPROVAL'
                            ? 'bg-amber-200 text-amber-900 animate-pulse'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {acc.status === 'APPROVED'
                          ? '✅ Đã xác nhận cho phép'
                          : acc.status === 'PENDING_APPROVAL'
                          ? '⏳ Chờ Admin Xác Nhận'
                          : '🔒 Đã khóa'}
                      </span>
                    </div>
                    <div className="text-slate-500">
                      Email: {acc.email} • Ngày tạo: {acc.createdAt} • Mật khẩu hiện tại:{' '}
                      <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800 font-bold">
                        {acc.passwordHash}
                      </code>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {acc.status === 'PENDING_APPROVAL' && (
                      <button
                        type="button"
                        onClick={() => onApproveAccount(acc.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Xác Nhận Duyệt
                      </button>
                    )}

                    {acc.role !== 'SUPER_ADMIN' && (
                      <>
                        <button
                          type="button"
                          onClick={() => onToggleLockAccount(acc.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold transition"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          {acc.status === 'LOCKED' ? 'Mở khóa' : 'Khóa'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteAccount(acc.id)}
                          className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 transition"
                          title="Xóa tài khoản"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Đổi Tên đăng nhập & Mật khẩu Admin chính & Tạo tài khoản mới */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50/70 rounded-xl p-4 border border-blue-200 space-y-2.5">
              <h4 className="font-bold text-blue-950 flex items-center gap-1.5 text-xs">
                <KeyRound className="w-4 h-4 text-blue-600" />
                2. Đổi User & Mật Khẩu Admin Chính ({mainAdmin?.username || 'admin'})
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={editAdminUser}
                  onChange={(e) => setEditAdminUser(e.target.value)}
                  placeholder="Tên đăng nhập Admin..."
                  className="rounded-lg border border-blue-300 bg-white px-2.5 py-1.5 text-xs font-semibold"
                />
                <input
                  type="text"
                  value={newAdminPass}
                  onChange={(e) => setNewAdminPass(e.target.value)}
                  placeholder="Mật khẩu mới..."
                  className="rounded-lg border border-blue-300 bg-white px-2.5 py-1.5 text-xs font-semibold"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!mainAdmin) return;
                  const finalUser = editAdminUser.trim() || mainAdmin.username;
                  const finalPass = newAdminPass.trim() || mainAdmin.passwordHash;
                  onUpdateAdminCredentials(mainAdmin.id, finalUser, finalPass);
                  setNewAdminPass('');
                }}
                className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Lưu Tài Khoản & Mật Khẩu Admin
              </button>
            </div>

            <form
              onSubmit={handleCreateDirect}
              className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5"
            >
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                3. Cấp Nhanh Tài Khoản Điều Hành / Kế Toán
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Họ và tên..."
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
                  required
                />
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Username (VD: dieuhanh2)"
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
                  required
                />
                <input
                  type="text"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Mật khẩu..."
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
                  required
                />
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5"
                >
                  + Cấp Quyền Ngay
                </button>
              </div>
            </form>
          </div>

          {/* 3. Cấu hình Kết nối Trực tiếp Supabase Cloud */}
          <div className="bg-emerald-50/70 rounded-xl p-4 border border-emerald-200 space-y-3">
            <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <Cloud className="w-4 h-4 text-emerald-600" />
              4. Kết Nối Trực Tiếp Cơ Sở Dữ Liệu Supabase Cloud (Đồng bộ Đa Thiết Bị)
            </h4>
            <p className="text-[11px] text-emerald-800">
              Dán <strong>Project URL</strong> và <strong>anon / public key</strong> từ Supabase của bạn vào đây để lưu và đẩy toàn bộ dữ liệu Xe, Tài xế, Lịch trình lên các bảng Supabase ngay lập tức:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  value={sbUrl}
                  onChange={(e) => setSbUrl(e.target.value)}
                  placeholder="https://xxxx.supabase.co"
                  className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Supabase Anon / Public Key
                </label>
                <input
                  type="password"
                  value={sbKey}
                  onChange={(e) => setSbKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onSaveSupabaseCreds(sbUrl, sbKey)}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
              >
                ☁️ Lưu Kết Nối & Đẩy Dữ Liệu Lên Supabase Ngay
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
