import React, { useState } from 'react';
import {
  Car,
  FileCheck2,
  Plus,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  Driver,
  SeatCategory,
  ServiceMode,
  Trip,
  Vehicle,
  VehicleType,
} from '../types/fleet';
import { calculateTripFinancials, formatVND } from '../utils/calculations';

interface FleetAndDriversTabProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  trips: Trip[];
  activeTenantId: string;
  isMobile?: boolean;
  onAddVehicle: (veh: Omit<Vehicle, 'id'>) => void;
  onAddDriver: (drv: Omit<Driver, 'id'>) => void;
}

const SEAT_CATEGORIES: SeatCategory[] = [
  '4 chỗ',
  '5 chỗ',
  '7 chỗ',
  '9 chỗ Limousine',
  '16 chỗ',
  '29 chỗ',
];

export const FleetAndDriversTab: React.FC<FleetAndDriversTabProps> = ({
  vehicles,
  drivers,
  trips,
  activeTenantId,
  isMobile = false,
  onAddVehicle,
  onAddDriver,
}) => {
  const [subTab, setSubTab] = useState<'VEHICLES' | 'DRIVERS'>('VEHICLES');
  const [seatFilter, setSeatFilter] = useState<'ALL' | SeatCategory>('ALL');
  const [brandFilter, setBrandFilter] = useState<string>('ALL');

  // Add Vehicle Modal
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vPlate, setVPlate] = useState('');
  const [vBrand, setVBrand] = useState('Toyota');
  const [vModel, setVModel] = useState('');
  const [vType, setVType] = useState<VehicleType>('MPV Đa dụng');
  const [vSeat, setVSeat] = useState<SeatCategory>('7 chỗ');
  const [vYear, setVYear] = useState(2025);
  const [vColor, setVColor] = useState('Trắng');
  const [vMode, setVMode] = useState<ServiceMode>('BOTH');
  const [vDailyRate, setVDailyRate] = useState(950000);
  const [vFuelCostPerKm, setVFuelCostPerKm] = useState(2100);
  const [vTollMult, setVTollMult] = useState(1.0);

  // Add Driver Modal
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [dName, setDName] = useState('');
  const [dPhone, setDPhone] = useState('');
  const [dCccd, setDCccd] = useState('');
  const [dLicenseNo, setDLicenseNo] = useState('');
  const [dLicenseClass, setDLicenseClass] = useState<Driver['licenseClass']>('B2');
  const [dLicenseExpiry, setDLicenseExpiry] = useState('2029-12-31');
  const [dExpYears, setDExpYears] = useState(5);
  const [dAddress, setDAddress] = useState('TP.HCM');
  const [dBankName, setDBankName] = useState('Vietcombank');
  const [dBankAccount, setDBankAccount] = useState('');
  const [dTelegram, setDTelegram] = useState('');
  const [dZalo, setDZalo] = useState('');

  const brands = Array.from(new Set(vehicles.map((v) => v.brand)));

  const filteredVehicles = vehicles.filter((v) => {
    if (seatFilter !== 'ALL' && v.seatCategory !== seatFilter) return false;
    if (brandFilter !== 'ALL' && v.brand !== brandFilter) return false;
    return true;
  });

  const handleCreateVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    onAddVehicle({
      tenantId: activeTenantId,
      plateNumber: vPlate.trim() || '51K-999.88',
      brand: vBrand.trim() || 'Toyota',
      model: vModel.trim() || 'Innova Cross',
      vehicleType: vType,
      seatCategory: vSeat,
      year: Number(vYear) || 2025,
      color: vColor,
      serviceMode: vMode,
      dailyRateSelfDrive: Number(vDailyRate) || 900000,
      fuelCostPerKm: Number(vFuelCostPerKm) || 2000,
      highwayTollMultiplier: Number(vTollMult) || 1.0,
      status: 'AVAILABLE',
      currentOdoKm: 10000,
      inspectionExpiry: '2027-06-30',
      insuranceExpiry: '2027-06-30',
      notes: 'Xe mới thêm vào đội xe',
    });
    setShowAddVehicle(false);
    setVPlate('');
    setVModel('');
  };

  const handleCreateDriver = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedTg = dTelegram.startsWith('@')
      ? dTelegram
      : `@${dTelegram || dName.toLowerCase().replace(/\s+/g, '_')}`;

    onAddDriver({
      tenantId: activeTenantId,
      code: `TX-00${drivers.length + 1}`,
      fullName: dName.trim() || 'Tài xế mới',
      phone: dPhone.trim() || '0909123456',
      cccd: dCccd.trim() || '079090001122',
      licenseNumber: dLicenseNo.trim() || '7901888999',
      licenseClass: dLicenseClass,
      licenseExpiry: dLicenseExpiry,
      experienceYears: Number(dExpYears) || 5,
      address: dAddress,
      bankName: dBankName,
      bankAccount: dBankAccount.trim() || '007100123456',
      telegramUsername: formattedTg,
      zaloPhone: dZalo.trim() || dPhone.trim() || '0909123456',
      status: 'ACTIVE',
      baseCommissionPercent: 10,
      documentsVerified: {
        cccd: true,
        driverLicense: true,
        contract: true,
        healthCert: true,
      },
      notes: 'Hồ sơ người lái đã xác thực đầy đủ',
    });
    setShowAddDriver(false);
    setDName('');
    setDPhone('');
  };

  return (
    <div className="space-y-4">
      {/* Sub-navigation: Đội Xe vs Hồ Sơ Tài Xế */}
      <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
        <div className="grid grid-cols-2 w-full sm:w-auto sm:inline-flex rounded-xl bg-slate-100 p-1 gap-1">
          <button
            type="button"
            onClick={() => setSubTab('VEHICLES')}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition ${
              subTab === 'VEHICLES'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Car className="w-4 h-4 shrink-0" />
            <span>Đội Xe ({vehicles.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('DRIVERS')}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition ${
              subTab === 'DRIVERS'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Hồ Sơ Tài Xế ({drivers.length})</span>
          </button>
        </div>

        {subTab === 'VEHICLES' ? (
          <button
            type="button"
            onClick={() => setShowAddVehicle(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Xe Mới (4 chỗ, 7 chỗ...)</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddDriver(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Hồ Sơ Tài Xế / Người Lái</span>
          </button>
        )}
      </div>

      {subTab === 'VEHICLES' ? (
        <div className="space-y-3.5">
          {/* Bộ lọc Loại Ghế & Hãng Xe */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 space-y-2.5">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-xs font-bold text-slate-600 mr-1 shrink-0">Loại ghế:</span>
              <button
                type="button"
                onClick={() => setSeatFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition ${
                  seatFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Tất cả ({vehicles.length})
              </button>
              {SEAT_CATEGORIES.map((seat) => {
                const count = vehicles.filter((v) => v.seatCategory === seat).length;
                return (
                  <button
                    key={seat}
                    type="button"
                    onClick={() => setSeatFilter(seat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition ${
                      seatFilter === seat
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {seat} ({count})
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Hãng xe:</span>
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold flex-1 sm:flex-initial"
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

          {/* Grid Danh sách Xe */}
          <div
            className={
              isMobile
                ? 'grid grid-cols-1 gap-3'
                : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            }
          >
            {filteredVehicles.map((veh) => {
              const vehTrips = trips.filter((t) => t.vehicleId === veh.id);
              const totalNet = vehTrips.reduce(
                (acc, t) => acc + calculateTripFinancials(t).netRemainingToAccount,
                0
              );

              return (
                <div
                  key={veh.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between hover:border-blue-400 transition"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-extrabold">
                        {veh.seatCategory}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          veh.status === 'AVAILABLE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : veh.status === 'ON_TRIP'
                            ? 'bg-blue-100 text-blue-800'
                            : veh.status === 'BOOKED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {veh.status === 'AVAILABLE'
                          ? '● Đang trống'
                          : veh.status === 'ON_TRIP'
                          ? '● Đang chạy'
                          : veh.status === 'BOOKED'
                          ? '● Đã giữ lịch'
                          : '● Bảo dưỡng'}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          {veh.brand} • {veh.vehicleType}
                        </div>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                          {veh.model}
                        </h3>
                      </div>
                      <span className="px-2 py-1 rounded-md bg-slate-900 text-amber-300 font-mono text-xs font-bold shrink-0">
                        {veh.plateNumber}
                      </span>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span>Hình thức:</span>
                        <strong className="text-slate-900">
                          {veh.serviceMode === 'BOTH'
                            ? 'Tự lái & Có tài xế'
                            : veh.serviceMode === 'SELF_DRIVE'
                            ? 'Thuê tự lái'
                            : 'Có tài xế'}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Giá tự lái chuẩn:</span>
                        <strong className="text-emerald-700">
                          {formatVND(veh.dailyRateSelfDrive)}/ngày
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Định mức xăng tự trừ:</span>
                        <strong className="text-amber-700">{formatVND(veh.fuelCostPerKm)}/km</strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Đã chạy: <strong className="text-slate-800">{vehTrips.length} chuyến</strong>
                    </span>
                    <span className="font-bold text-blue-700">
                      Thực thu: {formatVND(totalNet)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Danh Sách Hồ Sơ Tài Xế / Người Lái */
        <div
          className={
            isMobile ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 md:grid-cols-2 gap-4'
          }
        >
          {drivers.map((drv) => {
            const drvTrips = trips.filter((t) => t.driverId === drv.id);
            const totalNet = drvTrips.reduce(
              (acc, t) => acc + calculateTripFinancials(t).netRemainingToAccount,
              0
            );
            const totalFine = drvTrips.reduce(
              (acc, t) => acc + (Number(t.trafficFineFee) || 0),
              0
            );
            const totalParking = drvTrips.reduce(
              (acc, t) => acc + (Number(t.parkingFee) || 0),
              0
            );

            return (
              <div
                key={drv.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3.5 hover:border-blue-400 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
                      {drv.fullName
                        .split(' ')
                        .slice(-2)
                        .map((w) => w[0])
                        .join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                          {drv.fullName}
                        </h3>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {drv.code}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        <span className="font-semibold text-blue-700">
                          Bằng GPLX: {drv.licenseClass}
                        </span>{' '}
                        • {drv.experienceYears} năm KN
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      drv.status === 'ON_TRIP'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {drv.status === 'ON_TRIP' ? '🚗 Đang chạy' : '✅ Sẵn sàng'}
                  </span>
                </div>

                {/* Chi tiết Hồ sơ Người lái */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
                  <div>
                    <div className="text-slate-400 text-[10px]">Số CCCD</div>
                    <div className="font-bold text-slate-800">{drv.cccd}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">Số GPLX</div>
                    <div className="font-bold text-slate-800">{drv.licenseNumber}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">Tag Telegram</div>
                    <div className="font-bold text-blue-600 truncate">{drv.telegramUsername}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">Zalo / SĐT</div>
                    <div className="font-bold text-slate-800">{drv.zaloPhone}</div>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">TK Nhận tiền:</span>
                    <strong className="text-slate-900">
                      {drv.bankName} — {drv.bankAccount}
                    </strong>
                  </div>
                </div>

                {/* Trạng thái Hồ sơ giấy tờ */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    CCCD: Đã lưu
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold">
                    <FileCheck2 className="w-3 h-3 text-emerald-600" />
                    GPLX {drv.licenseClass}: Hợp lệ
                  </span>
                </div>

                {/* Thống kê nhanh tài chính & rủi ro của tài xế */}
                <div className="pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 rounded-lg p-2 flex justify-between items-center">
                    <span className="text-[10px] text-slate-500">Đậu xe + Phạt:</span>
                    <strong className="text-rose-600">
                      -{formatVND(totalParking + totalFine)}
                    </strong>
                  </div>
                  <div className="bg-emerald-50/70 rounded-lg p-2 flex justify-between items-center">
                    <span className="text-[10px] text-emerald-800 font-semibold">Thực còn:</span>
                    <strong className="text-emerald-700">{formatVND(totalNet)}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Thêm Xe Mới */}
      {showAddVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h4 className="text-sm font-bold">Thêm Xe Mới (Hãng, Loại Xe, Số Ghế)</h4>
              <button
                type="button"
                onClick={() => setShowAddVehicle(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateVehicle} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hãng xe *</label>
                  <input
                    type="text"
                    value={vBrand}
                    onChange={(e) => setVBrand(e.target.value)}
                    placeholder="Toyota, Mitsubishi..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dòng xe *</label>
                  <input
                    type="text"
                    value={vModel}
                    onChange={(e) => setVModel(e.target.value)}
                    placeholder="Innova / Xpander / Vios"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Loại ghế *</label>
                  <select
                    value={vSeat}
                    onChange={(e) => setVSeat(e.target.value as SeatCategory)}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm font-semibold"
                  >
                    {SEAT_CATEGORIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Biển số xe *</label>
                  <input
                    type="text"
                    value={vPlate}
                    onChange={(e) => setVPlate(e.target.value)}
                    placeholder="51K-888.99"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold uppercase"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giá tự lái/ngày</label>
                  <input
                    type="number"
                    step="50000"
                    value={vDailyRate}
                    onChange={(e) => setVDailyRate(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Định mức xăng/km</label>
                  <input
                    type="number"
                    step="100"
                    value={vFuelCostPerKm}
                    onChange={(e) => setVFuelCostPerKm(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddVehicle(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-semibold text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold"
                >
                  Lưu Xe Mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thêm Hồ Sơ Tài Xế / Người Lái */}
      {showAddDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <h4 className="text-sm font-bold">Thêm Hồ Sơ Tài Xế & Liên Kết Zalo / Telegram</h4>
              <button
                type="button"
                onClick={() => setShowAddDriver(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateDriver} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Họ và tên tài xế *</label>
                  <input
                    type="text"
                    value={dName}
                    onChange={(e) => setDName(e.target.value)}
                    placeholder="Nguyễn Văn An"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số điện thoại *</label>
                  <input
                    type="text"
                    value={dPhone}
                    onChange={(e) => setDPhone(e.target.value)}
                    placeholder="0909xxxxxx"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số CCCD *</label>
                  <input
                    type="text"
                    value={dCccd}
                    onChange={(e) => setDCccd(e.target.value)}
                    placeholder="07909xxxxxxx"
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số GPLX *</label>
                  <input
                    type="text"
                    value={dLicenseNo}
                    onChange={(e) => setDLicenseNo(e.target.value)}
                    placeholder="7901xxxxxxxx"
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hạng bằng</label>
                  <select
                    value={dLicenseClass}
                    onChange={(e) => setDLicenseClass(e.target.value as Driver['licenseClass'])}
                    className="w-full rounded-lg border border-slate-300 px-2 py-2 text-xs font-bold"
                  >
                    <option value="B1">B1</option>
                    <option value="B2">B2 (4-9 chỗ)</option>
                    <option value="C">C</option>
                    <option value="D">D (10-30 chỗ)</option>
                    <option value="E">E</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-blue-50 p-3 rounded-xl border border-blue-200">
                <div>
                  <label className="block font-bold text-blue-900 mb-1">Telegram (@Tag)</label>
                  <input
                    type="text"
                    value={dTelegram}
                    onChange={(e) => setDTelegram(e.target.value)}
                    placeholder="@taixe_an"
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-blue-900 mb-1">SĐT Zalo</label>
                  <input
                    type="text"
                    value={dZalo}
                    onChange={(e) => setDZalo(e.target.value)}
                    placeholder="0909xxxxxx"
                    className="w-full rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDriver(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-semibold text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold"
                >
                  Lưu Hồ Sơ Tài Xế
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
