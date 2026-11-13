import { PROVINCES } from '../data/provinces';
import { PlaceInput } from './PlaceInput';
import { todayLocal } from '../utils/date';
import { RentalContract } from './RentalContract';
import { HUMAN_CHECK_ENABLED, HumanCheck } from './HumanCheck';
import { resolveSiteContent } from '../data/siteContent';
import React, { lazy, Suspense, useEffect, useState } from 'react';
import {
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  KeyRound,
  LocateFixed,
  MapPin,
  Navigation,
  Phone,
  Search,
  ShieldCheck,
  User,
  UserCheck,
  X,
} from 'lucide-react';
import {
  FUEL_TYPE_LABELS,
  HighwayPreset,
  RouteType,
  SeatCategory,
  TenantConfig,
  Trip,
  Vehicle,
} from '../types/fleet';
import { formatVND } from '../utils/calculations';
import { resolveTaxiFare, taxiRatePerKm } from '../utils/taxiFare';
import { SiteFooter } from './SiteFooter';
import { FloatingContact } from './FloatingContact';
import { TravelInfoSections } from './TravelInfoSections';

// three.js nặng: tách chunk riêng để trang khách hiện ra trước
const CarShowcase3D = lazy(() => import('./CarShowcase3D'));
// Thư viện bản đồ cũng nặng: chỉ tải khi khách đã chọn đủ điểm đón và điểm đến
const RouteMap = lazy(() => import('./RouteMap'));

// Phí giao xe tự lái tận nơi; máy chủ đặt cùng con số (DELIVERY_FEE trong api/public-booking.js)
const DELIVERY_FEE = 100000;
// Kết quả tra cứu do máy chủ trả (chỉ phần khách cần xem)
interface LookupTrip {
  tripCode: string;
  status: Trip['status'];
  tripDate: string;
  departureTime: string;
  // null khi chỉ tra bằng SĐT (máy chủ che bớt)
  pickupLocation: string | null;
  dropoffLocation: string | null;
  vehicle: (Pick<Vehicle, 'seatCategory' | 'brand' | 'model'> & { plateNumber: string | null }) | null;
  driver: { fullName: string; phone: string } | null;
}

const SEAT_OPTIONS: ('ALL' | SeatCategory)[] = [
  'ALL',
  '4 chỗ',
  '5 chỗ',
  '7 chỗ',
  '9 chỗ Limousine',
  '16 chỗ',
];

