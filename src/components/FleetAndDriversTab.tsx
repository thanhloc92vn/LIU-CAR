import React, { useState } from 'react';
import {
  Car,
  Edit3,
  FileCheck2,
  ImagePlus,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  Driver,
  FUEL_TYPE_LABELS,
  FuelType,
  SeatCategory,
  ServiceMode,
  Trip,
  Vehicle,
  VehicleType,
} from '../types/fleet';
import { normalizePlate, ownerPlates } from '../utils/party';
import { calculateTripFinancials, formatVND } from '../utils/calculations';
import { fileToCompressedDataUrl, MAX_VEHICLE_IMAGES } from '../utils/image';

const FUEL_BADGE_CLASS: Record<FuelType, string> = {
  ELECTRIC: 'bg-teal-100 text-teal-800 border border-teal-300',
  GASOLINE: 'bg-orange-100 text-orange-800 border border-orange-300',
  DIESEL: 'bg-slate-200 text-slate-800 border border-slate-400',
};

interface FleetAndDriversTabProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  trips: Trip[];
  activeTenantId: string;
  isMobile?: boolean;
  onAddVehicle: (veh: Omit<Vehicle, 'id'>) => void;
  onUpdateVehicle?: (veh: Vehicle) => void;
  onDeleteVehicle?: (vehId: string) => void;
  onAddDriver: (drv: Omit<Driver, 'id'>) => void;
  onUpdateDriver?: (drv: Driver) => void;
  onDeleteDriver?: (drvId: string) => void;
  // Tài xế đã liên kết Telegram: mã tài xế -> thời điểm liên kết
  telegramLinks?: Record<string, string>;
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
  onUpdateVehicle,
  onDeleteVehicle,
  onAddDriver,
  onUpdateDriver,
  onDeleteDriver,
  telegramLinks = {},
}) => {
  // Tạo mã liên kết 6 số, không trùng mã của tài xế khác
  const createLinkCode = (drv: Driver) => {
    const used = new Set(drivers.map((d) => d.telegramLinkCode));
    let code = '';
    do {
      const n = new Uint32Array(1);
      crypto.getRandomValues(n);
      code = String(100000 + (n[0] % 900000));
    } while (used.has(code));
    onUpdateDriver?.({ ...drv, telegramLinkCode: code });
  };

  const [subTab, setSubTab] = useState<'VEHICLES' | 'DRIVERS'>('VEHICLES');
  const [seatFilter, setSeatFilter] = useState<'ALL' | SeatCategory>('ALL');
  const [brandFilter, setBrandFilter] = useState<string>('ALL');

  // Add / Edit Vehicle Modal
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
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
  const [vFuelType, setVFuelType] = useState<FuelType>('GASOLINE');
  const [vTollMult, setVTollMult] = useState(1.0);
  const [vStatus, setVStatus] = useState<Vehicle['status']>('AVAILABLE');
  const [vImages, setVImages] = useState<string[]>([]);
  const [vImageError, setVImageError] = useState('');

  const handlePickImages = async (files: FileList | null) => {
    if (!files) return;
    setVImageError('');
    const room = MAX_VEHICLE_IMAGES - vImages.length;
    const picked = Array.from(files).slice(0, room);
    const added: string[] = [];
    for (const f of picked) {
      try {
        added.push(await fileToCompressedDataUrl(f));
      } catch (err: any) {
        setVImageError(err.message);
      }
    }
    if (files.length > room) setVImageError(`Chỉ được tối đa ${MAX_VEHICLE_IMAGES} ảnh`);
    if (added.length) setVImages((prev) => [...prev, ...added]);
  };

  // Add / Edit Driver Modal
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
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
  const [dPartyType, setDPartyType] = useState<'EXTERNAL_DRIVER' | 'VEHICLE_OWNER'>('EXTERNAL_DRIVER');
  const [dOwnedPlates, setDOwnedPlates] = useState<string[]>(['']);

  const brands = Array.from(new Set(vehicles.map((v) => v.brand)));

  const filteredVehicles = vehicles.filter((v) => {
    if (seatFilter !== 'ALL' && v.seatCategory !== seatFilter) return false;
    if (brandFilter !== 'ALL' && v.brand !== brandFilter) return false;
    return true;
  });

  const handleOpenEditVehicle = (veh: Vehicle) => {
    setEditingVehicle(veh);
    setVPlate(veh.plateNumber);
    setVBrand(veh.brand);
    setVModel(veh.model);
    setVType(veh.vehicleType);
    setVSeat(veh.seatCategory);
    setVYear(veh.year);
    setVColor(veh.color);
    setVMode(veh.serviceMode);
    setVDailyRate(veh.dailyRateSelfDrive);
    setVFuelCostPerKm(veh.fuelCostPerKm);
    setVFuelType(veh.fuelType || 'GASOLINE');
    setVTollMult(veh.highwayTollMultiplier);
    setVStatus(veh.status);
    setVImages(veh.images || []);
    setVImageError('');
    setShowAddVehicle(true);
  };

  const handleOpenEditDriver = (drv: Driver) => {
    setEditingDriver(drv);
    setDName(drv.fullName);
    setDPhone(drv.phone);
    setDCccd(drv.cccd);
    setDLicenseNo(drv.licenseNumber);
    setDLicenseClass(drv.licenseClass);
    setDLicenseExpiry(drv.licenseExpiry);
    setDExpYears(drv.experienceYears);
    setDAddress(drv.address);
    setDBankName(drv.bankName);
    setDBankAccount(drv.bankAccount);
    setDTelegram(drv.telegramUsername);
    setDZalo(drv.zaloPhone);
    setDPartyType(drv.partyType || 'EXTERNAL_DRIVER');
    setDOwnedPlates(ownerPlates(drv).length ? ownerPlates(drv) : ['']);
    setShowAddDriver(true);
  };

  const handleCreateOrSaveVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVehicle && onUpdateVehicle) {
      onUpdateVehicle({
        ...editingVehicle,
        plateNumber: vPlate.trim() || editingVehicle.plateNumber,
        brand: vBrand.trim() || editingVehicle.brand,
        model: vModel.trim() || editingVehicle.model,
        vehicleType: vType,
        seatCategory: vSeat,
        year: Number(vYear) || 2025,
        color: vColor,
        serviceMode: vMode,
        dailyRateSelfDrive: Number(vDailyRate) || 900000,
        fuelCostPerKm: Number(vFuelCostPerKm) || 2000,
        fuelType: vFuelType,
        highwayTollMultiplier: Number(vTollMult) || 1.0,
        status: vStatus,
        images: vImages,
      });
    } else {
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
        fuelType: vFuelType,
        highwayTollMultiplier: Number(vTollMult) || 1.0,
        status: vStatus,
        currentOdoKm: 10000,
        inspectionExpiry: '2027-06-30',
        insuranceExpiry: '2027-06-30',
        notes: 'Xe mới thêm vào đội xe',
        images: vImages,
      });
    }
    setShowAddVehicle(false);
    setEditingVehicle(null);
    setVPlate('');
    setVModel('');
  };

  const handleCreateOrSaveDriver = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedTg = dTelegram.startsWith('@')
      ? dTelegram
      : `@${dTelegram || dName.toLowerCase().replace(/\s+/g, '_')}`;

    if (editingDriver && onUpdateDriver) {
      onUpdateDriver({
        ...editingDriver,
        fullName: dName.trim() || editingDriver.fullName,
        phone: dPhone.trim() || editingDriver.phone,
        cccd: dCccd.trim() || editingDriver.cccd,
        licenseNumber: dLicenseNo.trim() || editingDriver.licenseNumber,
        licenseClass: dLicenseClass,
        licenseExpiry: dLicenseExpiry,
        experienceYears: Number(dExpYears) || 5,
        address: dAddress,
        bankName: dBankName,
        bankAccount: dBankAccount.trim() || editingDriver.bankAccount,
        telegramUsername: formattedTg,
        zaloPhone: dZalo.trim() || dPhone.trim(),
        partyType: dPartyType,
        ownedPlateNumbers:
          dPartyType === 'VEHICLE_OWNER'
            ? dOwnedPlates.map((p) => p.trim().toUpperCase()).filter(Boolean)
            : undefined,
        ownedPlateNumber: undefined,
      });
    } else {
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
        partyType: dPartyType,
        ownedPlateNumbers:
          dPartyType === 'VEHICLE_OWNER'
            ? dOwnedPlates.map((p) => p.trim().toUpperCase()).filter(Boolean)
            : undefined,
        ownedPlateNumber: undefined,
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
    }
    setShowAddDriver(false);
    setEditingDriver(null);
    setDName('');
    setDPhone('');
    setDPartyType('EXTERNAL_DRIVER');
    setDOwnedPlates(['']);
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
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Car className="w-4 h-4 shrink-0" />
            <span>Đội xe ({vehicles.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('DRIVERS')}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition ${
              subTab === 'DRIVERS'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Hồ sơ tài xế ({drivers.length})</span>
          </button>
        </div>

        {subTab === 'VEHICLES' ? (
          <button
            type="button"
            onClick={() => {
              setEditingVehicle(null);
              setVPlate('');
              setVModel('');
              setVImages([]);
              setVImageError('');
              setShowAddVehicle(true);
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm xe mới</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setEditingDriver(null);
              setDName('');
              setDPhone('');
              setDPartyType('EXTERNAL_DRIVER');
              setDOwnedPlates(['']);
              setShowAddDriver(true);
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm hồ sơ tài xế / người lái</span>
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
              const vehTrips = trips.filter((t) => t.vehicleId === veh.id && t.status === 'COMPLETED');
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
                    {veh.images?.[0] && (
                      <img
                        src={veh.images[0]}
                        alt={`${veh.brand} ${veh.model}`}
                        className="w-full h-36 object-cover rounded-xl mb-3"
                      />
                    )}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-xs font-medium">
                          {veh.seatCategory}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                            FUEL_BADGE_CLASS[veh.fuelType || 'GASOLINE']
                          }`}
                        >
                          {FUEL_TYPE_LABELS[veh.fuelType || 'GASOLINE']}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
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
                        <button
                          type="button"
                          onClick={() => handleOpenEditVehicle(veh)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                          title="Chỉnh sửa thông tin xe"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteVehicle && (
                          <button
                            type="button"
                            onClick={() => onDeleteVehicle(veh.id)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600"
                            title="Xóa xe"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold r text-slate-400">
                          {veh.brand} • {veh.vehicleType}
                        </div>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                          {veh.model}
                        </h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-md border border-slate-300 bg-white text-slate-800 font-mono text-xs font-medium shrink-0">
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
                        <span>
                          {veh.fuelType === 'ELECTRIC' ? 'Định mức sạc điện tự trừ:' : veh.fuelType === 'DIESEL' ? 'Định mức dầu tự trừ:' : 'Định mức xăng tự trừ:'}
                        </span>
                        <strong className="text-amber-700">{formatVND(veh.fuelCostPerKm)}/km</strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Đã hoàn thành: <strong className="text-slate-800">{vehTrips.length} chuyến</strong>
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
            const drvTrips = trips.filter((t) => t.driverId === drv.id && t.status === 'COMPLETED');
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
                    <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
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
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-bold">
                          {drv.code}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            drv.partyType === 'VEHICLE_OWNER'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {drv.partyType === 'VEHICLE_OWNER'
                            ? `Chủ xe${ownerPlates(drv).length ? ` · ${ownerPlates(drv).join(', ')}` : ''}`
                            : 'Tài xế ngoài'}
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

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        drv.status === 'ON_TRIP'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {drv.status === 'ON_TRIP' ? 'Đang chạy' : 'Sẵn sàng'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenEditDriver(drv)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                      title="Sửa hồ sơ tài xế"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {onDeleteDriver && (
                      <button
                        type="button"
                        onClick={() => onDeleteDriver(drv.id)}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600"
                        title="Xóa hồ sơ tài xế"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Chi tiết Hồ sơ Người lái */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
                  <div>
                    <div className="text-slate-400 text-xs">Số CCCD</div>
                    <div className="font-bold text-slate-800">{drv.cccd}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-xs">Số GPLX</div>
                    <div className="font-bold text-slate-800">{drv.licenseNumber}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-xs">Tag Telegram</div>
                    <div className="font-bold text-blue-600 truncate">{drv.telegramUsername}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-xs">Zalo / SĐT</div>
                    <div className="font-bold text-slate-800">{drv.zaloPhone}</div>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-200/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500">TK Nhận tiền:</span>
                    <strong className="text-slate-900">
                      {drv.bankName} — {drv.bankAccount}
                    </strong>
                  </div>
                </div>

                {/* Trạng thái Hồ sơ giấy tờ */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    CCCD: Đã lưu
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                    <FileCheck2 className="w-3 h-3 text-emerald-600" />
                    GPLX {drv.licenseClass} (Hạn: {drv.licenseExpiry})
                  </span>
                </div>

                {/* Liên kết Telegram: admin tạo mã, tài xế nhắn riêng cho bot để liên kết */}
                <div className="rounded-xl bg-slate-50 p-3 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-slate-700">Liên kết Telegram</span>
                    {telegramLinks[drv.id] ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                        Đã liên kết
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                        Chưa liên kết
                      </span>
                    )}
                  </div>
                  {drv.telegramLinkCode && !telegramLinks[drv.id] && (
                    <div className="rounded-lg bg-white border border-slate-200 p-2.5 space-y-1">
                      <div className="text-slate-500">Mã liên kết (gửi riêng cho tài xế):</div>
                      <div className="text-lg font-semibold tracking-widest text-slate-900">
                        {drv.telegramLinkCode}
                      </div>
                      <div className="text-slate-500">
                        Tài xế mở bot Telegram, bấm Start rồi gửi: <code className="font-semibold text-slate-800">/start {drv.telegramLinkCode}</code>
                      </div>
                    </div>
                  )}
                  {onUpdateDriver && (
                    <button
                      type="button"
                      onClick={() => createLinkCode(drv)}
                      className="h-8 px-3 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium transition"
                    >
                      {telegramLinks[drv.id] || drv.telegramLinkCode ? 'Cấp mã mới' : 'Tạo mã liên kết'}
                    </button>
                  )}
                </div>

                {/* Thống kê nhanh tài chính & rủi ro của tài xế */}
                <div className="pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 rounded-lg p-2 flex justify-between items-center">
                    <span className="text-xs text-slate-500">Đậu xe + Phạt:</span>
                    <strong className="text-rose-600">
                      -{formatVND(totalParking + totalFine)}
                    </strong>
                  </div>
                  <div className="bg-emerald-50/70 rounded-lg p-2 flex justify-between items-center">
                    <span className="text-xs text-emerald-800 font-semibold">Thực còn:</span>
                    <strong className="text-emerald-700">{formatVND(totalNet)}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Thêm / Sửa Xe */}
      {showAddVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="bg-white text-slate-900 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
              <h4 className="text-sm font-bold">
                {editingVehicle
                  ? `Cập Nhật Xe ${editingVehicle.plateNumber}`
                  : 'Thêm Xe Mới (Hãng, Loại Xe, Số Ghế)'}
              </h4>
              <button
                type="button"
                onClick={() => {
                  setShowAddVehicle(false);
                  setEditingVehicle(null);
                }}
                className="text-slate-400 hover:text-slate-900"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateOrSaveVehicle} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-[1fr_1fr_88px] gap-3">
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
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Đời xe *</label>
                  <input
                    type="number"
                    min={1990}
                    max={new Date().getFullYear() + 1}
                    value={vYear}
                    onChange={(e) => setVYear(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Loại ghế *</label>
                  <select
                    value={vSeat}
                    onChange={(e) => setVSeat(e.target.value as SeatCategory)}
                    className="w-full rounded-lg border border-slate-300 px-2 py-2 text-xs font-semibold"
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
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-bold "
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trạng thái</label>
                  <select
                    value={vStatus}
                    onChange={(e) => setVStatus(e.target.value as Vehicle['status'])}
                    className="w-full rounded-lg border border-slate-300 px-2 py-2 text-xs font-semibold"
                  >
                    <option value="AVAILABLE">Đang trống</option>
                    <option value="ON_TRIP">Đang chạy</option>
                    <option value="BOOKED">Đã giữ lịch</option>
                    <option value="MAINTENANCE">Bảo dưỡng</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Loại nhiên liệu *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['ELECTRIC', 'GASOLINE', 'DIESEL'] as FuelType[]).map((ft) => (
                    <button
                      key={ft}
                      type="button"
                      onClick={() => setVFuelType(ft)}
                      className={`py-2 rounded-lg text-xs font-bold transition ${
                        vFuelType === ft
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {FUEL_TYPE_LABELS[ft]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Hình thức cho thuê *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['WITH_DRIVER', 'Có tài xế'],
                      ['SELF_DRIVE', 'Tự lái'],
                      ['BOTH', 'Cả hai'],
                    ] as [ServiceMode, string][]
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setVMode(mode)}
                      className={`py-2 rounded-lg text-xs font-bold transition ${
                        vMode === mode
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
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
                  <label className="block font-bold text-slate-700 mb-1">
                    {vFuelType === 'ELECTRIC'
                      ? 'Định mức sạc điện/km'
                      : vFuelType === 'DIESEL'
                      ? 'Định mức dầu/km'
                      : 'Định mức xăng/km'}
                  </label>
                  <input
                    type="number"
                    step="100"
                    value={vFuelCostPerKm}
                    onChange={(e) => setVFuelCostPerKm(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ảnh xe (tối đa {MAX_VEHICLE_IMAGES} ảnh, mỗi ảnh dưới 4MB)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {vImages.map((src, i) => (
                    <div
                      key={i}
                      className={`relative aspect-[4/3] rounded-lg overflow-hidden border-2 ${
                        i === 0 ? 'border-blue-600' : 'border-slate-200'
                      }`}
                    >
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      {i === 0 ? (
                        <span className="absolute bottom-0 inset-x-0 bg-blue-600 text-white text-[10px] font-bold text-center py-0.5">
                          Ảnh đại diện
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setVImages((prev) => [src, ...prev.filter((_, j) => j !== i)])
                          }
                          className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] font-semibold py-0.5"
                        >
                          Đặt làm đại diện
                        </button>
                      )}
                      <button
                        type="button"
                        title="Xóa ảnh"
                        onClick={() => setVImages((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {vImages.length < MAX_VEHICLE_IMAGES && (
                    <label className="aspect-[4/3] rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-500 text-slate-400 hover:text-blue-600 flex flex-col items-center justify-center gap-1 cursor-pointer transition">
                      <ImagePlus className="w-5 h-5" />
                      <span className="text-[10px] font-semibold">Thêm ảnh</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          handlePickImages(e.target.files);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                </div>
                {vImageError && <p className="text-red-600 mt-1">{vImageError}</p>}
                <p className="text-slate-400 mt-1">
                  Ảnh đầu tiên tự làm thumbnail; bấm "Đặt làm đại diện" để đổi.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddVehicle(false);
                    setEditingVehicle(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-semibold text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold"
                >
                  {editingVehicle ? 'Lưu Cập Nhật' : 'Lưu Xe Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thêm / Sửa Hồ Sơ Tài Xế */}
      {showAddDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="bg-white text-slate-900 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
              <h4 className="text-sm font-bold">
                {editingDriver
                  ? `Cập Nhật Hồ Sơ Tài Xế: ${editingDriver.fullName}`
                  : 'Thêm Hồ Sơ Tài Xế & Liên Kết Zalo / Telegram'}
              </h4>
              <button
                type="button"
                onClick={() => {
                  setShowAddDriver(false);
                  setEditingDriver(null);
                }}
                className="text-slate-400 hover:text-slate-900"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateOrSaveDriver} className="p-4 space-y-3 text-xs">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngân hàng</label>
                  <input
                    type="text"
                    value={dBankName}
                    onChange={(e) => setDBankName(e.target.value)}
                    placeholder="Vietcombank"
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số tài khoản</label>
                  <input
                    type="text"
                    value={dBankAccount}
                    onChange={(e) => setDBankAccount(e.target.value)}
                    placeholder="007100xxxxxxx"
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Loại hồ sơ</label>
                  <select
                    value={dPartyType}
                    onChange={(e) =>
                      setDPartyType(e.target.value as 'EXTERNAL_DRIVER' | 'VEHICLE_OWNER')
                    }
                    className="w-full rounded-lg border border-slate-300 px-2 py-2 text-xs font-semibold"
                  >
                    <option value="EXTERNAL_DRIVER">Tài xế ngoài</option>
                    <option value="VEHICLE_OWNER">Chủ xe</option>
                  </select>
                  <p className="text-slate-500 mt-1">
                    Người chạy giúp xe của người khác thì chọn Tài xế ngoài. Chủ xe chỉ gắn với xe của mình.
                  </p>
                </div>
                {dPartyType === 'VEHICLE_OWNER' && (
                  <div className="space-y-2">
                    <label className="block font-bold text-slate-700">Biển số xe của chủ xe *</label>
                    {dOwnedPlates.map((plate, idx) => {
                      const match = plate.trim()
                        ? vehicles.find((v) => normalizePlate(v.plateNumber) === normalizePlate(plate))
                        : undefined;
                      return (
                        <div key={idx}>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={plate}
                              onChange={(e) =>
                                setDOwnedPlates((prev) =>
                                  prev.map((p, i) => (i === idx ? e.target.value : p))
                                )
                              }
                              placeholder="60H-465.04"
                              className="flex-1 rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-semibold"
                              required={idx === 0}
                            />
                            {dOwnedPlates.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setDOwnedPlates((prev) => prev.filter((_, i) => i !== idx))}
                                className="w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                                title="Bỏ biển số này"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          {plate.trim() &&
                            (match ? (
                              <p className="text-emerald-700 mt-1">
                                Khớp danh mục xe: {match.brand} {match.model} ({match.seatCategory}).
                              </p>
                            ) : (
                              <p className="text-amber-600 mt-1">
                                Biển số này chưa có trong danh mục xe. Thêm xe vào Đội xe để hệ thống đối chiếu được.
                              </p>
                            ))}
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setDOwnedPlates((prev) => [...prev, ''])}
                      className="h-8 px-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                    >
                      + Thêm biển số
                    </button>
                  </div>
                )}
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
                  onClick={() => {
                    setShowAddDriver(false);
                    setEditingDriver(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-semibold text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold"
                >
                  {editingDriver ? 'Lưu Cập Nhật' : 'Lưu Hồ Sơ Tài Xế'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
