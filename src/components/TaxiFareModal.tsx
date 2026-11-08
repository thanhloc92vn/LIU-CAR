import React, { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { TaxiFareConfig } from '../types/fleet';
import { resolveTaxiFare } from '../utils/taxiFare';

interface TaxiFareModalProps {
  value?: TaxiFareConfig;
  canEdit: boolean;
  onSave: (cfg: TaxiFareConfig) => void;
  onClose: () => void;
}

// Admin đặt giá cước taxi (xe có tài xế) theo km và các đợt lễ cộng phụ thu; trang khách tính giá từ đây
export const TaxiFareModal: React.FC<TaxiFareModalProps> = ({ value, canEdit, onSave, onClose }) => {
  const init = resolveTaxiFare(value);
  const [perKm45, setPerKm45] = useState(String(init.perKm4To5Seats));
  const [perKm7, setPerKm7] = useState(String(init.perKm7Seats));
  const [surcharge, setSurcharge] = useState(String(init.holidaySurchargePerKm));
  const [holidays, setHolidays] = useState(init.holidays);

  const setHoliday = (i: number, key: 'from' | 'to', v: string) =>
    setHolidays((hs) => hs.map((h, j) => (j === i ? { ...h, [key]: v } : h)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      perKm4To5Seats: Number(perKm45) || 0,
      perKm7Seats: Number(perKm7) || 0,
      holidaySurchargePerKm: Number(surcharge) || 0,
      holidays: holidays
        .filter((h) => h.from)
        .map((h) => ({ from: h.from, to: h.to && h.to >= h.from ? h.to : h.from })),
    });
  };

  const input = 'w-full h-10 rounded-xl border border-slate-300 px-3 text-sm disabled:bg-slate-50';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-start justify-center p-4 overflow-y-auto">
      <form onSubmit={handleSubmit} className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden my-auto">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold">Giá cước taxi (xe có tài xế)</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-sm">
          <p className="text-slate-500">
            Trang khách tính giá xe có tài xế = số km một chiều × đơn giá. Xe 9 chỗ, 16 chỗ chưa có giá
            taxi nên vẫn hiện "LH Hotline".
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="space-y-1">
              <span className="block font-medium text-slate-700">Xe 4–5 chỗ (đ/km)</span>
              <input type="number" min={0} step={500} value={perKm45} onChange={(e) => setPerKm45(e.target.value)} disabled={!canEdit} className={input} />
            </label>
            <label className="space-y-1">
              <span className="block font-medium text-slate-700">Xe 7 chỗ (đ/km)</span>
              <input type="number" min={0} step={500} value={perKm7} onChange={(e) => setPerKm7(e.target.value)} disabled={!canEdit} className={input} />
            </label>
            <label className="space-y-1">
              <span className="block font-medium text-slate-700">Ngày lễ cộng (đ/km)</span>
              <input type="number" min={0} step={500} value={surcharge} onChange={(e) => setSurcharge(e.target.value)} disabled={!canEdit} className={input} />
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700">Các đợt lễ trong năm</span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setHolidays((hs) => [...hs, { from: '', to: '' }])}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm đợt lễ
                </button>
              )}
            </div>
            {holidays.length === 0 && (
              <p className="text-xs text-slate-500">Chưa có đợt lễ nào, mọi ngày tính giá thường.</p>
            )}
            {holidays.map((h, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="date" value={h.from} onChange={(e) => setHoliday(i, 'from', e.target.value)} disabled={!canEdit} className={input} required />
                <span className="text-slate-400">→</span>
                <input type="date" value={h.to} min={h.from} onChange={(e) => setHoliday(i, 'to', e.target.value)} disabled={!canEdit} className={input} />
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setHolidays((hs) => hs.filter((_, j) => j !== i))}
                    aria-label="Xóa đợt lễ"
                    className="w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <p className="text-xs text-slate-500">Bỏ trống ngày kết thúc nếu lễ chỉ có 1 ngày.</p>
          </div>
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