// Trang khách không đọc DB trực tiếp: dữ liệu công khai và đặt lịch đi qua máy chủ (api/public-*.js)
export const PublicCustomerBookingPortal: React.FC = () => {
  const [catalog, setCatalog] = useState<{
    tenant: TenantConfig;
    vehicles: Vehicle[];
    highwayPresets: HighwayPreset[];
  } | null>(null);
  const [catalogError, setCatalogError] = useState(false);

  useEffect(() => {
    fetch('/api/public-catalog')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setCatalog)
      .catch(() => setCatalogError(true));
  }, []);

  const tenant = catalog?.tenant;
  const siteContent = resolveSiteContent(tenant?.siteContent);
  const vehicles = catalog?.vehicles || [];
  const highwayPresets = catalog?.highwayPresets || [];
  const [seatFilter, setSeatFilter] = useState<'ALL' | SeatCategory>('ALL');
  const [brandFilter, setBrandFilter] = useState<string>('ALL');
  const [serviceType, setServiceType] = useState<'WITH_DRIVER' | 'SELF_DRIVE'>('WITH_DRIVER');

  // Booking modal for customer
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCccd, setCustomerCccd] = useState('');
  const [customerLicense, setCustomerLicense] = useState('');
  // Riêng thuê tự lái: thông tin điền hợp đồng, ngày trả xe, cách nhận xe
  const [customerBirthDate, setCustomerBirthDate] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCccdIssueDate, setCustomerCccdIssueDate] = useState('');
  const [customerCccdIssuePlace, setCustomerCccdIssuePlace] = useState('');
  const [tripEndDate, setTripEndDate] = useState(todayLocal);
  const [deliveryMode, setDeliveryMode] = useState<'SELF_PICKUP' | 'DELIVERY'>('SELF_PICKUP');
  const [showContract, setShowContract] = useState(false);
  const [tripDate, setTripDate] = useState(todayLocal);
  const [departureTime, setDepartureTime] = useState('07:30');
  const [returnTime, setReturnTime] = useState('19:30');
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [pickupPlaceId, setPickupPlaceId] = useState<string | null>(null);
  const [dropoffPlaceId, setDropoffPlaceId] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');
  const [routeInfo, setRouteInfo] = useState<{
    km: number;
    minutes: number;
    line?: [number, number][];
    bbox?: [number, number, number, number];
    pickup?: [number, number];
  } | null>(null);
  const [routeType, setRouteType] = useState<RouteType>('HIGHWAY');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(highwayPresets[0]?.id || '');
  const [isRoundTrip, setIsRoundTrip] = useState(true);
  // Xe khách chọn trong danh sách hiện ra sau khi có lộ trình (kiểu app gọi xe)
  const [plannerVehicleId, setPlannerVehicleId] = useState<string | null>(null);

  // Khách chọn cả điểm đón lẫn điểm đến từ gợi ý địa chỉ thì hiện quãng đường ước tính
  useEffect(() => {
    setRouteInfo(null);
    if (!pickupPlaceId || !dropoffPlaceId) return;
    const ctrl = new AbortController();
    fetch(`/api/maps?type=route&from=${encodeURIComponent(pickupPlaceId)}&to=${encodeURIComponent(dropoffPlaceId)}`, {
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && typeof d.km === 'number' && setRouteInfo(d))
      .catch(() => {});
    return () => ctrl.abort();
  }, [pickupPlaceId, dropoffPlaceId]);
  const [customerNotes, setCustomerNotes] = useState('');

  // Confirmation receipt state
  const [createdBooking, setCreatedBooking] = useState<Trip | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Lookup state for customer
  const [lookupCode, setLookupCode] = useState('');
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupResult, setLookupResult] = useState<LookupTrip[] | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [showLookupModal, setShowLookupModal] = useState(false);
  // Mã xác minh người thật (Turnstile) cho form đặt xe và tra cứu; mỗi mã chỉ dùng một lần
  const [humanToken, setHumanToken] = useState('');
  const [humanReset, setHumanReset] = useState(0);

  const brands = Array.from(new Set(vehicles.map((v) => v.brand)));

  const filteredVehicles = vehicles.filter((v) => {
    if (seatFilter !== 'ALL' && v.seatCategory !== seatFilter) return false;
    if (brandFilter !== 'ALL' && v.brand !== brandFilter) return false;
    return true;
  });

  const taxiFare = resolveTaxiFare(tenant?.taxiFare);
  // Giá xe có tài xế theo cước taxi: km (đã nhân 2 nếu khứ hồi) × đơn giá loại ghế; null = chưa có giá
  const taxiPrice = (veh: Vehicle, km: number | undefined) => {
    const rate = taxiRatePerKm(taxiFare, veh.seatCategory, tripDate);
    return rate && km ? Math.round((km * rate) / 1000) * 1000 : null; // làm tròn đến nghìn
  };

  const plannerVehicles = vehicles.filter((v) => v.serviceMode === 'BOTH' || v.serviceMode === serviceType);
  const plannerVehicle = plannerVehicles.find((v) => v.id === plannerVehicleId) || plannerVehicles[0];

  // Chỉ cần SĐT đặt xe; nhập thêm mã chuyến để xem đủ điểm đón/trả, biển số, tài xế
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    setLookupResult(null);
    try {
      const res = await fetch(
        `/api/public-lookup?code=${encodeURIComponent(lookupCode.trim())}&phone=${encodeURIComponent(lookupPhone.trim())}&t=${encodeURIComponent(humanToken)}`
      );
      const data = await res.json().catch(() => null);
      if (res.ok) setLookupResult(data?.trips || []);
      else setLookupError(data?.error || 'Chưa tra cứu được, vui lòng thử lại.');
    } catch {
      setLookupError('Không kết nối được máy chủ, vui lòng thử lại.');
    }
    setHumanReset((n) => n + 1);
  };

  // Chỉ hỏi quyền vị trí khi khách bấm "Vị trí của tôi", không hỏi lúc mở trang
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocateError('Trình duyệt không hỗ trợ định vị, vui lòng gõ điểm đi.');
      return;
    }
    setLocating(true);
    setLocateError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const r = await fetch(`/api/maps?type=reverse&lat=${latitude}&lng=${longitude}`);
          const d = await r.json().catch(() => null);
          if (!r.ok || !d?.placeId) {
            setLocateError(
              d?.error === 'outside_vietnam'
                ? 'Vị trí của bạn đang ở ngoài Việt Nam, vui lòng gõ điểm đi.'
                : 'Chưa lấy được địa chỉ từ vị trí, vui lòng gõ điểm đi.'
            );
            return;
          }
          setPickupLocation(d.description);
          setPickupPlaceId(d.placeId);
        } catch {
          setLocateError('Chưa lấy được địa chỉ từ vị trí, vui lòng gõ điểm đi.');
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? 'Bạn chưa cho phép truy cập vị trí. Bật quyền Vị trí cho trang này trong cài đặt trình duyệt, hoặc gõ điểm đi.'
            : 'Không xác định được vị trí lúc này, vui lòng gõ điểm đi.'
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  // Số ngày thuê tự lái tính theo ngày lịch, gồm cả ngày nhận và ngày trả
  const rentalDays = Math.max(
    1,
    Math.round((Date.parse(tripEndDate || tripDate) - Date.parse(tripDate)) / 86400000) + 1
  );
  const deliveryFee = deliveryMode === 'DELIVERY' ? DELIVERY_FEE : 0;

  const handleOpenBookVehicle = (veh: Vehicle) => {
    setSelectedVehicle(veh);
    setCreatedBooking(null);
    setShowContract(false);
  };

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle || !tenant) return;
    // Thuê tự lái: cho khách xem hợp đồng điền sẵn trước, xác nhận ở màn hợp đồng mới gửi lịch
    if (serviceType === 'SELF_DRIVE' && !showContract) {
      setShowContract(true);
      return;
    }

    const preset =
      highwayPresets.find((p) => p.id === selectedPresetId) || highwayPresets[0];
    // Khách chọn đủ hai điểm từ gợi ý thì dùng km thật theo bản đồ, không thì theo tuyến phổ biến
    const oneWayKm = routeInfo?.km || preset?.defaultDistanceKm || 150;
    const distanceKm = oneWayKm * (isRoundTrip ? 2 : 1);
    // Estimate base fare based on vehicle rate & distance
    const estimatedFare =
      serviceType === 'SELF_DRIVE'
        ? selectedVehicle.dailyRateSelfDrive * rentalDays
        : taxiPrice(selectedVehicle, distanceKm) ??
          Math.round(
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

    // Máy chủ tự đặt mã chuyến, trạng thái và kiểm tra lại dữ liệu; chỉ gửi phần khách điền và giá tạm tính
    const booking = {
      bookingType: serviceType,
      vehicleId: selectedVehicle.id,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerCccd: customerCccd.trim() || undefined,
      customerLicense: customerLicense.trim() || undefined,
      customerBirthDate: customerBirthDate || undefined,
      customerAddress: customerAddress.trim() || undefined,
      customerCccdIssueDate: customerCccdIssueDate || undefined,
      customerCccdIssuePlace: customerCccdIssuePlace.trim() || undefined,
      deliveryMode,
      tripEndDate: serviceType === 'SELF_DRIVE' ? tripEndDate : undefined,
      tripDate,
      departureTime,
      returnTime,
      pickupLocation: pickupLocation.trim(),
      dropoffLocation: dropoffLocation.trim() || preset?.name || 'Theo lộ trình',
      routeType,
      routeDetail: routeInfo
        ? `Theo bản đồ: ${routeInfo.km} km/chiều${preset ? ` · phí cao tốc theo tuyến ${preset.name}` : ''}`
        : preset?.name || 'Theo lộ trình khách chọn',
      distanceKm,
      pickupLat: routeInfo?.pickup?.[0],
      pickupLng: routeInfo?.pickup?.[1],
      isRoundTrip,
      baseFareRevenue: estimatedFare,
      autoHighwayToll,
      autoFuelQuota,
      autoDispatchFee,
      notes: customerNotes.trim(),
      turnstileToken: humanToken,
    };

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/public-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.trip) {
        setSubmitError(data?.error || 'Chưa gửi được lịch đặt, vui lòng thử lại hoặc gọi hotline.');
        return;
      }
      setCreatedBooking(data.trip);
      setShowContract(false);
    } catch {
      setSubmitError('Không kết nối được máy chủ, vui lòng thử lại hoặc gọi hotline.');
      return;
    } finally {
      setSubmitting(false);
      setHumanReset((n) => n + 1);
    }
    setCustomerName('');
    setCustomerPhone('');
    setDropoffLocation('');
    setDropoffPlaceId(null);
    setCustomerNotes('');
  };

  if (!tenant) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-sm text-slate-500">
        {catalogError ? 'Chưa tải được danh sách xe. Vui lòng tải lại trang.' : 'Đang tải danh sách xe...'}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Header */}
      <header className="glass sticky top-0 z-30 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <Car className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-sm font-semibold truncate">Thuê xe nhà</h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowLookupModal(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium text-slate-700 hover:bg-slate-200/70 transition"
            >
              <Search className="w-4 h-4 text-slate-500" />
              <span>Tra cứu lịch đặt</span>
            </button>

            <a
              href={`tel:${tenant.hotline.replace(/\./g, '')}`}
              className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{tenant.hotline}</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-white to-slate-50 pb-8 sm:pb-12">
        <Suspense fallback={<div className="h-[440px] sm:h-[560px]" />}>
          <CarShowcase3D />
        </Suspense>
        <div className="max-w-3xl mx-auto text-center px-4">
          <div className="pt-2 flex justify-center">
            <div className="inline-flex rounded-full bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setServiceType('WITH_DRIVER')}
                className={`px-5 h-9 rounded-full text-sm font-medium transition ${
                  serviceType === 'WITH_DRIVER'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Có tài xế
              </button>
              <button
                type="button"
                onClick={() => setServiceType('SELF_DRIVE')}
                className={`px-5 h-9 rounded-full text-sm font-medium transition ${
                  serviceType === 'SELF_DRIVE'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tự lái theo ngày
              </button>
            </div>
          </div>
        </div>

        <datalist id="province-options">
          {PROVINCES.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>

        {/* Chọn điểm đi / điểm đến ngay trên trang; dùng chung state với form đặt xe nên mở form là đã điền sẵn */}
        <div className="max-w-3xl mx-auto px-4 mt-6">
          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-5 space-y-3 text-left">
            <h2 className="text-lg font-semibold">Bạn muốn đến đâu?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-medium text-slate-700">Điểm đi</label>
                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    disabled={locating}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:text-slate-400"
                  >
                    <LocateFixed className="w-3.5 h-3.5" />
                    {locating ? 'Đang định vị...' : 'Vị trí của tôi'}
                  </button>
                </div>
                <PlaceInput
                  value={pickupLocation}
                  onChange={setPickupLocation}
                  onPick={setPickupPlaceId}
                  fallbackList="province-options"
                  placeholder="Gõ địa chỉ đón..."
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Điểm đến</label>
                <PlaceInput
                  value={dropoffLocation}
                  onChange={setDropoffLocation}
                  onPick={setDropoffPlaceId}
                  fallbackList="province-options"
                  placeholder="Gõ nơi bạn muốn đến..."
                />
              </div>
            </div>
            {locateError && <p className="text-xs text-amber-700">{locateError}</p>}
            {routeInfo && (
              <>
                <div className="relative">
                  {routeInfo.line && routeInfo.line.length > 1 && (
                    <Suspense fallback={<div className="h-52 w-full rounded-xl bg-slate-100 animate-pulse" />}>
                      <RouteMap line={routeInfo.line} bbox={routeInfo.bbox} />
                    </Suspense>
                  )}
                  <div
                    className={`${
                      routeInfo.line && routeInfo.line.length > 1 ? 'absolute left-2 top-2 shadow-sm' : ''
                    } inline-flex items-center gap-1.5 rounded-full bg-white/95 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-800`}
                  >
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    {routeInfo.minutes >= 60
                      ? `${Math.floor(routeInfo.minutes / 60)}h${String(routeInfo.minutes % 60).padStart(2, '0')}'`
                      : `${routeInfo.minutes}'`}{' '}
                    · {routeInfo.km} km
                  </div>
                </div>

                {/* Danh sách xe như app gọi xe: tự lái hiện giá/ngày, có tài xế tính theo cước nên mời gọi hotline */}
                <div className="divide-y divide-slate-100 -mx-1">
                  {plannerVehicles.map((veh) => {
                    const active = veh.id === plannerVehicle?.id;
                    return (
                      <button
                        key={veh.id}
                        type="button"
                        onClick={() => setPlannerVehicleId(veh.id)}
                        className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-xl text-left border transition ${
                          active ? 'border-blue-500 bg-blue-50/60' : 'border-transparent hover:bg-slate-50'
                        }`}
                      >
                        <div className="w-16 h-11 shrink-0 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center">
                          {veh.images?.[0] ? (
                            <img
                              src={veh.images[0]}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Car className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 truncate">
                            {veh.brand} {veh.model}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <User className="w-3.5 h-3.5" /> {veh.seatCategory}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {serviceType === 'SELF_DRIVE' ? (
                            <>
                              <div className="font-semibold text-slate-900">{formatVND(veh.dailyRateSelfDrive)}</div>
                              <div className="text-[11px] text-slate-500">/ngày</div>
                            </>
                          ) : taxiPrice(veh, routeInfo.km) !== null ? (
                            <>
                              <div className="font-semibold text-slate-900">{formatVND(taxiPrice(veh, routeInfo.km)!)}</div>
                              <div className="text-[11px] text-slate-500">một chiều</div>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-500">LH Hotline</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* pr-14 trên điện thoại: chừa chỗ cho cụm nút liên hệ nổi bên phải (FloatingContact) */}
                {serviceType === 'WITH_DRIVER' && (
                  <p className="text-[11px] text-slate-500">
                    Giá có tài xế tạm tính theo km một chiều ({formatVND(taxiFare.perKm4To5Seats)}/km xe 4–5 chỗ,{' '}
                    {formatVND(taxiFare.perKm7Seats)}/km xe 7 chỗ)
                    {taxiFare.holidaySurchargePerKm > 0 && `; ngày lễ cộng ${formatVND(taxiFare.holidaySurchargePerKm)}/km`}.
                  </p>
                )}

                <div className="sticky bottom-2 z-10 flex items-center gap-2 pr-14 sm:pr-0">
                  {serviceType === 'WITH_DRIVER' && tenant?.hotline && (
                    <a
                      href={`tel:${tenant.hotline.replace(/\D/g, '')}`}
                      className="h-11 px-4 rounded-full bg-white border border-slate-200 shadow-sm text-sm font-medium text-slate-800 inline-flex items-center gap-1.5 shrink-0"
                    >
                      <Phone className="w-4 h-4 text-blue-600" /> {tenant.hotline}
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => plannerVehicle && handleOpenBookVehicle(plannerVehicle)}
                    disabled={!plannerVehicle}
                    className="flex-1 h-11 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-semibold shadow-sm transition"
                  >
                    Đặt xe
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Main Vehicle Catalog */}
      <main id="danh-sach-xe" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Filter Bar */}
        <div className="bg-white rounded-2xl p-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-slate-600 mr-1 shrink-0">Chọn số ghế:</span>
            {SEAT_OPTIONS.map((seat) => (
              <button
                key={seat}
                type="button"
                onClick={() => setSeatFilter(seat)}
                className={`px-3.5 h-8 rounded-full text-xs font-medium shrink-0 transition ${
                  seatFilter === seat
                    ? 'bg-slate-900 text-white'
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
              className="h-8 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800"
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
              className="bg-white rounded-2xl shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between"
            >
              <div>
              {veh.images?.[0] && (
                <img
                  src={veh.images[0]}
                  alt={`${veh.brand} ${veh.model}`}
                  loading="lazy"
                  decoding="async"
                  className="w-full aspect-[16/9] object-cover"
                />
              )}
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-xs font-medium">
                      {veh.seatCategory}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        veh.fuelType === 'ELECTRIC'
                          ? 'bg-emerald-100 text-emerald-700'
                          : veh.fuelType === 'DIESEL'
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {FUEL_TYPE_LABELS[veh.fuelType || 'GASOLINE']}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      veh.status === 'AVAILABLE'
                        ? 'text-emerald-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {veh.status === 'AVAILABLE' ? '● Sẵn sàng nhận lịch' : '● Đặt lịch trước'}
                  </span>
                </div>

                <div>
                  <div className="text-xs text-slate-500">
                    {veh.brand} • {veh.vehicleType} • Đời {veh.year}
                  </div>
                  <h3 className="text-xl font-semibold tracking-tight text-slate-900 mt-0.5">{veh.model}</h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Màu: <strong>{veh.color}</strong>
                    {veh.plateNumber && (
                      <>
                        {' '}• Biển số:{' '}
                        <span className="font-mono font-bold text-slate-800">{veh.plateNumber}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Giá thuê tham khảo:</span>
                    <strong className="text-slate-900 text-sm">
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
                  <div className="text-xs text-slate-500 pt-1 border-t border-slate-200/60">
                    ✓ Xe trang bị sẵn thẻ thu phí tự động ETC Cao tốc, bảo hiểm đầy đủ.
                  </div>
                </div>
              </div>
              </div>

              <div className="px-5 pb-5">
                <button
                  type="button"
                  onClick={() => handleOpenBookVehicle(veh)}
                  className="w-full h-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Chọn đặt lịch xe này</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <TravelInfoSections
        destinations={siteContent.destinations}
        faqs={siteContent.faqs}
        onPickDestination={(name) => {
          setDropoffLocation(name);
          setDropoffPlaceId(null);
          document.getElementById('danh-sach-xe')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      <FloatingContact
        hotline={tenant.hotline}
        facebookUrl={siteContent.facebookUrl}
        onBook={() => document.getElementById('danh-sach-xe')?.scrollIntoView({ behavior: 'smooth' })}
      />

      {/* Footer (Không lộ nút Admin, chỉ có thông tin công ty) */}
      <SiteFooter
        hotline={tenant.hotline}
        onSelectService={(s) => {
          setServiceType(s);
          document.getElementById('danh-sach-xe')?.scrollIntoView({ behavior: 'smooth' });
        }}
        onOpenLookup={() => setShowLookupModal(true)}
      />

      {/* Modal Đặt Lịch Xe Dành Cho Khách Hàng */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="bg-white text-slate-900 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  Đặt Lịch Xe: [{selectedVehicle.seatCategory}] {selectedVehicle.brand}{' '}
                  {selectedVehicle.model}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedVehicle.plateNumber && `Biển số: ${selectedVehicle.plateNumber} • `}Xác nhận lịch tự động qua Zalo / SĐT
                </p>
                {!createdBooking && vehicles.length > 1 && (
                  <select
                    value={selectedVehicle.id}
                    onChange={(e) => {
                      const v = vehicles.find((x) => x.id === e.target.value);
                      if (v) setSelectedVehicle(v);
                    }}
                    aria-label="Đổi xe"
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                  >
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        [{v.seatCategory}] {v.brand} {v.model}
                        {v.plateNumber && ` · ${v.plateNumber}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedVehicle(null);
                  setCreatedBooking(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900"
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
                  Yêu cầu đặt xe của quý khách đã được chuyển tới bộ phận điều hành của{' '}
                  <strong>Thuê xe nhà</strong>. Chúng tôi sẽ xác nhận lại qua Zalo hoặc số điện thoại.
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
                      {selectedVehicle.model}
                      {selectedVehicle.plateNumber && ` (${selectedVehicle.plateNumber})`}
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
                      {createdBooking.pickupLocation} → {createdBooking.dropoffLocation} (
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
                {/* Đang xem hợp đồng thì ẩn các ô nhập (vẫn giữ trong form để giữ giá trị) */}
                <div className={showContract ? 'hidden' : 'space-y-4'}>
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
                    Xe Có Tài Xế
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
                    Thuê Tự Lái
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
                    <div>
                      <label className="block font-bold text-emerald-900 mb-1">Ngày sinh *</label>
                      <input
                        type="date"
                        value={customerBirthDate}
                        onChange={(e) => setCustomerBirthDate(e.target.value)}
                        max={todayLocal()}
                        className="w-full rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-emerald-900 mb-1">CCCD cấp ngày *</label>
                      <input
                        type="date"
                        value={customerCccdIssueDate}
                        onChange={(e) => setCustomerCccdIssueDate(e.target.value)}
                        max={todayLocal()}
                        className="w-full rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block font-bold text-emerald-900 mb-1">Nơi cấp CCCD *</label>
                      <input
                        type="text"
                        value={customerCccdIssuePlace}
                        onChange={(e) => setCustomerCccdIssuePlace(e.target.value)}
                        placeholder="Cục Cảnh sát QLHC về TTXH"
                        className="w-full rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block font-bold text-emerald-900 mb-1">Địa chỉ thường trú *</label>
                      <input
                        type="text"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        placeholder="Số nhà, đường, phường/xã, tỉnh/thành"
                        className="w-full rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block font-bold text-emerald-900 mb-1">Nhận xe *</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setDeliveryMode('SELF_PICKUP')}
                          className={`py-2 rounded-lg font-bold border transition ${
                            deliveryMode === 'SELF_PICKUP'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-700 border-emerald-300'
                          }`}
                        >
                          Tự đến lấy xe
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeliveryMode('DELIVERY')}
                          className={`py-2 rounded-lg font-bold border transition ${
                            deliveryMode === 'DELIVERY'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-700 border-emerald-300'
                          }`}
                        >
                          Giao tận nơi (+{formatVND(DELIVERY_FEE)})
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className={`grid gap-2.5 ${serviceType === 'SELF_DRIVE' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {serviceType === 'SELF_DRIVE' ? 'Ngày nhận xe *' : 'Ngày khởi hành *'}
                    </label>
                    <input
                      type="date"
                      value={tripDate}
                      min={todayLocal()}
                      onChange={(e) => setTripDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-2.5 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {serviceType === 'SELF_DRIVE' ? 'Giờ nhận' : 'Giờ đón'}
                    </label>
                    <input
                      type="time"
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-2.5 py-2"
                    />
                  </div>
                  {serviceType === 'SELF_DRIVE' && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Ngày trả xe *</label>
                      <input
                        type="date"
                        value={tripEndDate}
                        min={tripDate}
                        onChange={(e) => setTripEndDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-2.5 py-2"
                        required
                      />
                    </div>
                  )}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {serviceType === 'SELF_DRIVE' ? 'Giờ trả' : 'Giờ về dự kiến'}
                    </label>
                    <input
                      type="time"
                      value={returnTime}
                      onChange={(e) => setReturnTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-2.5 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(serviceType !== 'SELF_DRIVE' || deliveryMode === 'DELIVERY') && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {serviceType === 'SELF_DRIVE' ? 'Địa chỉ giao xe *' : 'Điểm đón khách *'}
                      </label>
                      <PlaceInput
                        value={pickupLocation}
                        onChange={setPickupLocation}
                        onPick={setPickupPlaceId}
                        fallbackList="province-options"
                        placeholder="Chọn tỉnh/thành hoặc gõ địa chỉ đón..."
                        required
                      />
                    </div>
                  )}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Điểm đến *</label>
                    <PlaceInput
                      value={dropoffLocation}
                      onChange={setDropoffLocation}
                      onPick={setDropoffPlaceId}
                      fallbackList="province-options"
                      placeholder="Chọn tỉnh/thành hoặc gõ điểm đến..."
                      required
                    />
                  </div>
                </div>
                {routeInfo && (
                  <p className="text-xs text-slate-600">
                    Quãng đường ước tính: <strong>{routeInfo.km} km</strong> · khoảng{' '}
                    <strong>
                      {routeInfo.minutes >= 60
                        ? `${Math.floor(routeInfo.minutes / 60)} giờ ${routeInfo.minutes % 60} phút`
                        : `${routeInfo.minutes} phút`}
                    </strong>{' '}
                    (một chiều) · giá tạm tính theo quãng đường này
                  </p>
                )}
                {routeInfo?.line && routeInfo.line.length > 1 && (
                  <Suspense fallback={<div className="h-52 w-full rounded-xl bg-slate-100 animate-pulse" />}>
                    <RouteMap line={routeInfo.line} bbox={routeInfo.bbox} />
                  </Suspense>
                )}

                {/* Chọn lộ trình Cao tốc vs Quốc lộ (chỉ ảnh hưởng giá xe có tài xế, tự lái không cần) */}
                {serviceType !== 'SELF_DRIVE' && (
                <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 space-y-2.5">
                  <label className="block font-bold text-blue-950">
                    Tùy chọn lộ trình di chuyển (Cao tốc hay Quốc lộ):
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
                      Đi Đường Cao Tốc (Nhanh)
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
                      Đi Đường Quốc Lộ
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
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
                )}

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
                </div>

                {showContract && (
                  <RentalContract
                    tenant={tenant}
                    vehicle={selectedVehicle}
                    data={{
                      customerName,
                      customerPhone,
                      customerBirthDate,
                      customerCccd,
                      customerCccdIssueDate,
                      customerCccdIssuePlace,
                      customerLicense,
                      customerAddress,
                      tripDate,
                      departureTime,
                      tripEndDate,
                      returnTime,
                      rentalDays,
                      deliveryMode,
                      deliveryAddress: pickupLocation,
                      deliveryFee,
                      destination: dropoffLocation,
                    }}
                  />
                )}

                {submitError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold">
                    {submitError}
                  </div>
                )}

                {/* Xác minh người thật ở bước gửi lịch (tự lái: sau khi xem hợp đồng) */}
                {(serviceType !== 'SELF_DRIVE' || showContract) && (
                  <HumanCheck onToken={setHumanToken} resetSignal={humanReset} />
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  {serviceType === 'SELF_DRIVE' && (
                    <div className="mr-auto">
                      <p className="text-[11px] text-slate-500">Tạm tính</p>
                      <p className="text-xl font-extrabold text-emerald-700 leading-tight">
                        {formatVND(selectedVehicle.dailyRateSelfDrive * rentalDays + deliveryFee)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {rentalDays} ngày × {formatVND(selectedVehicle.dailyRateSelfDrive)}
                        {deliveryFee > 0 && <> + giao xe {formatVND(deliveryFee)}</>}
                      </p>
                      {selectedVehicle.fuelType === 'ELECTRIC' && (
                        <p className="text-[11px] font-semibold text-amber-700">
                          Lưu ý: Tiền điện tính theo km thực tế
                        </p>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => (showContract ? setShowContract(false) : setSelectedVehicle(null))}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 font-semibold text-slate-600 whitespace-nowrap"
                  >
                    {showContract ? 'Quay lại sửa' : 'Hủy'}
                  </button>
                  <button
                    type="submit"
                    disabled={
                      submitting ||
                      (HUMAN_CHECK_ENABLED && !humanToken && (serviceType !== 'SELF_DRIVE' || showContract))
                    }
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-extrabold transition whitespace-nowrap"
                  >
                    {submitting
                      ? 'Đang gửi...'
                      : serviceType === 'SELF_DRIVE' && !showContract
                        ? 'Xem hợp đồng'
                        : 'Xác Nhận Đặt Lịch Xe'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Tra cứu lịch đặt xe của Khách hàng */}
      {showLookupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="bg-white text-slate-900 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
              <h4 className="text-sm font-bold">Tra cứu trạng thái lịch đặt xe</h4>
              <button
                type="button"
                onClick={() => setShowLookupModal(false)}
                className="text-slate-400 hover:text-slate-900"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <form onSubmit={handleLookup} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Mã chuyến <span className="font-normal text-slate-400">(không bắt buộc)</span>
                    </label>
                    <input
                      type="text"
                      value={lookupCode}
                      onChange={(e) => setLookupCode(e.target.value)}
                      placeholder="VD: KH-1107-7K3QXM"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Số điện thoại đặt xe</label>
                    <input
                      type="tel"
                      value={lookupPhone}
                      onChange={(e) => setLookupPhone(e.target.value)}
                      placeholder="VD: 0903888111"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold"
                      required
                    />
                  </div>
                </div>
                <HumanCheck onToken={setHumanToken} resetSignal={humanReset} />
                <button
                  type="submit"
                  disabled={HUMAN_CHECK_ENABLED && !humanToken}
                  className="w-full py-2.5 rounded-xl bg-slate-900 disabled:bg-slate-400 text-white font-bold"
                >
                  Tra cứu
                </button>
              </form>

              {lookupError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold">
                  {lookupError}
                </div>
              )}

              {lookupResult && (
                <div className="space-y-2.5 max-h-72 overflow-y-auto">
                  {lookupResult.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 bg-slate-50 rounded-xl">
                      Không tìm thấy lịch đặt xe nào với thông tin này.
                    </div>
                  ) : (
                    lookupResult.map((tr) => {
                      const veh = tr.vehicle;
                      const drv = tr.driver;
                      return (
                        <div
                          key={tr.tripCode}
                          className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-bold">
                              #{tr.tripCode}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                              {tr.status === 'PENDING_CONFIRM'
                                ? 'Đang điều phối tài xế'
                                : 'Đã xác nhận lịch'}
                            </span>
                          </div>
                          <div className="font-bold text-slate-900">
                            {tr.pickupLocation && `${tr.pickupLocation} → ${tr.dropoffLocation} `}(
                            {tr.tripDate} lúc {tr.departureTime})
                          </div>
                          <div>
                            • Xe phục vụ:{' '}
                            <strong>
                              [{veh?.seatCategory}] {veh?.brand} {veh?.model}
                              {veh?.plateNumber && ` (${veh.plateNumber})`}
                            </strong>
                          </div>
                          {!tr.pickupLocation && (
                            <div className="text-slate-500">
                              Nhập thêm mã chuyến để xem điểm đón/trả, biển số xe và tài xế.
                            </div>
                          )}
                          {drv && (
                            <div>
                              • Tài xế phụ trách: <strong>{drv.fullName}</strong> — SĐT:{' '}
                              <strong>{drv.phone}</strong>
                            </div>
                          )}
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
