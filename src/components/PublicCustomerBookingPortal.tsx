import React, { useState } from 'react';
import {
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  KeyRound,
  MapPin,
  Navigation,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
  X,
} from 'lucide-react';
import {
  Driver,
  FUEL_TYPE_LABELS,
  HighwayPreset,
  RouteType,
  SeatCategory,
  TenantConfig,
  Trip,
  Vehicle,
} from '../types/fleet';
import { formatVND } from '../utils/calculations';

interface PublicCustomerBookingPortalProps {
  tenant: TenantConfig;
  vehicles: Vehicle[];
  drivers: Driver[];
  highwayPresets: HighwayPreset[];
  trips: Trip[];
  onCustomerCreateBooking: (tripData: Omit<Trip, 'id' | 'createdAt'>) => Trip;
}

const SEAT_OPTIONS: ('ALL' | SeatCategory)[] = [
  'ALL',
  '4 chỗ',
  '5 chỗ',
  '7 chỗ',
  '9 chỗ Limousine',
  '16 chỗ',
];

export const PublicCustomerBookingPortal: React.FC<PublicCustomerBookingPortalProps> = ({
  tenant,
  vehicles,
  drivers,
  highwayPresets,
  trips,
  onCustomerCreateBooking,
}) => {
  const [seatFilter, setSeatFilter] = useState<'ALL' | SeatCategory>('ALL');
  const [brandFilter, setBrandFilter] = useState<string>('ALL');
  const [serviceType, setServiceType] = useState<'WITH_DRIVER' | 'SELF_DRIVE'>('WITH_DRIVER');

  // Booking modal for customer
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCccd, setCustomerCccd] = useState('');
  const [customerLicense, setCustomerLicense] = useState('');
  const [tripDate, setTripDate] = useState('2026-11-01');
  const [departureTime, setDepartureTime] = useState('07:30');
  const [returnTime, setReturnTime] = useState('19:30');
  const [pickupLocation, setPickupLocation] = useState('TP.HCM');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [routeType, setRouteType] = useState<RouteType>('HIGHWAY');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(highwayPresets[0]?.id || '');
  const [isRoundTrip, setIsRoundTrip] = useState(true);
  const [customerNotes, setCustomerNotes] = useState('');

  // Confirmation receipt state
  const [createdBooking, setCreatedBooking] = useState<Trip | null>(null);

  // Lookup state for customer
  const [lookupQuery, setLookupQuery] = useState('');
  const [showLookupModal, setShowLookupModal] = useState(false);

  const brands = Array.from(new Set(vehicles.map((v) => v.brand)));

  const filteredVehicles = vehicles.filter((v) => {
    if (seatFilter !== 'ALL' && v.seatCategory !== seatFilter) return false;
    if (brandFilter !== 'ALL' && v.brand !== brandFilter) return false;
    return true;
  });

  const matchedLookupTrips = lookupQuery.trim()
    ? trips.filter(
        (t) =>
          t.customerPhone.includes(lookupQuery.trim()) ||
          t.tripCode.toLowerCase().includes(lookupQuery.trim().toLowerCase())
      )
    : [];

  const handleOpenBookVehicle = (veh: Vehicle) => {
    setSelectedVehicle(veh);
    setCreatedBooking(null);
  };

  const handleCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    const preset =
      highwayPresets.find((p) => p.id === selectedPresetId) || highwayPresets[0];
    const distanceKm = (preset?.defaultDistanceKm || 150) * (isRoundTrip ? 2 : 1);
    const defaultDriver =
      drivers.find((d) => d.status === 'ACTIVE') || drivers[0];

    // Estimate base fare based on vehicle rate & distance
    const estimatedFare =
      serviceType === 'SELF_DRIVE'
        ? selectedVehicle.dailyRateSelfDrive * (isRoundTrip ? 2 : 1)
        : Math.round(
            selectedVehicle.dailyRateSelfDrive +
              distanceKm * (selectedVehicle.fuelCostPerKm + 4500)
          );

    const autoHighwayToll =
      routeType === 'HIGHWAY' || routeType === 'MIXED'
        ? Math.round(
            (preset?.baseToll4To7Seats || 150000) *
              (selectedVehicle.highwayTollMultiplier || 1) *
              (isRoundTrip ? 2 : 1)
          )
        : 0;

    const autoFuelQuota =
      serviceType === 'SELF_DRIVE'
        ? 0
        : Math.round(distanceKm * (selectedVehicle.fuelCostPerKm || 2000));

    const autoDispatchFee = Math.round(
      (estimatedFare * (tenant.defaultDispatchFeePercent || 10)) / 100
    );

    const tripCode = `KH-${tripDate.slice(5, 7)}${tripDate.slice(8, 10)}-${Math.floor(
      100 + Math.random() * 900
    )}`;

    const created = onCustomerCreateBooking({
      tenantId: tenant.id,
      tripCode,
      bookingType: serviceType,
      vehicleId: selectedVehicle.id,
      driverId: defaultDriver?.id || 'DRV-01',
      taggedDriverIds: defaultDriver ? [defaultDriver.id] : [],
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerCccd: customerCccd.trim() || undefined,
      customerLicense: customerLicense.trim() || undefined,
      tripDate,
      departureTime,
      returnTime,
      pickupLocation: pickupLocation.trim() || 'TP.HCM',
      dropoffLocation: dropoffLocation.trim() || preset?.name || 'Theo lộ trình',
      routeType,
      routeDetail: preset?.name || 'Theo lộ trình khách chọn',
      distanceKm,
      isRoundTrip,
      baseFareRevenue: estimatedFare,
      surchargeRevenue: 0,
      paymentCollectedBy: 'COMPANY_BANK',
      autoHighwayToll,
      autoFuelQuota,
      autoDispatchFee,
      manualExpenseTotal: 0,
      manualExpenseNote: '',
      parkingFee: 0,
      parkingNote: '',
      trafficFineFee: 0,
      trafficFineNote: '',
      otherRiskFee: 0,
      otherRiskNote: '',
      status: 'PENDING_CONFIRM',
      botChannel: 'BOTH',
      notes: customerNotes.trim()
        ? `[Khách đặt trực tuyến]: ${customerNotes.trim()}`
        : '[Khách đặt trực tuyến trên Web/App]',
    });

    setCreatedBooking(created);
    setCustomerName('');
    setCustomerPhone('');
    setDropoffLocation('');
    setCustomerNotes('');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Public Top Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-inner shrink-0">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight">
                {tenant.shortName} — Đặt Xe Trực Tuyến
              </h1>
              <p className="text-[11px] text-slate-400">
                Thuê xe tự lái & Xe hợp đồng có tài xế (4 chỗ, 7 chỗ, Limousine, 16 chỗ)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowLookupModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-bold transition"
            >
              <Search className="w-3.5 h-3.5 text-blue-400" />
              <span>Tra cứu lịch đã đặt</span>
            </button>

            <a
              href={`tel:${tenant.hotline.replace(/\./g, '')}`}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold shadow-sm transition"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Hotline: {tenant.hotline}</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section & Quick Booking Filter */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white py-8 sm:py-12 px-4">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Đặt lịch nhanh chóng • Xác nhận tự động qua AI Bot Zalo & Telegram</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Đặt Xe Tự Lái & Xe Có Tài Xế Chuyên Nghiệp
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto">
            Đa dạng các dòng xe đời mới 4 chỗ, 5 chỗ, 7 chỗ, 9 chỗ Limousine và 16 chỗ. Tự chọn lộ trình đi Cao tốc hoặc Quốc lộ minh bạch chi phí.
          </p>

          {/* Service Mode Switch */}
          <div className="pt-2 flex justify-center">
            <div className="inline-flex rounded-2xl bg-slate-800/90 p-1.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setServiceType('WITH_DRIVER')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition ${
                  serviceType === 'WITH_DRIVER'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                👨‍✈️ Thuê Xe Có Tài Xế Đưa Đón
              </button>
              <button
                type="button"
                onClick={() => setServiceType('SELF_DRIVE')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition ${
                  serviceType === 'SELF_DRIVE'
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                🔑 Thuê Xe Tự Lái Theo Ngày
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Vehicle Catalog */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Filter Bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-slate-600 mr-1 shrink-0">Chọn số ghế:</span>
            {SEAT_OPTIONS.map((seat) => (
              <button
                key={seat}
                type="button"
                onClick={() => setSeatFilter(seat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                  seatFilter === seat
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {seat === 'ALL' ? 'Tất cả loại ghế' : seat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Hãng xe:</span>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800"
            >
              <option value="ALL">Tất cả hãng xe</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Vehicle Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVehicles.map((veh) => (
            <div
              key={veh.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition overflow-hidden flex flex-col justify-between"
            >
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-extrabold">
                      {veh.seatCategory}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                        veh.fuelType === 'ELECTRIC'
                          ? 'bg-teal-100 text-teal-800 border border-teal-300'
                          : veh.fuelType === 'DIESEL'
                          ? 'bg-slate-200 text-slate-800 border border-slate-400'
                          : 'bg-orange-100 text-orange-800 border border-orange-300'
                      }`}
                    >
                      {FUEL_TYPE_LABELS[veh.fuelType || 'GASOLINE']}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      veh.status === 'AVAILABLE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {veh.status === 'AVAILABLE' ? '● Sẵn sàng nhận lịch' : '● Đặt lịch trước'}
                  </span>
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {veh.brand} • {veh.vehicleType} • Đời {veh.year}
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">{veh.model}</h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Màu: <strong>{veh.color}</strong> • Biển số:{' '}
                    <span className="font-mono font-bold text-slate-800">{veh.plateNumber}</span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Giá thuê tham khảo:</span>
                    <strong className="text-emerald-700 text-sm">
                      Từ {formatVND(veh.dailyRateSelfDrive)}/ngày
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phục vụ:</span>
                    <strong className="text-slate-800">
                      {veh.serviceMode === 'BOTH'
                        ? 'Tự lái & Có tài xế'
                        : veh.serviceMode === 'SELF_DRIVE'
                        ? 'Cho thuê tự lái'
                        : 'Xe hợp đồng có tài xế'}
                    </strong>
                  </div>
                  <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    ✓ Xe trang bị sẵn thẻ thu phí tự động ETC Cao tốc, bảo hiểm đầy đủ.
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5">
                <button
                  type="button"
                  onClick={() => handleOpenBookVehicle(veh)}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-extrabold shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Chọn Đặt Lịch Xe Này</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer (Không lộ nút Admin, chỉ có thông tin công ty) */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-6 px-4 border-t border-slate-800 mt-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <strong className="text-white">{tenant.name}</strong> • MST: {tenant.taxCode}
          </div>
          <div>Hotline điều hành 24/7: {tenant.hotline}</div>
        </div>
      </footer>

      {/* Modal Đặt Lịch Xe Dành Cho Khách Hàng */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  Đặt Lịch Xe: [{selectedVehicle.seatCategory}] {selectedVehicle.brand}{' '}
                  {selectedVehicle.model}
                </h3>
                <p className="text-xs text-blue-200">
                  Biển số: {selectedVehicle.plateNumber} • Xác nhận lịch tự động qua Zalo / SĐT
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedVehicle(null);
                  setCreatedBooking(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdBooking ? (
              <div className="p-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-extrabold text-slate-900">
                  Đặt Lịch Xe Thành Công!
                </h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Yêu cầu đặt xe của quý khách đã được chuyển tới bộ phận Điều hành & AI Bot Zalo/Telegram của{' '}
                  <strong>{tenant.shortName}</strong>.
                </p>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mã đặt lịch:</span>
                    <strong className="text-blue-700 font-mono text-sm">
                      #{createdBooking.tripCode}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Khách hàng:</span>
                    <strong>
                      {createdBooking.customerName} ({createdBooking.customerPhone})
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Xe đã chọn:</span>
                    <strong>
                      [{selectedVehicle.seatCategory}] {selectedVehicle.brand}{' '}
                      {selectedVehicle.model} ({selectedVehicle.plateNumber})
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Thời gian:</span>
                    <strong>
                      {createdBooking.departureTime} ngày {createdBooking.tripDate}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Lộ trình:</span>
                    <strong>
                      {createdBooking.pickupLocation} ➔ {createdBooking.dropoffLocation} (
                      {createdBooking.routeType === 'HIGHWAY' ? 'Đi Cao tốc' : 'Đi Quốc lộ'})
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedVehicle(null);
                    setCreatedBooking(null);
                  }}
                  className="w-full py-3 rounded-xl bg-slate-900 text-white text-xs font-extrabold"
                >
                  Đóng & Quay Lại Trang Chủ
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleCustomerSubmit}
                className="p-5 overflow-y-auto space-y-4 text-xs"
              >
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setServiceType('WITH_DRIVER')}
                    className={`py-2 rounded-lg font-bold transition ${
                      serviceType === 'WITH_DRIVER'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-700'
                    }`}
                  >
                    👨‍✈️ Xe Có Tài Xế
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceType('SELF_DRIVE')}
                    className={`py-2 rounded-lg font-bold transition ${
                      serviceType === 'SELF_DRIVE'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-700'
                    }`}
                  >
                    🔑 Thuê Tự Lái
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Họ và tên quý khách *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Số điện thoại / Zalo *
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="0909xxxxxx"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                </div>

                {serviceType === 'SELF_DRIVE' && (
                  <div className="grid grid-cols-2 gap-3 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                    <div>
                      <label className="block font-bold text-emerald-900 mb-1">
                        Số CCCD người lái *
                      </label>
                      <input
                        type="text"
                        value={customerCccd}
                        onChange={(e) => setCustomerCccd(e.target.value)}
                        placeholder="07909xxxxxxx"
                        className="w-full rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-emerald-900 mb-1">
                        Số Bằng lái GPLX *
                      </label>
                      <input
                        type="text"
                        value={customerLicense}
                        onChange={(e) => setCustomerLicense(e.target.value)}
                        placeholder="B2 - 7901xxxx"
                        className="w-full rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Ngày khởi hành *</label>
                    <input
                      type="date"
                      value={tripDate}
                      onChange={(e) => setTripDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-2.5 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Giờ đón</label>
                    <input
                      type="time"
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-2.5 py-2"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Giờ về dự kiến</label>
                    <input
                      type="time"
                      value={returnTime}
                      onChange={(e) => setReturnTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-2.5 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Điểm đón khách *</label>
                    <input
                      type="text"
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                      placeholder="Quận 1, TP.HCM..."
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Điểm đến *</label>
                    <input
                      type="text"
                      value={dropoffLocation}
                      onChange={(e) => setDropoffLocation(e.target.value)}
                      placeholder="Phan Thiết / Vũng Tàu / Cần Thơ..."
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                </div>

                {/* Chọn lộ trình Cao tốc vs Quốc lộ */}
                <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 space-y-2.5">
                  <label className="block font-bold text-blue-950">
                    🛣️ Tùy chọn lộ trình di chuyển (Cao tốc hay Quốc lộ):
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRouteType('HIGHWAY')}
                      className={`py-2 px-3 rounded-lg font-bold border text-center transition ${
                        routeType === 'HIGHWAY'
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      🛣️ Đi Đường Cao Tốc (Nhanh)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRouteType('NATIONAL_ROAD')}
                      className={`py-2 px-3 rounded-lg font-bold border text-center transition ${
                        routeType === 'NATIONAL_ROAD'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      🛤️ Đi Đường Quốc Lộ
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">
                      Tuyến hành trình phổ biến:
                    </label>
                    <select
                      value={selectedPresetId}
                      onChange={(e) => setSelectedPresetId(e.target.value)}
                      className="w-full rounded-lg border border-blue-300 bg-white px-2.5 py-1.5 font-medium"
                    >
                      {highwayPresets.map((hp) => (
                        <option key={hp.id} value={hp.id}>
                          {hp.name} ({hp.defaultDistanceKm} km/chiều)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Ghi chú thêm (Số người, hành lý, yêu cầu đặc biệt)
                  </label>
                  <input
                    type="text"
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="VD: Có trẻ nhỏ, đón đúng 7h sáng..."
                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedVehicle(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 font-semibold text-slate-600"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold shadow-lg shadow-blue-600/25 transition"
                  >
                    Xác Nhận Đặt Lịch Xe
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Tra cứu lịch đặt xe của Khách hàng */}
      {showLookupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h4 className="text-sm font-bold">Tra Cứu Trạng Thái Lịch Đặt Xe</h4>
              <button
                type="button"
                onClick={() => setShowLookupModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nhập Số Điện Thoại đặt xe hoặc Mã chuyến (#KH-... / #MP-...)
                </label>
                <input
                  type="text"
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  placeholder="VD: 0903888111 hoặc MP-2610-001"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold"
                />
              </div>

              {lookupQuery.trim() && (
                <div className="space-y-2.5 max-h-72 overflow-y-auto">
                  {matchedLookupTrips.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 bg-slate-50 rounded-xl">
                      Không tìm thấy lịch đặt xe nào với thông tin này.
                    </div>
                  ) : (
                    matchedLookupTrips.map((tr) => {
                      const veh = vehicles.find((v) => v.id === tr.vehicleId);
                      const drv = drivers.find((d) => d.id === tr.driverId);
                      return (
                        <div
                          key={tr.id}
                          className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-bold">
                              #{tr.tripCode}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                              {tr.status === 'PENDING_CONFIRM'
                                ? '⏳ Đang điều phối tài xế'
                                : '✅ Đã xác nhận lịch'}
                            </span>
                          </div>
                          <div className="font-bold text-slate-900">
                            {tr.pickupLocation} ➔ {tr.dropoffLocation} ({tr.tripDate} lúc{' '}
                            {tr.departureTime})
                          </div>
                          <div>
                            • Xe phục vụ:{' '}
                            <strong>
                              [{veh?.seatCategory}] {veh?.brand} {veh?.model} ({veh?.plateNumber})
                            </strong>
                          </div>
                          <div>
                            • Tài xế phụ trách: <strong>{drv?.fullName}</strong> — SĐT:{' '}
                            <strong>{drv?.phone}</strong>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
