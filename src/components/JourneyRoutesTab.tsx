import React, { useState } from 'react';
import { ArrowRight, Edit3, MapPin, Plus, Trash2, X } from 'lucide-react';
import {
  HighwayPreset,
  JourneyPricing,
  JourneyRoute,
  JourneyService,
  RouteType,
} from '../types/fleet';
import { formatVND } from '../utils/calculations';
import { useConfirm } from './ConfirmDialog';
import { DEFAULT_BATTERY_RATE_PER_KM, EMPTY_PRICING, getJourneyPricing } from '../utils/journey';

interface JourneyRoutesTabProps {
  routes: JourneyRoute[];
  highwayPresets: HighwayPreset[];
  activeTenantId: string;
  canEdit: boolean;
  onSave: (route: Omit<JourneyRoute, 'id'>, existingId?: string) => void;
  onDelete: (id: string) => void;
}

const ROUTE_TYPE_LABELS: Record<RouteType, string> = {
  HIGHWAY: 'Cao tốc',
  NATIONAL_ROAD: 'Quốc lộ',
  MIXED: 'Cao tốc + quốc lộ',
};

const SERVICE_LABELS: Record<JourneyService, string> = {
  WITH_DRIVER: 'Thuê có tài xế',
  SELF_DRIVE: 'Thuê tự lái',
};

type DayType = 'NORMAL' | 'HOLIDAY';
type PricingForm = Record<keyof JourneyPricing, string>;
// DN: có tài xế thường, DH: có tài xế lễ, SN: tự lái thường, SH: tự lái lễ
type ProfileKey = 'DN' | 'DH' | 'SN' | 'SH';

type FormState = {
  pointA: string;
  pointB: string;
  routeType: RouteType;
  distanceKm: string;
  highwayName: string;
  nationalRoadName: string;
  note: string;
  pricing: Record<ProfileKey, PricingForm>;
};

const emptyPricingForm = (): PricingForm => ({
  pricePerDay: '',
  batteryRatePerKm: '',
  priceOneWay: '',
  priceRoundTrip: '',
  tollOneWay: '',
  tollRoundTrip: '',
  nationalTollOneWay: '',
  nationalTollRoundTrip: '',
  driverPayOneWay: '',
  driverPayRoundTrip: '',
  hotelPerNight: '',
});

const toForm = (p?: JourneyPricing): PricingForm => {
  const f = emptyPricingForm();
  if (!p) return f;
  (Object.keys(f) as (keyof JourneyPricing)[]).forEach((k) => {
    f[k] = p[k] ? String(p[k]) : '';
  });
  return f;
};

const toPricing = (f: PricingForm): JourneyPricing => {
  const out = { ...EMPTY_PRICING };
  (Object.keys(out) as (keyof JourneyPricing)[]).forEach((k) => {
    out[k] = Number(f[k]) || 0;
  });
  return out;
};

const isEmptyPricing = (p: JourneyPricing) => Object.values(p).every((v) => !v);

const emptyForm = (): FormState => ({
  pointA: '',
  pointB: '',
  routeType: 'HIGHWAY',
  distanceKm: '',
  highwayName: '',
  nationalRoadName: '',
  note: '',
  pricing: { DN: emptyPricingForm(), DH: emptyPricingForm(), SN: emptyPricingForm(), SH: emptyPricingForm() },
});

