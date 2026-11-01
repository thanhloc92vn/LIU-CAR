import React, { useState } from 'react';
import { Navigation, Pencil, Trash2, X } from 'lucide-react';
import { HighwayPreset, RouteType } from '../types/fleet';
import { formatVND } from '../utils/calculations';

interface MultiTenantSaaSModalProps {
  isOpen: boolean;
  onClose: () => void;
  highwayPresets: HighwayPreset[];
  onAddHighwayPreset: (preset: Omit<HighwayPreset, 'id'>) => void;
  onUpdateHighwayPreset: (preset: HighwayPreset) => void;
  onDeleteHighwayPreset: (preset: HighwayPreset) => void;
}

const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs';

export const MultiTenantSaaSModal: React.FC<MultiTenantSaaSModalProps> = ({
  isOpen,
  onClose,
  highwayPresets,
  onAddHighwayPreset,
  onUpdateHighwayPreset,
  onDeleteHighwayPreset,
}) => {
  const [editPreset, setEditPreset] = useState<HighwayPreset | null>(null);

  // Add Highway Preset
  const [hwName, setHwName] = useState('');
  const [hwType, setHwType] = useState<RouteType>('HIGHWAY');
  const [hwKm, setHwKm] = useState(120);
  const [hwToll, setHwToll] = useState(160000);

  if (!isOpen) return null;

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
              <Navigation className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-bold">Bảng định mức tuyến cao tốc (ETC)</h3>
              <p className="text-xs text-slate-500">
                Phí cao tốc & quốc lộ hệ thống tự cấn trừ khi chọn tuyến ({highwayPresets.length} tuyến)
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

        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
            {highwayPresets.map((hp) =>
              editPreset?.id === hp.id ? (
                <div
                  key={hp.id}
                  className="p-3 rounded-xl border border-blue-600 bg-white space-y-2"
                >
                  <input
                    className={inputCls}
                    value={editPreset.name}
                    onChange={(e) => setEditPreset({ ...editPreset, name: e.target.value })}
                    placeholder="Tên tuyến"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      className={inputCls}
                      value={editPreset.routeType}
                      onChange={(e) =>
                        setEditPreset({ ...editPreset, routeType: e.target.value as RouteType })
                      }
                    >
                      <option value="HIGHWAY">Cao tốc</option>
                      <option value="NATIONAL_ROAD">Quốc lộ</option>
                      <option value="MIXED">Kết hợp</option>
                    </select>
                    <input
                      type="number"
                      className={inputCls}
                      value={editPreset.defaultDistanceKm}
                      onChange={(e) =>
                        setEditPreset({
                          ...editPreset,
                          defaultDistanceKm: Number(e.target.value) || 0,
                        })
                      }
                      placeholder="Km"
                    />
                    <input
                      type="number"
                      step="5000"
                      className={inputCls}
                      value={editPreset.baseToll4To7Seats}
                      onChange={(e) =>
                        setEditPreset({
                          ...editPreset,
                          baseToll4To7Seats: Number(e.target.value) || 0,
                        })
                      }
                      placeholder="Phí 1 chiều"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditPreset(null)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 font-semibold"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      disabled={!editPreset.name.trim()}
                      onClick={() => {
                        onUpdateHighwayPreset({ ...editPreset, name: editPreset.name.trim() });
                        setEditPreset(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold disabled:opacity-50"
                    >
                      Lưu
                    </button>
                  </div>
                </div>
              ) : (
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
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      title="Sửa"
                      onClick={() => setEditPreset(hp)}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-blue-600"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="Xóa"
                      onClick={() => onDeleteHighwayPreset(hp)}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            )}
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
  );
};
