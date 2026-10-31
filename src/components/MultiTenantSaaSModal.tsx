import React, { useState } from 'react';
import { Building2, Check, CopyPlus, Navigation, Plus, Settings2, X } from 'lucide-react';
import { HighwayPreset, RouteType, TenantConfig } from '../types/fleet';
import { formatVND } from '../utils/calculations';

interface MultiTenantSaaSModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenants: TenantConfig[];
  activeTenantId: string;
  highwayPresets: HighwayPreset[];
  onSwitchTenant: (tenantId: string) => void;
  onCloneNewTenant: (newTenant: Omit<TenantConfig, 'id' | 'createdAt'>) => void;
  onAddHighwayPreset: (preset: Omit<HighwayPreset, 'id'>) => void;
}

export const MultiTenantSaaSModal: React.FC<MultiTenantSaaSModalProps> = ({
  isOpen,
  onClose,
  tenants,
  activeTenantId,
  highwayPresets,
  onSwitchTenant,
  onCloneNewTenant,
  onAddHighwayPreset,
}) => {
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [hotline, setHotline] = useState('');
  const [bankInfo, setBankInfo] = useState('');
  const [feePercent, setFeePercent] = useState(10);

  // Add Highway Preset
  const [hwName, setHwName] = useState('');
  const [hwType, setHwType] = useState<RouteType>('HIGHWAY');
  const [hwKm, setHwKm] = useState(120);
  const [hwToll, setHwToll] = useState(160000);

  if (!isOpen) return null;

  const handleClone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCloneNewTenant({
      name: name.trim(),
      shortName: shortName.trim() || name.trim().slice(0, 16),
      taxCode: taxCode.trim() || '0319998888',
      hotline: hotline.trim() || '0909.111.222',
      bankInfo: bankInfo.trim() || 'Vietcombank - 1099887766',
      defaultDispatchFeePercent: Number(feePercent) || 10,
      autoFuelDeductionEnabled: true,
      autoHighwayTollEnabled: true,
      zaloOaName: `Zalo OA ${shortName.trim() || name.trim()}`,
    });
    setName('');
    setShortName('');
  };

  const handleCreateHighway = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwName.trim()) return;
    onAddHighwayPreset({
      name: hwName.trim(),
      routeType: hwType,
      defaultDistanceKm: Number(hwKm) || 100,
      baseToll4To7Seats: Number(hwToll) || 0,
      description: 'Tuyến định mức tự động cấn trừ',
    });
    setHwName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="bg-white text-slate-900 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                Quản Trị Nhân Bản Hệ Thống (Multi-Tenant SaaS) & Định Mức Cao Tốc
              </h3>
              <p className="text-xs text-slate-500">
                Nhân bản phần mềm cho chi nhánh hoặc doanh nghiệp vận tải mới chỉ với 1 cú nhấp chuột
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

        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {/* Danh sách các Doanh nghiệp đã nhân bản */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900">
              Các đơn vị vận tải đang vận hành trên hệ thống ({tenants.length} bản)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tenants.map((t) => {
                const isActive = t.id === activeTenantId;
                return (
                  <div
                    key={t.id}
                    onClick={() => onSwitchTenant(t.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition flex items-start justify-between gap-3 ${
                      isActive
                        ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/20'
                        : 'bg-slate-50 border-slate-200 hover:border-blue-400'
                    }`}
                  >
                    <div className="space-y-1 text-xs">
                      <div className="font-extrabold text-sm text-slate-900">{t.name}</div>
                      <div className="text-slate-600">
                        MST: <strong>{t.taxCode}</strong> • Hotline: <strong>{t.hotline}</strong>
                      </div>
                      <div className="text-slate-600">TK đối soát: {t.bankInfo}</div>
                      <div className="text-blue-700 font-semibold">
                        Tự cấn trừ điều hành: {t.defaultDispatchFeePercent}% • Tự trừ phí Cao tốc: Bật
                      </div>
                    </div>
                    {isActive && (
                      <span className="px-2.5 py-1 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center gap-1 shrink-0">
                        <Check className="w-3 h-3" /> Đang chọn
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Nhân bản Doanh nghiệp mới */}
          <form
            onSubmit={handleClone}
            className="bg-indigo-50/70 rounded-xl p-4 border border-indigo-200 space-y-3"
          >
            <h4 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
              <CopyPlus className="w-4 h-4 text-indigo-600" />
              Nhân bản nhanh cho doanh nghiệp / nhà xe mới (1-Click SaaS Provisioning)
            </h4>
            <p className="text-xs text-indigo-800">
              Khi tạo bản nhân bản mới, hệ thống tự động khởi tạo bộ dữ liệu đội xe 4 chỗ/7 chỗ, định mức cao tốc và Bot AI riêng cho đơn vị đó.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tên Công ty / Nhà xe mới *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Công Ty Vận Tải Hoàng Gia"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên viết tắt</label>
                <input
                  type="text"
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  placeholder="Hoàng Gia Fleet"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  % Tự cấn trừ điều hành
                </label>
                <input
                  type="number"
                  value={feePercent}
                  onChange={(e) => setFeePercent(Number(e.target.value) || 10)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Tài khoản ngân hàng nhận tiền thực tế
                </label>
                <input
                  type="text"
                  value={bankInfo}
                  onChange={(e) => setBankInfo(e.target.value)}
                  placeholder="MB Bank - 8888999900 - CTY VT HOANG GIA"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition"
                >
                  + Nhân Bản Hệ Thống Mới
                </button>
              </div>
            </div>
          </form>

          {/* Cấu hình bảng phí tuyến Cao tốc & Quốc lộ */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-600" />
              Bảng định mức tuyến cao tốc (ETC) & Quốc Lộ Tự Cấn Trừ ({highwayPresets.length} tuyến)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
              {highwayPresets.map((hp) => (
                <div
                  key={hp.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-bold text-slate-900">{hp.name}</div>
                    <div className="text-xs text-slate-500">
                      Loại:{' '}
                      {hp.routeType === 'HIGHWAY'
                        ? 'Cao tốc'
                        : hp.routeType === 'NATIONAL_ROAD'
                        ? 'Quốc lộ'
                        : 'Kết hợp'}{' '}
                      • Cự ly chuẩn: {hp.defaultDistanceKm} km/chiều
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-blue-700">
                      {formatVND(hp.baseToll4To7Seats)}
                    </div>
                    <div className="text-xs text-slate-400">Phí 1 chiều (4-7 chỗ)</div>
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={handleCreateHighway}
              className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 pt-2 text-xs"
            >
              <input
                type="text"
                value={hwName}
                onChange={(e) => setHwName(e.target.value)}
                placeholder="Tên tuyến Cao tốc / Quốc lộ mới..."
                className="sm:col-span-2 rounded-lg border border-slate-300 px-3 py-2"
                required
              />
              <select
                value={hwType}
                onChange={(e) => setHwType(e.target.value as RouteType)}
                className="rounded-lg border border-slate-300 px-2.5 py-2 font-semibold"
              >
                <option value="HIGHWAY">Cao tốc</option>
                <option value="NATIONAL_ROAD">Quốc lộ</option>
                <option value="MIXED">Kết hợp</option>
              </select>
              <input
                type="number"
                step="5000"
                value={hwToll}
                onChange={(e) => setHwToll(Number(e.target.value) || 0)}
                placeholder="Phí trạm 1 chiều"
                className="rounded-lg border border-slate-300 px-3 py-2 font-bold"
              />
              <button
                type="submit"
                className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-3"
              >
                + Thêm Tuyến
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
