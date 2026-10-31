import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Calendar,
  Car,
  CheckCircle2,
  Coins,
  FileWarning,
  MapPin,
  Navigation,
  ParkingCircle,
  Plus,
  Send,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  Driver,
  HighwayPreset,
  RouteType,
  SeatCategory,
  TenantConfig,
  Trip,
  Vehicle,
} from '../types/fleet';
import { calculateTripFinancials, formatVND } from '../utils/calculations';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tripData: Omit<Trip, 'id' | 'createdAt'>, existingId?: string) => void;
  vehicles: Vehicle[];
  drivers: Driver[];
  highwayPresets: HighwayPreset[];
  activeTenant: TenantConfig;
  editingTrip?: Trip | null;
}

const SEAT_FILTERS: ('ALL' | SeatCategory)[] = [
  'ALL',
  '4 chỗ',
  '5 chỗ',
  '7 chỗ',
  '9 chỗ Limousine',
  '16 chỗ',
  '29 chỗ',
];

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  onSave,
  vehicles,
  drivers,
  highwayPresets,
  activeTenant,
  editingTrip,
}) => {
  const [seatFilter, setSeatFilter] = useState<'ALL' | SeatCategory>('ALL');
  const [bookingType, setBookingType] = useState<'WITH_DRIVER' | 'SELF_DRIVE'>('WITH_DRIVER');
  const [vehicleId, setVehicleId] = useState<string>(vehicles[0]?.id || '');
  const [driverId, setDriverId] = useState<string>(drivers[0]?.id || '');
  const [taggedDriverIds, setTaggedDriverIds] = useState<string[]>(
    drivers[0] ? [drivers[0].id] : []
  );

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCccd, setCustomerCccd] = useState('');
  const [customerLicense, setCustomerLicense] = useState('');

  const [tripDate, setTripDate] = useState('2026-10-31');
  const [departureTime, setDepartureTime] = useState('07:30');
  const [returnTime, setReturnTime] = useState('19:30');
  const [pickupLocation, setPickupLocation] = useState('TP.HCM');
  const [dropoffLocation, setDropoffLocation] = useState('');

  const [routeType, setRouteType] = useState<RouteType>('HIGHWAY');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(highwayPresets[0]?.id || '');
  const [routeDetail, setRouteDetail] = useState<string>(highwayPresets[0]?.name || '');
  const [distanceKm, setDistanceKm] = useState<number>(185);
  const [isRoundTrip, setIsRoundTrip] = useState<boolean>(true);

  // Financials
  const [baseFareRevenue, setBaseFareRevenue] = useState<number>(2800000);
  const [surchargeRevenue, setSurchargeRevenue] = useState<number>(0);
  const [paymentCollectedBy, setPaymentCollectedBy] = useState<'COMPANY_BANK' | 'DRIVER_CASH'>(
    'COMPANY_BANK'
  );

  const [autoHighwayToll, setAutoHighwayToll] = useState<number>(430000);
  const [autoFuelQuota, setAutoFuelQuota] = useState<number>(407000);
  const [autoDispatchFee, setAutoDispatchFee] = useState<number>(280000);

  const [manualExpenseTotal, setManualExpenseTotal] = useState<number>(0);
  const [manualExpenseNote, setManualExpenseNote] = useState<string>('');

  const [parkingFee, setParkingFee] = useState<number>(0);
  const [parkingNote, setParkingNote] = useState<string>('');
  const [trafficFineFee, setTrafficFineFee] = useState<number>(0);
  const [trafficFineNote, setTrafficFineNote] = useState<string>('');
  const [otherRiskFee, setOtherRiskFee] = useState<number>(0);
  const [otherRiskNote, setOtherRiskNote] = useState<string>('');

  const [status, setStatus] = useState<Trip['status']>('PENDING_CONFIRM');
  const [botChannel, setBotChannel] = useState<Trip['botChannel']>('BOTH');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (editingTrip) {
      setBookingType(editingTrip.bookingType);
      setVehicleId(editingTrip.vehicleId);
      setDriverId(editingTrip.driverId);
      setTaggedDriverIds(editingTrip.taggedDriverIds || [editingTrip.driverId]);
      setCustomerName(editingTrip.customerName);
      setCustomerPhone(editingTrip.customerPhone);
      setCustomerCccd(editingTrip.customerCccd || '');
      setCustomerLicense(editingTrip.customerLicense || '');
      setTripDate(editingTrip.tripDate);
      setDepartureTime(editingTrip.departureTime);
      setReturnTime(editingTrip.returnTime);
      setPickupLocation(editingTrip.pickupLocation);
      setDropoffLocation(editingTrip.dropoffLocation);
      setRouteType(editingTrip.routeType);
      setRouteDetail(editingTrip.routeDetail);
      setDistanceKm(editingTrip.distanceKm);
      setIsRoundTrip(editingTrip.isRoundTrip);
      setBaseFareRevenue(editingTrip.baseFareRevenue);
      setSurchargeRevenue(editingTrip.surchargeRevenue);
      setPaymentCollectedBy(editingTrip.paymentCollectedBy);
      setAutoHighwayToll(editingTrip.autoHighwayToll);
      setAutoFuelQuota(editingTrip.autoFuelQuota);
      setAutoDispatchFee(editingTrip.autoDispatchFee);
      setManualExpenseTotal(editingTrip.manualExpenseTotal);
      setManualExpenseNote(editingTrip.manualExpenseNote);
      setParkingFee(editingTrip.parkingFee);
      setParkingNote(editingTrip.parkingNote);
      setTrafficFineFee(editingTrip.trafficFineFee);
      setTrafficFineNote(editingTrip.trafficFineNote);
      setOtherRiskFee(editingTrip.otherRiskFee);
      setOtherRiskNote(editingTrip.otherRiskNote);
      setStatus(editingTrip.status);
      setBotChannel(editingTrip.botChannel);
      setNotes(editingTrip.notes || '');
    } else {
      setBookingType('WITH_DRIVER');
      setVehicleId(vehicles[0]?.id || '');
      setDriverId(drivers[0]?.id || '');
      setTaggedDriverIds(drivers[0] ? [drivers[0].id] : []);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerCccd('');
      setCustomerLicense('');
      setTripDate('2026-10-31');
      setDepartureTime('07:30');
      setReturnTime('19:30');
      setPickupLocation('TP.HCM');
      setDropoffLocation('Phan Thiết / Vũng Tàu');
      setRouteType('HIGHWAY');
      const preset = highwayPresets[0];
      if (preset) {
        setSelectedPresetId(preset.id);
        setRouteDetail(preset.name);
        setDistanceKm(preset.defaultDistanceKm * 2);
      }
      setIsRoundTrip(true);
      setBaseFareRevenue(2800000);
      setSurchargeRevenue(0);
      setPaymentCollectedBy('COMPANY_BANK');
      setManualExpenseTotal(0);
      setManualExpenseNote('');
      setParkingFee(0);
      setParkingNote('');
      setTrafficFineFee(0);
      setTrafficFineNote('');
      setOtherRiskFee(0);
      setOtherRiskNote('');
      setStatus('PENDING_CONFIRM');
      setBotChannel('BOTH');
      setNotes('');
    }
  }, [editingTrip, isOpen]);

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId) || vehicles[0];

  // Auto recalculate auto-deducted costs when route/vehicle/distance/fare changes (if not manually overridden during edit)
  const recalculateAutoDeductions = (
    targetRouteType: RouteType,
    presetId: string,
    km: number,
    roundTrip: boolean,
    veh: Vehicle | undefined,
    fare: number,
    surcharge: number,
    bType: 'WITH_DRIVER' | 'SELF_DRIVE'
  ) => {
    const preset = highwayPresets.find((p) => p.id === presetId);
    const multiplier = veh?.highwayTollMultiplier || 1.0;
    const tripWayFactor = roundTrip ? 2 : 1;

    let toll = 0;
    if (targetRouteType === 'HIGHWAY' || targetRouteType === 'MIXED') {
      const baseToll = preset ? preset.baseToll4To7Seats : 150000;
      toll = Math.round(baseToll * multiplier * tripWayFactor);
    } else {
      toll = preset ? Math.round(preset.baseToll4To7Seats * tripWayFactor) : 0;
    }

    const fuelQuota =
      bType === 'SELF_DRIVE'
        ? 0
        : activeTenant.autoFuelDeductionEnabled
        ? Math.round(km * (veh?.fuelCostPerKm || 2000))
        : 0;

    const totalRev = (Number(fare) || 0) + (Number(surcharge) || 0);
    const dispatchFee = Math.round(
      (totalRev * (activeTenant.defaultDispatchFeePercent || 10)) / 100
    );

    setAutoHighwayToll(toll);
    setAutoFuelQuota(fuelQuota);
    setAutoDispatchFee(dispatchFee);
  };

  if (!isOpen) return null;

  const filteredVehicles =
    seatFilter === 'ALL'
      ? vehicles
      : vehicles.filter((v) => v.seatCategory === seatFilter);

  const previewTrip: Trip = {
    id: 'PREVIEW',
    tenantId: activeTenant.id,
    tripCode: editingTrip?.tripCode || 'NEW',
    bookingType,
    vehicleId,
    driverId,
    taggedDriverIds,
    customerName,
    customerPhone,
    tripDate,
    departureTime,
    returnTime,
    pickupLocation,
    dropoffLocation,
    routeType,
    routeDetail,
    distanceKm,
    isRoundTrip,
    baseFareRevenue,
    surchargeRevenue,
    paymentCollectedBy,
    autoHighwayToll,
    autoFuelQuota,
    autoDispatchFee,
    manualExpenseTotal,
    manualExpenseNote,
    parkingFee,
    parkingNote,
    trafficFineFee,
    trafficFineNote,
    otherRiskFee,
    otherRiskNote,
    status,
    botChannel,
    createdAt: '',
  };

  const liveBreakdown = calculateTripFinancials(previewTrip);

  const handleToggleTagDriver = (id: string) => {
    setTaggedDriverIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ensuredTagged = taggedDriverIds.includes(driverId)
      ? taggedDriverIds
      : [driverId, ...taggedDriverIds];

    onSave(
      {
        tenantId: activeTenant.id,
        tripCode:
          editingTrip?.tripCode ||
          `MP-${tripDate.slice(2, 4)}${tripDate.slice(5, 7)}-${String(
            Math.floor(100 + Math.random() * 900)
          )}`,
        bookingType,
        vehicleId,
        driverId,
        taggedDriverIds: ensuredTagged,
        customerName: customerName.trim() || 'Khách đặt lịch',
        customerPhone: customerPhone.trim() || '0909000111',
        customerCccd: customerCccd.trim() || undefined,
        customerLicense: customerLicense.trim() || undefined,
        tripDate,
        departureTime,
        returnTime,
        pickupLocation,
        dropoffLocation: dropoffLocation.trim() || 'Theo lộ trình',
        routeType,
        routeDetail,
        distanceKm: Number(distanceKm) || 0,
        isRoundTrip,
        baseFareRevenue: Number(baseFareRevenue) || 0,
        surchargeRevenue: Number(surchargeRevenue) || 0,
        paymentCollectedBy,
        autoHighwayToll: Number(autoHighwayToll) || 0,
        autoFuelQuota: Number(autoFuelQuota) || 0,
        autoDispatchFee: Number(autoDispatchFee) || 0,
        manualExpenseTotal: Number(manualExpenseTotal) || 0,
        manualExpenseNote,
        parkingFee: Number(parkingFee) || 0,
        parkingNote,
        trafficFineFee: Number(trafficFineFee) || 0,
        trafficFineNote,
        otherRiskFee: Number(otherRiskFee) || 0,
        otherRiskNote,
        status,
        botChannel,
        notes,
      },
      editingTrip?.id
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {editingTrip
                  ? `Cập Nhật Lịch & Đối Soát Chuyến #${editingTrip.tripCode}`
                  : 'Tạo Lịch Đặt Xe Mới & Điều Phối Tài Xế (AI Bot)'}
              </h2>
              <p className="text-xs text-blue-200">
                Chọn loại ghế (4 chỗ, 7 chỗ...), tuyến Cao tốc / Quốc lộ, tự động cấn trừ chi phí & tag tên tài xế qua Zalo/Telegram
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1">
          {/* 1. Hình thức & Chọn Xe theo Loại Ghế (4 chỗ, 7 chỗ...) */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Car className="w-4 h-4 text-blue-600" />
                1. Chọn Hình Thức Đặt Xe, Hãng Xe & Loại Ghế (4 chỗ, 7 chỗ...)
              </h3>
              <div className="inline-flex rounded-lg bg-slate-200/80 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setBookingType('WITH_DRIVER');
                    recalculateAutoDeductions(
                      routeType,
                      selectedPresetId,
                      distanceKm,
                      isRoundTrip,
                      selectedVehicle,
                      baseFareRevenue,
                      surchargeRevenue,
                      'WITH_DRIVER'
                    );
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                    bookingType === 'WITH_DRIVER'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  👨‍✈️ Xe Có Tài Xế Chạy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBookingType('SELF_DRIVE');
                    recalculateAutoDeductions(
                      routeType,
                      selectedPresetId,
                      distanceKm,
                      isRoundTrip,
                      selectedVehicle,
                      baseFareRevenue,
                      surchargeRevenue,
                      'SELF_DRIVE'
                    );
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                    bookingType === 'SELF_DRIVE'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  🔑 Khách Thuê Tự Lái
                </button>
              </div>
            </div>

            {/* Bộ lọc nhanh loại ghế */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-xs font-medium text-slate-500 shrink-0 mr-1">Lọc loại ghế:</span>
              {SEAT_FILTERS.map((seat) => (
                <button
                  key={seat}
                  type="button"
                  onClick={() => setSeatFilter(seat)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition ${
                    seatFilter === seat
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-400'
                  }`}
                >
                  {seat === 'ALL' ? 'Tất cả số ghế' : seat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chọn Xe (Hãng xe • Dòng xe • Loại ghế • Biển số) *
                </label>
                <select
                  value={vehicleId}
                  onChange={(e) => {
                    const newVehId = e.target.value;
                    setVehicleId(newVehId);
                    const veh = vehicles.find((v) => v.id === newVehId);
                    recalculateAutoDeductions(
                      routeType,
                      selectedPresetId,
                      distanceKm,
                      isRoundTrip,
                      veh,
                      baseFareRevenue,
                      surchargeRevenue,
                      bookingType
                    );
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
                  required
                >
                  {filteredVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      [{v.seatCategory}] {v.brand} {v.model} ({v.plateNumber}) — Định mức xăng:{' '}
                      {formatVND(v.fuelCostPerKm)}/km
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {bookingType === 'WITH_DRIVER'
                    ? 'Tài Xế Chạy Chính (Họ và tên • Hạng GPLX) *'
                    : 'Nhân Viên / Tài Xế Phụ Trách Giao Nhận Xe Tự Lái *'}
                </label>
                <select
                  value={driverId}
                  onChange={(e) => {
                    const newDrvId = e.target.value;
                    setDriverId(newDrvId);
                    if (!taggedDriverIds.includes(newDrvId)) {
                      setTaggedDriverIds((prev) => [newDrvId, ...prev]);
                    }
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
                  required
                >
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} ({d.code} • Bằng {d.licenseClass} • {d.telegramUsername})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tag tên tài xế khác qua Zalo / Telegram */}
            <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-blue-600" />
                  Tag Tên Tài Xế Nhận Thông Báo Lịch Qua Zalo & Telegram (@Tag nhiều người dự phòng):
                </span>
                <select
                  value={botChannel}
                  onChange={(e) => setBotChannel(e.target.value as Trip['botChannel'])}
                  className="text-xs rounded border border-blue-300 bg-white px-2 py-1 font-semibold text-blue-800"
                >
                  <option value="BOTH">Gửi cả Zalo + Telegram</option>
                  <option value="TELEGRAM">Chỉ gửi Telegram Bot</option>
                  <option value="ZALO">Chỉ gửi Zalo OA/ZNS</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                {drivers.map((drv) => {
                  const isTagged = taggedDriverIds.includes(drv.id);
                  const isMain = drv.id === driverId;
                  return (
                    <button
                      key={drv.id}
                      type="button"
                      onClick={() => handleToggleTagDriver(drv.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                        isTagged
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400'
                      }`}
                    >
                      <span>@{drv.fullName}</span>
                      <span className="opacity-80 text-[10px]">({drv.telegramUsername})</span>
                      {isMain && (
                        <span className="bg-amber-300 text-slate-900 px-1 rounded text-[10px] font-bold">
                          Chính
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. Thông tin Khách hàng & Lịch trình Cao tốc vs Quốc lộ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                2. Thông Tin Khách Hàng & Thời Gian
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Họ tên khách hàng / Đoàn *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="VD: Anh Tuấn / Công ty ABC"
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    required
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Số điện thoại khách *
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0909xxxxxx"
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    required
                  />
                </div>
              </div>

              {bookingType === 'SELF_DRIVE' && (
                <div className="grid grid-cols-2 gap-2.5 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-900 mb-1">
                      Số CCCD người thuê tự lái
                    </label>
                    <input
                      type="text"
                      value={customerCccd}
                      onChange={(e) => setCustomerCccd(e.target.value)}
                      placeholder="07909xxxxxxx"
                      className="w-full rounded border border-emerald-300 px-2.5 py-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-900 mb-1">
                      Số GPLX người thuê tự lái
                    </label>
                    <input
                      type="text"
                      value={customerLicense}
                      onChange={(e) => setCustomerLicense(e.target.value)}
                      placeholder="B2 - 7901xxxx"
                      className="w-full rounded border border-emerald-300 px-2.5 py-1 text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ngày đi *</label>
                  <input
                    type="date"
                    value={tripDate}
                    onChange={(e) => setTripDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Giờ xuất phát</label>
                  <input
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Giờ kết thúc</label>
                  <input
                    type="time"
                    value={returnTime}
                    onChange={(e) => setReturnTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Điểm đón</label>
                  <input
                    type="text"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    placeholder="Quận 1, TP.HCM"
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Điểm đến *</label>
                  <input
                    type="text"
                    value={dropoffLocation}
                    onChange={(e) => setDropoffLocation(e.target.value)}
                    placeholder="Mũi Né / Vũng Tàu / Cần Thơ"
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Lộ trình di chuyển: Tuyến Cao tốc hay Đường Quốc lộ */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-blue-600" />
                3. Lộ Trình Di Chuyển: Tuyến Cao Tốc vs. Đường Quốc Lộ
              </h3>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRouteType('HIGHWAY');
                    const hw = highwayPresets.find((p) => p.routeType === 'HIGHWAY') || highwayPresets[0];
                    if (hw) {
                      setSelectedPresetId(hw.id);
                      setRouteDetail(hw.name);
                      const newKm = hw.defaultDistanceKm * (isRoundTrip ? 2 : 1);
                      setDistanceKm(newKm);
                      recalculateAutoDeductions(
                        'HIGHWAY',
                        hw.id,
                        newKm,
                        isRoundTrip,
                        selectedVehicle,
                        baseFareRevenue,
                        surchargeRevenue,
                        bookingType
                      );
                    }
                  }}
                  className={`py-2 px-2 rounded-lg text-xs font-bold border text-center transition ${
                    routeType === 'HIGHWAY'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-indigo-400'
                  }`}
                >
                  🛣️ Đi Cao Tốc (ETC)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRouteType('NATIONAL_ROAD');
                    const nr =
                      highwayPresets.find((p) => p.routeType === 'NATIONAL_ROAD') ||
                      highwayPresets[highwayPresets.length - 1];
                    if (nr) {
                      setSelectedPresetId(nr.id);
                      setRouteDetail(nr.name);
                      const newKm = nr.defaultDistanceKm * (isRoundTrip ? 2 : 1);
                      setDistanceKm(newKm);
                      recalculateAutoDeductions(
                        'NATIONAL_ROAD',
                        nr.id,
                        newKm,
                        isRoundTrip,
                        selectedVehicle,
                        baseFareRevenue,
                        surchargeRevenue,
                        bookingType
                      );
                    }
                  }}
                  className={`py-2 px-2 rounded-lg text-xs font-bold border text-center transition ${
                    routeType === 'NATIONAL_ROAD'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-amber-400'
                  }`}
                >
                  🛤️ Đường Quốc Lộ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRouteType('MIXED');
                    const mx = highwayPresets.find((p) => p.routeType === 'MIXED') || highwayPresets[2];
                    if (mx) {
                      setSelectedPresetId(mx.id);
                      setRouteDetail(mx.name);
                      const newKm = mx.defaultDistanceKm * (isRoundTrip ? 2 : 1);
                      setDistanceKm(newKm);
                      recalculateAutoDeductions(
                        'MIXED',
                        mx.id,
                        newKm,
                        isRoundTrip,
                        selectedVehicle,
                        baseFareRevenue,
                        surchargeRevenue,
                        bookingType
                      );
                    }
                  }}
                  className={`py-2 px-2 rounded-lg text-xs font-bold border text-center transition ${
                    routeType === 'MIXED'
                      ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-teal-400'
                  }`}
                >
                  🔀 Kết Hợp Cả Hai
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Chọn nhanh tuyến đường định mức (Tự động áp phí Cao tốc/BOT)
                </label>
                <select
                  value={selectedPresetId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    setSelectedPresetId(pid);
                    const preset = highwayPresets.find((p) => p.id === pid);
                    if (preset) {
                      setRouteType(preset.routeType);
                      setRouteDetail(preset.name);
                      const newKm = preset.defaultDistanceKm * (isRoundTrip ? 2 : 1);
                      setDistanceKm(newKm);
                      recalculateAutoDeductions(
                        preset.routeType,
                        pid,
                        newKm,
                        isRoundTrip,
                        selectedVehicle,
                        baseFareRevenue,
                        surchargeRevenue,
                        bookingType
                      );
                    }
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium"
                >
                  {highwayPresets.map((hp) => (
                    <option key={hp.id} value={hp.id}>
                      [{hp.routeType === 'HIGHWAY' ? 'Cao tốc' : hp.routeType === 'NATIONAL_ROAD' ? 'Quốc lộ' : 'Kết hợp'}] {hp.name} — Phí chuẩn: {formatVND(hp.baseToll4To7Seats)}/chiều
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Chi tiết tuyến đường thực tế
                </label>
                <input
                  type="text"
                  value={routeDetail}
                  onChange={(e) => setRouteDetail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Tổng quãng đường (Km)
                  </label>
                  <input
                    type="number"
                    value={distanceKm}
                    onChange={(e) => {
                      const km = Number(e.target.value) || 0;
                      setDistanceKm(km);
                      recalculateAutoDeductions(
                        routeType,
                        selectedPresetId,
                        km,
                        isRoundTrip,
                        selectedVehicle,
                        baseFareRevenue,
                        surchargeRevenue,
                        bookingType
                      );
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold"
                  />
                </div>
                <div className="pt-4">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isRoundTrip}
                      onChange={(e) => {
                        const round = e.target.checked;
                        setIsRoundTrip(round);
                        const preset = highwayPresets.find((p) => p.id === selectedPresetId);
                        const newKm = preset
                          ? preset.defaultDistanceKm * (round ? 2 : 1)
                          : round
                          ? distanceKm * 2
                          : Math.round(distanceKm / 2);
                        setDistanceKm(newKm);
                        recalculateAutoDeductions(
                          routeType,
                          selectedPresetId,
                          newKm,
                          round,
                          selectedVehicle,
                          baseFareRevenue,
                          surchargeRevenue,
                          bookingType
                        );
                      }}
                      className="rounded border-slate-300 text-blue-600 w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      Khứ hồi 2 chiều (Nhân đôi phí trạm)
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Bảng tính Doanh thu, Chi phí Tự cấn trừ, Nhập tay & Chi phí Rủi ro (Phạt, Đậu xe) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cột A: Doanh thu & Tự cấn trừ */}
            <div className="bg-emerald-50/60 rounded-xl p-4 border border-emerald-200 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-600" />
                A. Doanh Thu & Tự Cấn Trừ
              </h4>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số tiền theo chuyến (VNĐ) *
                </label>
                <input
                  type="number"
                  step="10000"
                  value={baseFareRevenue}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    setBaseFareRevenue(val);
                    recalculateAutoDeductions(
                      routeType,
                      selectedPresetId,
                      distanceKm,
                      isRoundTrip,
                      selectedVehicle,
                      val,
                      surchargeRevenue,
                      bookingType
                    );
                  }}
                  className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-bold text-emerald-800"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Phụ thu (Quá giờ / Quá km / Lễ)
                </label>
                <input
                  type="number"
                  step="10000"
                  value={surchargeRevenue}
                  onChange={(e) => setSurchargeRevenue(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Hình thức thu tiền khách
                </label>
                <select
                  value={paymentCollectedBy}
                  onChange={(e) =>
                    setPaymentCollectedBy(e.target.value as 'COMPANY_BANK' | 'DRIVER_CASH')
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold"
                >
                  <option value="COMPANY_BANK">🏦 Khách CK vào TK Công ty</option>
                  <option value="DRIVER_CASH">💵 Tài xế thu hộ tiền mặt từ khách</option>
                </select>
              </div>

              <div className="pt-2 border-t border-emerald-200 space-y-2">
                <div className="text-[11px] font-bold text-slate-700">
                  Các khoản Tự Động Cấn Trừ (Có thể tinh chỉnh):
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600">
                    1. Phí Cao tốc / ETC tự cấn trừ (VNĐ)
                  </label>
                  <input
                    type="number"
                    step="5000"
                    value={autoHighwayToll}
                    onChange={(e) => setAutoHighwayToll(Number(e.target.value) || 0)}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600">
                    2. Định mức nhiên liệu tự cấn trừ ({distanceKm}km)
                  </label>
                  <input
                    type="number"
                    step="10000"
                    value={autoFuelQuota}
                    onChange={(e) => setAutoFuelQuota(Number(e.target.value) || 0)}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600">
                    3. Chiết khấu / Phí điều hành ({activeTenant.defaultDispatchFeePercent}%)
                  </label>
                  <input
                    type="number"
                    step="10000"
                    value={autoDispatchFee}
                    onChange={(e) => setAutoDispatchFee(Number(e.target.value) || 0)}
                    className="w-full rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Cột B: Chi phí Nhập tay */}
            <div className="bg-amber-50/60 rounded-xl p-4 border border-amber-200 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-amber-600" />
                B. Chi Phí Cho Nhập Tay
              </h4>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số tiền chi phí nhập tay (VNĐ)
                </label>
                <input
                  type="number"
                  step="10000"
                  value={manualExpenseTotal}
                  onChange={(e) => setManualExpenseTotal(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-bold text-amber-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Diễn giải chi phí nhập tay
                </label>
                <textarea
                  rows={3}
                  value={manualExpenseNote}
                  onChange={(e) => setManualExpenseNote(e.target.value)}
                  placeholder="VD: Mua nước suối, khăn lạnh, rửa xe, phụ cấp ăn trưa tài xế..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                />
              </div>

              <div className="pt-2 border-t border-amber-200">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trạng thái Chuyến đi
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Trip['status'])}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold"
                >
                  <option value="PENDING_CONFIRM">⏳ Chờ Tài xế xác nhận Bot</option>
                  <option value="CONFIRMED">✅ Tài xế đã xác nhận lịch</option>
                  <option value="IN_PROGRESS">🚗 Đang chạy trên đường</option>
                  <option value="COMPLETED">🏁 Hoàn thành & Chốt đối soát</option>
                  <option value="CANCELLED">❌ Đã hủy chuyến</option>
                </select>
              </div>
            </div>

            {/* Cột C: Chi phí Phát sinh Rủi ro (Phạt giao thông & Đậu xe) */}
            <div className="bg-rose-50/70 rounded-xl p-4 border border-rose-200 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                C. Chi Phí Rủi Ro (Phạt & Đậu Xe)
              </h4>

              {/* Chi phí đậu xe */}
              <div className="bg-white/90 p-2.5 rounded-lg border border-rose-200 space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <ParkingCircle className="w-3.5 h-3.5 text-blue-600" />
                  1. Chi phí Đậu xe / Bến bãi (VNĐ)
                </label>
                <input
                  type="number"
                  step="5000"
                  value={parkingFee}
                  onChange={(e) => setParkingFee(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full rounded border border-slate-300 px-2.5 py-1 text-sm font-bold text-slate-900"
                />
                <input
                  type="text"
                  value={parkingNote}
                  onChange={(e) => setParkingNote(e.target.value)}
                  placeholder="VD: Đậu xe sân bay, bến bãi..."
                  className="w-full rounded border border-slate-200 px-2 py-1 text-[11px]"
                />
              </div>

              {/* Chi phí phạt */}
              <div className="bg-white/90 p-2.5 rounded-lg border border-rose-200 space-y-1.5">
                <label className="text-xs font-bold text-rose-800 flex items-center gap-1">
                  <FileWarning className="w-3.5 h-3.5 text-rose-600" />
                  2. Chi phí Phạt giao thông (VNĐ)
                </label>
                <input
                  type="number"
                  step="50000"
                  value={trafficFineFee}
                  onChange={(e) => setTrafficFineFee(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full rounded border border-rose-300 px-2.5 py-1 text-sm font-bold text-rose-700"
                />
                <input
                  type="text"
                  value={trafficFineNote}
                  onChange={(e) => setTrafficFineNote(e.target.value)}
                  placeholder="VD: Phạt quá tốc độ, sai làn, phạt nguội..."
                  className="w-full rounded border border-slate-200 px-2 py-1 text-[11px]"
                />
              </div>

              {/* Rủi ro khác */}
              <div className="bg-white/90 p-2 rounded-lg border border-rose-200 space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  3. Chi phí sự cố / rủi ro khác (Vá lốp, cứu hộ...)
                </label>
                <input
                  type="number"
                  step="10000"
                  value={otherRiskFee}
                  onChange={(e) => setOtherRiskFee(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Thanh Tổng Kết Đối Soát Tự Động (Real-time Net Remaining Banner) */}
          <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs w-full sm:w-auto">
              <div>
                <div className="text-slate-400">Tổng Doanh Thu (+)</div>
                <div className="font-bold text-emerald-400 text-sm">
                  {formatVND(liveBreakdown.grossRevenue)}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Tự Cấn Trừ (-)</div>
                <div className="font-bold text-amber-300 text-sm">
                  -{formatVND(liveBreakdown.totalAutoDeducted)}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Chi Phí Nhập Tay (-)</div>
                <div className="font-bold text-orange-300 text-sm">
                  -{formatVND(liveBreakdown.totalManualExpense)}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Phạt & Đậu Xe (-)</div>
                <div className="font-bold text-rose-400 text-sm">
                  -{formatVND(liveBreakdown.totalRiskExpense)}
                </div>
              </div>
            </div>

            <div className="border-t sm:border-t-0 sm:border-l border-slate-700 pt-3 sm:pt-0 sm:pl-5 w-full sm:w-auto text-right">
              <div className="text-[11px] uppercase tracking-wider text-blue-300 font-semibold">
                Số Thực Tế Còn Lại Vào Tài Khoản
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-white">
                {formatVND(liveBreakdown.netRemainingToAccount)}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-600/25 transition"
            >
              <Send className="w-4 h-4" />
              {editingTrip
                ? 'Lưu Cập Nhật & Tính Lại Đối Soát'
                : 'Lưu Lịch & Bắn Thông Báo Bot Zalo/Telegram'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
