import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Trip } from '../types/fleet';
import { formatVND } from '../utils/calculations';

export type ExpenseKind = 'PARKING' | 'TIRE' | 'FINE' | 'OTHER';

export const EXPENSE_LABELS: Record<ExpenseKind, string> = {
  PARKING: 'Đậu xe / bến bãi',
  TIRE: 'Vá lốp / sự cố xe',
  FINE: 'Phạt giao thông',
  OTHER: 'Chi phí khác (rửa xe, nước uống...)',
};

interface AddExpenseModalProps {
  trip: Trip | null;
  onClose: () => void;
  onSubmit: (tripId: string, kind: ExpenseKind, amount: number, note: string) => void;
}

// Tài xế / chủ xe chỉ được cộng thêm chi phí phát sinh, không sửa các khoản đã ghi nhận
export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ trip, onClose, onSubmit }) => {
  const [kind, setKind] = useState<ExpenseKind>('PARKING');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  if (!trip) return null;

  const recorded: [string, number][] = [
    [EXPENSE_LABELS.PARKING, Number(trip.parkingFee) || 0],
    [EXPENSE_LABELS.TIRE, Number(trip.otherRiskFee) || 0],
    [EXPENSE_LABELS.FINE, Number(trip.trafficFineFee) || 0],
    [EXPENSE_LABELS.OTHER, Number(trip.manualExpenseTotal) || 0],
  ];

  const inputCls = 'w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-3">
      <form
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        onSubmit={(e) => {
          e.preventDefault();
          const value = Number(amount);
          if (!(value > 0)) return;
          onSubmit(trip.id, kind, value, note.trim());
          setAmount('');
          setNote('');
          setKind('PARKING');
          onClose();
        }}
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold">Thêm chi phí phát sinh · #{trip.tripCode}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Loại chi phí</label>
            <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as ExpenseKind)}>
              {(Object.keys(EXPENSE_LABELS) as ExpenseKind[]).map((k) => (
                <option key={k} value={k}>
                  {EXPENSE_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Số tiền (đ) *</label>
            <input
              type="number"
              min="1"
              className={inputCls}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Ghi chú</label>
            <input
              className={inputCls}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Đậu xe bãi Vũng Tàu, vá lốp trước"
            />
          </div>

          <div className="rounded-xl bg-slate-50 p-3 space-y-1">
            <div className="text-xs font-medium text-slate-500">Đã ghi nhận trong chuyến</div>
            {recorded.map(([label, value]) => (
              <div key={label} className="flex justify-between text-xs text-slate-600">
                <span>{label}</span>
                <span className="font-medium">{formatVND(value)}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Khoản này được cộng thêm vào chuyến. Muốn sửa hoặc xóa khoản đã ghi, liên hệ điều hành.
          </p>
        </div>

        <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-full bg-slate-100 hover:bg-slate-200 text-sm font-medium"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="h-9 px-5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
          >
            Thêm chi phí
          </button>
        </div>
      </form>
    </div>
  );
};
