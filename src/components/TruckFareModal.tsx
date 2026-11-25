import React, { useState } from 'react';
import { X } from 'lucide-react';
import { SeatCategory, TRUCK_CLASSES, TruckFareConfig } from '../types/fleet';

interface TruckFareModalProps {
  value?: TruckFareConfig;
  canEdit: boolean;
  onSave: (cfg: TruckFareConfig) => void;
  onClose: () => void;
}

// Admin đặt giá cước xe tải giao hàng theo hạng xe; trang khách tính giá tạm từ đây
export const TruckFareModal: React.FC<TruckFareModalProps> = ({ value, canEdit, onSave, onClose }) => {
  const [rows, setRows] = useState(() =>
    TRUCK_CLASSES.map((c) => ({
      cls: c,
      perKm: String(value?.[c]?.perKm || ''),
      minFare: String(value?.[c]?.minFare || ''),
    }))
  );

  const setRow = (i: number, key: 'perKm' | 'minFare', v: string) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [key]: v } : r)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cfg: TruckFareConfig = {};
    rows.forEach((r) => {
      const perKm = Number(r.perKm) || 0;
      if (perKm > 0) cfg[r.cls as SeatCategory] = { perKm, minFare: Number(r.minFare) || 0 };
    });
    onSave(cfg);
  };

  const input = 'w-full h-10 rounded-xl border border-slate-300 px-3 text-sm disabled:bg-slate-50';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-start justify-center p-4 overflow-y-auto">
      <form onSubmit={handleSubmit} className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden my-auto">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold">Giá cước xe tải giao hàng</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3 text-sm">
          <p className="text-slate-500">
            Giá tạm tính cho khách = số km một chiều × đơn giá, không thấp hơn giá tối thiểu. Hạng xe để trống
            đơn giá thì trang khách hiện "LH Hotline".
          </p>
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 text-xs font-medium text-slate-600">
            <span>Hạng xe</span>
            <span>Đơn giá (đ/km)</span>
            <span>Tối thiểu (đ/chuyến)</span>
          </div>
          {rows.map((r, i) => (
            <div key={r.cls} className="grid grid-cols-[1fr_1fr_1fr] gap-2 items-center">
              <span className="font-medium text-slate-800">{r.cls}</span>
              <input type="number" min={0} step={500} value={r.perKm} onChange={(e) => setRow(i, 'perKm', e.target.value)} disabled={!canEdit} className={input} />
              <input type="number" min={0} step={10000} value={r.minFare} onChange={(e) => setRow(i, 'minFare', e.target.value)} disabled={!canEdit} className={input} />
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-full text-sm font-medium text-slate-700 hover:bg-slate-100">
            Đóng
          </button>
          {canEdit && (
            <button type="submit" className="h-10 px-5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
              Lưu giá cước
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