const DayToggle: React.FC<{ value: DayType; onChange: (v: DayType) => void }> = ({
  value,
  onChange,
}) => (
  <div className="inline-flex rounded-full bg-slate-100 p-0.5 shrink-0">
    {(['NORMAL', 'HOLIDAY'] as DayType[]).map((d) => (
      <button
        key={d}
        type="button"
        onClick={() => onChange(d)}
        className={`px-3 h-7 rounded-full text-xs font-medium transition ${
          value === d
            ? d === 'NORMAL'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-emerald-600 text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        {d === 'NORMAL' ? 'Ngày thường' : 'Ngày lễ'}
      </button>
    ))}
  </div>
);

const Cell: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="bg-white px-3 py-2">
    <div className="text-xs text-slate-500">{label}</div>
    <div className="font-semibold">{formatVND(value)}</div>
  </div>
);

const RouteCard: React.FC<{
  route: JourneyRoute;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ route: r, canEdit, onEdit, onDelete }) => {
  const [day, setDay] = useState<DayType>('NORMAL');
  const holiday = day === 'HOLIDAY';
  const drv = getJourneyPricing(r, 'WITH_DRIVER', holiday);
  const self = getJourneyPricing(r, 'SELF_DRIVE', holiday);
  const hwLabel = r.highwayName ? `Cao tốc ${r.highwayName}` : 'Cao tốc';
  const nrLabel = r.nationalRoadName ? `Quốc lộ ${r.nationalRoadName}` : 'Quốc lộ';
  const holidayMissing = holiday && !r.holidayWithDriver && !r.selfDriveHoliday;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="truncate">{r.pointA}</span>
            <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{r.pointB}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
              {ROUTE_TYPE_LABELS[r.routeType]}
            </span>
            <span>{r.distanceKm} km một chiều</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <DayToggle value={day} onChange={setDay} />
          {canEdit && (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 transition"
                title="Sửa hành trình"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition"
                title="Xóa hành trình"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {holidayMissing && (
        <p className="text-xs text-amber-600">
          Chưa cấu hình giá ngày lễ, hệ thống đang dùng giá ngày thường.
        </p>
      )}

      <div>
        <span className="inline-block mb-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
          {SERVICE_LABELS.WITH_DRIVER}
        </span>
        <div className="grid grid-cols-2 gap-px rounded-xl overflow-hidden bg-slate-200 text-sm">
          <Cell label="Giá một chiều" value={drv.priceOneWay} />
          <Cell label="Giá khứ hồi" value={drv.priceRoundTrip} />
          <Cell label={`${hwLabel} một chiều`} value={drv.tollOneWay} />
          <Cell label={`${hwLabel} khứ hồi`} value={drv.tollRoundTrip} />
          <Cell label={`${nrLabel} một chiều`} value={drv.nationalTollOneWay || 0} />
          <Cell label={`${nrLabel} khứ hồi`} value={drv.nationalTollRoundTrip || 0} />
          <Cell label="Tài xế một chiều" value={drv.driverPayOneWay} />
          <Cell label="Tài xế khứ hồi" value={drv.driverPayRoundTrip} />
        </div>
        {!!drv.hotelPerNight && (
          <p className="text-xs text-slate-500 mt-1">
            Khách sạn: {formatVND(drv.hotelPerNight)} mỗi đêm
          </p>
        )}
      </div>

      <div>
        <span className="inline-block mb-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
          {SERVICE_LABELS.SELF_DRIVE}
        </span>
        <div className="grid grid-cols-2 gap-px rounded-xl overflow-hidden bg-slate-200 text-sm">
          <div className="col-span-2">
            <Cell label="Giá thuê mỗi ngày" value={self.pricePerDay || 0} />
          </div>
          <Cell label={`${hwLabel} một chiều`} value={self.tollOneWay} />
          <Cell label={`${hwLabel} khứ hồi`} value={self.tollRoundTrip} />
          <Cell label={`${nrLabel} một chiều`} value={self.nationalTollOneWay || 0} />
          <Cell label={`${nrLabel} khứ hồi`} value={self.nationalTollRoundTrip || 0} />
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Xe điện thu pin {formatVND(self.batteryRatePerKm || DEFAULT_BATTERY_RATE_PER_KM)}/km theo km
          thực tế. Xăng, dầu khách tự đổ.
        </p>
      </div>

      {r.note && <p className="text-xs text-slate-500">{r.note}</p>}
    </div>
  );
};

export const JourneyRoutesTab: React.FC<JourneyRoutesTabProps> = ({
  routes,
  highwayPresets,
  activeTenantId,
  canEdit,
  onSave,
  onDelete,
}) => {
  const confirm = useConfirm();
  const [form, setForm] = useState<FormState | null>(null);
  const [formDay, setFormDay] = useState<DayType>('NORMAL');
  const [editingId, setEditingId] = useState<string | undefined>();

  const openNew = () => {
    setEditingId(undefined);
    setFormDay('NORMAL');
    setForm(emptyForm());
  };

  const openEdit = (r: JourneyRoute) => {
    setEditingId(r.id);
    setFormDay('NORMAL');
    setForm({
      pointA: r.pointA,
      pointB: r.pointB,
      routeType: r.routeType,
      distanceKm: String(r.distanceKm || ''),
      highwayName: r.highwayName || '',
      nationalRoadName: r.nationalRoadName || '',
      note: r.note || '',
      pricing: {
        DN: toForm(getJourneyPricing(r, 'WITH_DRIVER', false)),
        DH: toForm(r.holidayWithDriver),
        SN: toForm(r.selfDriveNormal),
        SH: toForm(r.selfDriveHoliday),
      },
    });
  };

  const setField = (
    key: 'pointA' | 'pointB' | 'distanceKm' | 'note' | 'highwayName' | 'nationalRoadName', value: string) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const setPricing = (profile: ProfileKey, key: keyof JourneyPricing, value: string) =>
    setForm((prev) =>
      prev
        ? { ...prev, pricing: { ...prev.pricing, [profile]: { ...prev.pricing[profile], [key]: value } } }
        : prev
    );

  const highwayOptions = highwayPresets.filter((p) => p.routeType !== 'NATIONAL_ROAD');
  const nationalOptions = highwayPresets.filter((p) => p.routeType !== 'HIGHWAY');

  // Gõ tay hoặc chọn từ kho ETC; chọn đúng một tuyến trong kho thì tự điền cước một chiều / khứ hồi.
  const setRoadName = (kind: 'highway' | 'national', name: string) =>
    setForm((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [kind === 'highway' ? 'highwayName' : 'nationalRoadName']: name };
      const preset = (kind === 'highway' ? highwayOptions : nationalOptions).find(
        (p) => p.name === name
      );
      if (!preset) return next;
      const keys: [keyof JourneyPricing, keyof JourneyPricing] =
        kind === 'highway'
          ? ['tollOneWay', 'tollRoundTrip']
          : ['nationalTollOneWay', 'nationalTollRoundTrip'];
      const oneWay = String(preset.baseToll4To7Seats || '');
      const roundTrip = String(preset.baseToll4To7Seats * 2 || '');
      const pricing = { ...prev.pricing };
      (['DN', 'SN', 'DH', 'SH'] as ProfileKey[]).forEach((pk) => {
        // Bảng ngày lễ đang để trống thì giữ trống (hệ thống sẽ dùng giá ngày thường)
        const isHoliday = pk === 'DH' || pk === 'SH';
        if (isHoliday && isEmptyPricing(toPricing(prev.pricing[pk]))) return;
        pricing[pk] = { ...prev.pricing[pk], [keys[0]]: oneWay, [keys[1]]: roundTrip };
      });
      return { ...next, pricing };
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const dn = toPricing(form.pricing.DN);
    const dh = toPricing(form.pricing.DH);
    const sn = toPricing(form.pricing.SN);
    const sh = toPricing(form.pricing.SH);
    onSave(
      {
        tenantId: activeTenantId,
        pointA: form.pointA.trim(),
        pointB: form.pointB.trim(),
        routeType: form.routeType,
        distanceKm: Number(form.distanceKm) || 0,
        highwayName: form.highwayName.trim() || undefined,
        nationalRoadName: form.nationalRoadName.trim() || undefined,
        priceOneWay: dn.priceOneWay,
        priceRoundTrip: dn.priceRoundTrip,
        tollOneWay: dn.tollOneWay,
        tollRoundTrip: dn.tollRoundTrip,
        nationalTollOneWay: dn.nationalTollOneWay,
        nationalTollRoundTrip: dn.nationalTollRoundTrip,
        driverPayOneWay: dn.driverPayOneWay,
        driverPayRoundTrip: dn.driverPayRoundTrip,
        hotelPerNight: dn.hotelPerNight,
        holidayWithDriver: isEmptyPricing(dh) ? undefined : dh,
        selfDriveNormal: isEmptyPricing(sn) ? undefined : sn,
        selfDriveHoliday: isEmptyPricing(sh) ? undefined : sh,
        note: form.note.trim() || undefined,
      },
      editingId
    );
    setForm(null);
  };

  const inputCls =
    'w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900';

  const numField = (profile: ProfileKey, key: keyof JourneyPricing, label: string) => (
    <div key={`${profile}-${key}`}>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        type="number"
        min="0"
        className={inputCls}
        value={form ? form.pricing[profile][key] : ''}
        onChange={(e) => setPricing(profile, key, e.target.value)}
      />
    </div>
  );

  const hwLabel = form?.highwayName.trim() ? `cao tốc ${form.highwayName.trim()}` : 'cao tốc';
  const nrLabel = form?.nationalRoadName.trim() ? `quốc lộ ${form.nationalRoadName.trim()}` : 'quốc lộ';
  const driverProfile: ProfileKey = formDay === 'NORMAL' ? 'DN' : 'DH';
  const selfProfile: ProfileKey = formDay === 'NORMAL' ? 'SN' : 'SH';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Hành trình chuyến</h2>
          <p className="text-sm text-slate-500">
            Cấu hình điểm A – B, giá cước và tiền tài xế theo từng chặng, riêng cho thuê có tài xế,
            thuê tự lái, ngày thường và ngày lễ. Khi đặt lịch có thể chọn hành trình mẫu rồi sửa tay
            lại bất kỳ số nào.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" />
            Thêm hành trình
          </button>
        )}
      </div>

      {routes.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm py-16 px-4 text-center text-sm text-slate-500">
          Chưa có hành trình nào.{canEdit ? ' Bấm "Thêm hành trình" để tạo chặng đầu tiên.' : ''}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {routes.map((r) => (
            <RouteCard
              key={r.id}
              route={r}
              canEdit={canEdit}
              onEdit={() => openEdit(r)}
              onDelete={async () => {
                const ok = await confirm({
                  title: `Xóa hành trình ${r.pointA} → ${r.pointB}?`,
                  message: 'Các chuyến đã đặt không bị ảnh hưởng.',
                  confirmLabel: 'Xóa hành trình',
                  tone: 'danger',
                });
                if (ok) onDelete(r.id);
              }}
            />
          ))}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-3 overflow-y-auto">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden my-auto"
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold">{editingId ? 'Sửa hành trình' : 'Thêm hành trình'}</h3>
              <button
                type="button"
                onClick={() => setForm(null)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Điểm A *</label>
                  <input
                    className={inputCls}
                    value={form.pointA}
                    onChange={(e) => setField('pointA', e.target.value)}
                    placeholder="TP.HCM"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Điểm B *</label>
                  <input
                    className={inputCls}
                    value={form.pointB}
                    onChange={(e) => setField('pointB', e.target.value)}
                    placeholder="Phan Thiết"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Loại đường</label>
                  <select
                    className={inputCls}
                    value={form.routeType}
                    onChange={(e) =>
                      setForm((prev) =>
                        prev ? { ...prev, routeType: e.target.value as RouteType } : prev
                      )
                    }
                  >
                    {(Object.keys(ROUTE_TYPE_LABELS) as RouteType[]).map((t) => (
                      <option key={t} value={t}>
                        {ROUTE_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Quãng đường 1 chiều (km)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className={inputCls}
                    value={form.distanceKm}
                    onChange={(e) => setField('distanceKm', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Tên cao tốc / trạm cao tốc
                  </label>
                  <input
                    className={inputCls}
                    list="etc-highway-options"
                    value={form.highwayName}
                    onChange={(e) => setRoadName('highway', e.target.value)}
                    placeholder={
                      highwayOptions.length ? 'Chọn từ kho ETC hoặc gõ tay' : 'VD: Long Thành - Dầu Giây'
                    }
                  />
                  <datalist id="etc-highway-options">
                    {highwayOptions.map((p) => (
                      <option key={p.id} value={p.name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Tên quốc lộ / trạm quốc lộ
                  </label>
                  <input
                    className={inputCls}
                    list="etc-national-options"
                    value={form.nationalRoadName}
                    onChange={(e) => setRoadName('national', e.target.value)}
                    placeholder={
                      nationalOptions.length ? 'Chọn từ kho ETC hoặc gõ tay' : 'VD: QL1A - Trạm BOT Biên Hòa'
                    }
                  />
                  <datalist id="etc-national-options">
                    {nationalOptions.map((p) => (
                      <option key={p.id} value={p.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <span className="text-xs font-medium text-slate-500">Bảng giá đang chỉnh</span>
                <DayToggle value={formDay} onChange={setFormDay} />
              </div>
              {formDay === 'HOLIDAY' && (
                <p className="text-xs text-slate-500">
                  Để trống toàn bộ mục ngày lễ thì hệ thống dùng giá ngày thường.
                </p>
              )}

              <div className="space-y-3">
                <div className="text-sm font-semibold text-blue-700">{SERVICE_LABELS.WITH_DRIVER}</div>
                <div className="grid grid-cols-2 gap-3">
                  {numField(driverProfile, 'priceOneWay', 'Giá cước một chiều (đ)')}
                  {numField(driverProfile, 'priceRoundTrip', 'Giá cước khứ hồi (đ)')}
                  {numField(driverProfile, 'tollOneWay', `Cước ${hwLabel} một chiều (đ)`)}
                  {numField(driverProfile, 'tollRoundTrip', `Cước ${hwLabel} khứ hồi (đ)`)}
                  {numField(driverProfile, 'nationalTollOneWay', `Cước ${nrLabel} một chiều (đ)`)}
                  {numField(driverProfile, 'nationalTollRoundTrip', `Cước ${nrLabel} khứ hồi (đ)`)}
                  {numField(driverProfile, 'driverPayOneWay', 'Tiền tài xế một chiều (đ)')}
                  {numField(driverProfile, 'driverPayRoundTrip', 'Tiền tài xế khứ hồi (đ)')}
                </div>
                {numField(
                  driverProfile,
                  'hotelPerNight',
                  'Tiền khách sạn mỗi đêm (đ), chuyến từ 2 ngày'
                )}
              </div>

              <div className="space-y-3 border-t border-slate-100">
                <div className="text-sm font-semibold text-emerald-700 pt-3">{SERVICE_LABELS.SELF_DRIVE}</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    {numField(selfProfile, 'pricePerDay', 'Giá thuê mỗi ngày (đ)')}
                  </div>
                  {numField(selfProfile, 'tollOneWay', `Cước ${hwLabel} một chiều (đ)`)}
                  {numField(selfProfile, 'tollRoundTrip', `Cước ${hwLabel} khứ hồi (đ)`)}
                  {numField(selfProfile, 'nationalTollOneWay', `Cước ${nrLabel} một chiều (đ)`)}
                  {numField(selfProfile, 'nationalTollRoundTrip', `Cước ${nrLabel} khứ hồi (đ)`)}
                  <div className="col-span-2">
                    {numField(selfProfile, 'batteryRatePerKm', 'Đơn giá pin xe điện (đ/km), để trống = 1.500')}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Ghi chú</label>
                <input
                  className={inputCls}
                  value={form.note}
                  onChange={(e) => setField('note', e.target.value)}
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="h-9 px-4 rounded-full bg-slate-100 hover:bg-slate-200 text-sm font-medium"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="h-9 px-5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
              >
                Lưu
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
