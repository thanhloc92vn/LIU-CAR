import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Download,
  Edit3,
  FileWarning,
  Filter,
  Navigation,
  ParkingCircle,
  PlusCircle,
  Receipt,
  RotateCcw,
  TrendingUp,
  User,
  Wallet,
} from 'lucide-react';
import { Driver, RouteType, SeatCategory, Trip, Vehicle } from '../types/fleet';
import { calculateTripFinancials, formatVND } from '../utils/calculations';

interface FinanceSettlementTabProps {
  trips: Trip[];
  drivers: Driver[];
  vehicles: Vehicle[];
  isMobile?: boolean;
  onEditTrip: (trip: Trip) => void;
  onQuickUpdateExpenses: (
    tripId: string,
    updates: {
      manualExpenseTotal?: number;
      manualExpenseNote?: string;
      parkingFee?: number;
      parkingNote?: string;
      trafficFineFee?: number;
      trafficFineNote?: string;
    }
  ) => void;
}

export const FinanceSettlementTab: React.FC<FinanceSettlementTabProps> = ({
  trips,
  drivers,
  vehicles,
  isMobile = false,
  onEditTrip,
  onQuickUpdateExpenses,
}) => {
  // Filters
  const [selectedDriverId, setSelectedDriverId] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [monthPreset, setMonthPreset] = useState<string>('ALL');
  const [seatFilter, setSeatFilter] = useState<'ALL' | SeatCategory>('ALL');
  const [routeFilter, setRouteFilter] = useState<'ALL' | RouteType>('ALL');

  // Quick inline expense modal state
  const [quickExpenseTrip, setQuickExpenseTrip] = useState<Trip | null>(null);
  const [qManual, setQManual] = useState<number>(0);
  const [qManualNote, setQManualNote] = useState<string>('');
  const [qParking, setQParking] = useState<number>(0);
  const [qParkingNote, setQParkingNote] = useState<string>('');
  const [qFine, setQFine] = useState<number>(0);
  const [qFineNote, setQFineNote] = useState<string>('');

  const handleApplyMonthPreset = (preset: string) => {
    setMonthPreset(preset);
    if (preset === 'ALL') {
      setDateFrom('');
      setDateTo('');
    } else if (preset === '2026-10') {
      setDateFrom('2026-10-01');
      setDateTo('2026-10-31');
    } else if (preset === '2026-11') {
      setDateFrom('2026-11-01');
      setDateTo('2026-11-30');
    } else if (preset === 'TODAY') {
      setDateFrom('2026-10-31');
      setDateTo('2026-10-31');
    }
  };

  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      // Chỉ chuyến đã được xác nhận hoàn thành mới ghi nhận doanh thu và chi phí
      if (t.status !== 'COMPLETED') return false;
      if (selectedDriverId !== 'ALL' && t.driverId !== selectedDriverId) return false;
      if (dateFrom && t.tripDate < dateFrom) return false;
      if (dateTo && t.tripDate > dateTo) return false;
      if (routeFilter !== 'ALL' && t.routeType !== routeFilter) return false;
      if (seatFilter !== 'ALL') {
        const veh = vehicles.find((v) => v.id === t.vehicleId);
        if (!veh || veh.seatCategory !== seatFilter) return false;
      }
      return true;
    });
  }, [trips, selectedDriverId, dateFrom, dateTo, routeFilter, seatFilter, vehicles]);

  // Aggregate summary
  const summary = useMemo(() => {
    let grossRevenue = 0;
    let autoHighwayToll = 0;
    let autoFuelQuota = 0;
    let autoDispatchFee = 0;
    let totalAutoDeducted = 0;
    let totalManualExpense = 0;
    let parkingFee = 0;
    let trafficFineFee = 0;
    let otherRiskFee = 0;
    let totalRiskExpense = 0;
    let netRemainingToAccount = 0;
    let revenueInCompanyBank = 0;
    let revenueHeldByDriverCash = 0;

    filteredTrips.forEach((t) => {
      const b = calculateTripFinancials(t);
      grossRevenue += b.grossRevenue;
      autoHighwayToll += Number(t.autoHighwayToll) || 0;
      autoFuelQuota += Number(t.autoFuelQuota) || 0;
      autoDispatchFee += Number(t.autoDispatchFee) || 0;
      totalAutoDeducted += b.totalAutoDeducted;
      totalManualExpense += b.totalManualExpense;
      parkingFee += b.parkingFee;
      trafficFineFee += b.trafficFineFee;
      otherRiskFee += b.otherRiskFee;
      totalRiskExpense += b.totalRiskExpense;
      netRemainingToAccount += b.netRemainingToAccount;

      if (t.paymentCollectedBy === 'COMPANY_BANK') {
        revenueInCompanyBank += b.grossRevenue;
      } else {
        revenueHeldByDriverCash += b.grossRevenue;
      }
    });

    return {
      tripCount: filteredTrips.length,
      grossRevenue,
      autoHighwayToll,
      autoFuelQuota,
      autoDispatchFee,
      totalAutoDeducted,
      totalManualExpense,
      parkingFee,
      trafficFineFee,
      otherRiskFee,
      totalRiskExpense,
      netRemainingToAccount,
      revenueInCompanyBank,
      revenueHeldByDriverCash,
    };
  }, [filteredTrips]);

  // Per-driver breakdown
  const driverStats = useMemo(() => {
    return drivers.map((drv) => {
      const drvTrips = filteredTrips.filter((t) => t.driverId === drv.id);
      let gross = 0;
      let autoDed = 0;
      let manual = 0;
      let parking = 0;
      let fine = 0;
      let net = 0;
      let highwayCount = 0;
      let nationalCount = 0;

      drvTrips.forEach((t) => {
        const b = calculateTripFinancials(t);
        gross += b.grossRevenue;
        autoDed += b.totalAutoDeducted;
        manual += b.totalManualExpense;
        parking += b.parkingFee;
        fine += b.trafficFineFee + b.otherRiskFee;
        net += b.netRemainingToAccount;
        if (t.routeType === 'HIGHWAY' || t.routeType === 'MIXED') highwayCount++;
        else nationalCount++;
      });

      return {
        driver: drv,
        tripCount: drvTrips.length,
        highwayCount,
        nationalCount,
        gross,
        autoDed,
        manual,
        parking,
        fine,
        net,
      };
    });
  }, [drivers, filteredTrips]);

  const handleOpenQuickExpense = (trip: Trip) => {
    setQuickExpenseTrip(trip);
    setQManual(trip.manualExpenseTotal);
    setQManualNote(trip.manualExpenseNote || '');
    setQParking(trip.parkingFee);
    setQParkingNote(trip.parkingNote || '');
    setQFine(trip.trafficFineFee);
    setQFineNote(trip.trafficFineNote || '');
  };

  const handleSaveQuickExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickExpenseTrip) return;
    onQuickUpdateExpenses(quickExpenseTrip.id, {
      manualExpenseTotal: Number(qManual) || 0,
      manualExpenseNote: qManualNote,
      parkingFee: Number(qParking) || 0,
      parkingNote: qParkingNote,
      trafficFineFee: Number(qFine) || 0,
      trafficFineNote: qFineNote,
    });
    setQuickExpenseTrip(null);
  };

  const handleExportCSV = () => {
    const headers = [
      'Mã Chuyến',
      'Ngày Đi',
      'Họ Tên Tài Xế',
      'Biển Số Xe',
      'Loại Ghế',
      'Tuyến Đường (Cao Tốc/Quốc Lộ)',
      'Chi Tiết Lộ Trình',
      'Doanh Thu Chuyến (VNĐ)',
      'Phí Cao Tốc Tự Cấn Trừ (VNĐ)',
      'Định Mức Xăng Tự Cấn Trừ (VNĐ)',
      'Phí Điều Hành Tự Cấn Trừ (VNĐ)',
      'Tổng Chi Phí Tự Cấn Trừ (VNĐ)',
      'Chi Phí Nhập Tay (VNĐ)',
      'Chi Phí Đậu Xe (VNĐ)',
      'Chi Phí Phạt Giao Thông (VNĐ)',
      'Số Thực Tế Còn Lại Vào Tài Khoản (VNĐ)',
    ];

    const rows = filteredTrips.map((t) => {
      const drv = drivers.find((d) => d.id === t.driverId);
      const veh = vehicles.find((v) => v.id === t.vehicleId);
      const b = calculateTripFinancials(t);
      return [
        t.tripCode,
        t.tripDate,
        `"${drv?.fullName || ''}"`,
        veh?.plateNumber || '',
        `"${veh?.seatCategory || ''}"`,
        t.routeType === 'HIGHWAY'
          ? 'Cao tốc'
          : t.routeType === 'NATIONAL_ROAD'
          ? 'Quốc lộ'
          : 'Kết hợp',
        `"${t.routeDetail}"`,
        b.grossRevenue,
        t.autoHighwayToll,
        t.autoFuelQuota,
        t.autoDispatchFee,
        b.totalAutoDeducted,
        b.totalManualExpense,
        b.parkingFee,
        b.trafficFineFee,
        b.netRemainingToAccount,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Doi_Soat_Doanh_Thu_Chi_Phi_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. Thanh Bộ Lọc Đa Chiều */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3.5 sm:p-5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0" />
              <span>Bộ lọc đối soát theo tài xế & ngày tháng</span>
            </h2>
            <p className="text-xs text-slate-500">
              Chỉ tính các chuyến đã hoàn thành.{' '}
              {trips.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length} chuyến
              chưa hoàn thành chưa được ghi nhận.
            </p>
            {!isMobile && (
              <p className="text-xs text-slate-500">
                Tự động tổng hợp Doanh thu tổng, trừ Chi phí tự cấn trừ, Chi phí nhập tay, Chi phí phạt & đậu xe để cộng ra Số thực tế còn lại vào tài khoản
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSelectedDriverId('ALL');
                setDateFrom('');
                setDateTo('');
                setMonthPreset('ALL');
                setSeatFilter('ALL');
                setRouteFilter('ALL');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Đặt lại</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        <div
          className={
            isMobile
              ? 'grid grid-cols-1 gap-2.5'
              : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3'
          }
        >
          {/* Lọc theo tên tài xế */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Lọc theo Tên Tài Xế
            </label>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900"
            >
              <option value="ALL">Tất cả tài xế ({drivers.length} người)</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName} ({d.code} • Bằng {d.licenseClass})
                </option>
              ))}
            </select>
          </div>

          {/* Chọn nhanh Kỳ / Tháng */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Chọn Nhanh Kỳ / Tháng
            </label>
            <select
              value={monthPreset}
              onChange={(e) => handleApplyMonthPreset(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900"
            >
              <option value="ALL">Tất cả thời gian</option>
              <option value="TODAY">Hôm nay (31/10/2026)</option>
              <option value="2026-10">Tháng 10 / 2026</option>
              <option value="2026-11">Tháng 11 / 2026</option>
            </select>
          </div>

          {/* Từ ngày - Đến ngày */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Từ ngày</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setMonthPreset('CUSTOM');
                }}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-2 py-2 text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Đến ngày</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setMonthPreset('CUSTOM');
                }}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-2 py-2 text-xs font-medium"
              />
            </div>
          </div>

          {/* Lọc theo Loại ghế & Tuyến đường */}
          <div className={isMobile ? 'grid grid-cols-2 gap-2' : 'contents'}>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Loại Ghế
              </label>
              <select
                value={seatFilter}
                onChange={(e) => setSeatFilter(e.target.value as 'ALL' | SeatCategory)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-900"
              >
                <option value="ALL">Tất cả ghế</option>
                <option value="4 chỗ">Xe 4 chỗ</option>
                <option value="5 chỗ">Xe 5 chỗ</option>
                <option value="7 chỗ">Xe 7 chỗ</option>
                <option value="9 chỗ Limousine">9 chỗ Limousine</option>
                <option value="16 chỗ">Xe 16 chỗ</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tuyến Đường
              </label>
              <select
                value={routeFilter}
                onChange={(e) => setRouteFilter(e.target.value as 'ALL' | RouteType)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-900"
              >
                <option value="ALL">Tất cả tuyến</option>
                <option value="HIGHWAY">Cao tốc</option>
                <option value="NATIONAL_ROAD">Quốc lộ</option>
                <option value="MIXED">Kết hợp</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Bảng Công Thức Tổng Kết 5 Ô */}
      <div
        className={
          isMobile
            ? 'grid grid-cols-2 gap-2.5'
            : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4'
        }
      >
        {/* Card 1: Tổng Doanh Thu */}
        <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1">
              <span>Doanh thu</span>
              <TrendingUp className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
              {formatVND(summary.grossRevenue)}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-0.5">
            <div className="flex justify-between">
              <span>Số chuyến:</span>
              <strong className="text-slate-800">{summary.tripCount} chuyến</strong>
            </div>
            <div className="flex justify-between">
              <span>CK Công ty:</span>
              <strong className="text-slate-700">{formatVND(summary.revenueInCompanyBank)}</strong>
            </div>
          </div>
        </div>

        {/* Card 2: Chi Phí Tự Cấn Trừ */}
        <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1">
              <span>Cấn trừ tự động</span>
              <Navigation className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
              -{formatVND(summary.totalAutoDeducted)}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-0.5">
            <div className="flex justify-between">
              <span>Cao tốc:</span>
              <strong className="text-slate-800">{formatVND(summary.autoHighwayToll)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Xăng + ĐH:</span>
              <strong className="text-slate-800">
                {formatVND(summary.autoFuelQuota + summary.autoDispatchFee)}
              </strong>
            </div>
          </div>
        </div>

        {/* Card 3: Chi Phí Nhập Tay */}
        <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1">
              <span>Chi phí nhập tay</span>
              <Receipt className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
              -{formatVND(summary.totalManualExpense)}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
            Rửa xe, nước uống, phụ cấp ăn nghỉ, xăng lẻ...
          </div>
        </div>

        {/* Card 4: Chi Phí Phát Sinh Rủi Ro (Phạt & Đậu Xe) */}
        <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1">
              <span>Phạt & đậu xe</span>
              <AlertTriangle className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-semibold tracking-tight text-rose-600">
              -{formatVND(summary.totalRiskExpense)}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-0.5">
            <div className="flex justify-between">
              <span>Đậu xe:</span>
              <strong className="text-slate-900">{formatVND(summary.parkingFee)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Phạt GT:</span>
              <strong className="text-rose-700">{formatVND(summary.trafficFineFee)}</strong>
            </div>
          </div>
        </div>

        {/* Card 5: SỐ THỰC TẾ CÒN LẠI VÀO TÀI KHOẢN */}
        <div
          className={`${
            isMobile ? 'col-span-2' : ''
          } bg-slate-900 text-white rounded-2xl p-4 flex flex-col justify-between`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-400">
                Thực còn vào tài khoản
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-white mt-0.5">
                {formatVND(summary.netRemainingToAccount)}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/15 text-white flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-white/15 text-xs text-slate-400">
            Công thức: Doanh thu ({formatVND(summary.grossRevenue)}) − Tự cấn trừ (
            {formatVND(summary.totalAutoDeducted)}) − Nhập tay ({formatVND(summary.totalManualExpense)})
            − Phạt & Đậu xe ({formatVND(summary.totalRiskExpense)})
          </div>
        </div>
      </div>

      {/* 3. Bảng Tổng Hợp Theo Từng Tài Xế */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Tổng hợp theo từng tài xế (chạm để lọc riêng)</span>
          </h3>
        </div>

        {isMobile ? (
          <div className="divide-y divide-slate-200">
            {driverStats.map((st) => {
              const isSelected = selectedDriverId === st.driver.id;
              return (
                <div
                  key={st.driver.id}
                  onClick={() => setSelectedDriverId(isSelected ? 'ALL' : st.driver.id)}
                  className={`p-3.5 space-y-2 cursor-pointer transition ${
                    isSelected ? 'bg-blue-50/90' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <span>{st.driver.fullName}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-xs">
                          Bằng {st.driver.licenseClass}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {st.tripCount} chuyến ({st.highwayCount} Cao tốc • {st.nationalCount} Quốc lộ)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-blue-700 font-bold">Thực còn vào TK</div>
                      <div className="text-sm font-extrabold text-blue-900">
                        {formatVND(st.net)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 text-xs bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                    <div>
                      <div className="text-slate-400">Tổng thu</div>
                      <div className="font-bold text-emerald-700">{formatVND(st.gross)}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Tự trừ</div>
                      <div className="font-semibold text-amber-700">-{formatVND(st.autoDed)}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Đậu xe</div>
                      <div className="font-semibold text-blue-700">-{formatVND(st.parking)}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Phạt GT</div>
                      <div className="font-bold text-rose-600">-{formatVND(st.fine)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                  <th className="py-3 px-4">Tài xế & hồ sơ GPLX</th>
                  <th className="py-3 px-3 text-center">Số chuyến</th>
                  <th className="py-3 px-3 text-right">Doanh thu tổng (+)</th>
                  <th className="py-3 px-3 text-right">Tự cấn trừ (-)</th>
                  <th className="py-3 px-3 text-right">Chi phí nhập tay (-)</th>
                  <th className="py-3 px-3 text-right">Phí đậu xe (-)</th>
                  <th className="py-3 px-3 text-right">Phí phạt GT (-)</th>
                  <th className="py-3 px-4 text-right bg-blue-50/60 text-blue-900">
                    Thực Tế Còn Lại Vào TK (=)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {driverStats.map((st) => {
                  const isSelected = selectedDriverId === st.driver.id;
                  return (
                    <tr
                      key={st.driver.id}
                      onClick={() => setSelectedDriverId(isSelected ? 'ALL' : st.driver.id)}
                      className={`cursor-pointer transition ${
                        isSelected ? 'bg-blue-50/90 font-medium' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{st.driver.fullName}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                            Hạng {st.driver.licenseClass}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          GPLX: {st.driver.licenseNumber} • TK: {st.driver.bankName} (
                          {st.driver.bankAccount})
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
                          {st.tripCount} chuyến
                        </span>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {st.highwayCount} Cao tốc • {st.nationalCount} Quốc lộ
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-700">
                        {formatVND(st.gross)}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-amber-700">
                        -{formatVND(st.autoDed)}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-orange-600">
                        -{formatVND(st.manual)}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-blue-700">
                        -{formatVND(st.parking)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-rose-600">
                        -{formatVND(st.fine)}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-sm text-blue-800 bg-blue-50/40">
                        {formatVND(st.net)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Sổ Cái Chi Tiết Từng Chuyến */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">
            Chi Tiết Từng Chuyến & Các Khoản Cấn Trừ ({filteredTrips.length} chuyến)
          </h3>
        </div>

        <div className="divide-y divide-slate-200">
          {filteredTrips.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Không tìm thấy chuyến đi nào khớp với bộ lọc hiện tại.
            </div>
          ) : (
            filteredTrips.map((trip) => {
              const drv = drivers.find((d) => d.id === trip.driverId);
              const veh = vehicles.find((v) => v.id === trip.vehicleId);
              const b = calculateTripFinancials(trip);

              return (
                <div key={trip.id} className="p-3.5 sm:p-5 hover:bg-slate-50/70 transition space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-xs font-bold">
                        #{trip.tripCode}
                      </span>
                      <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        {trip.tripDate}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          trip.routeType === 'HIGHWAY'
                            ? 'bg-indigo-100 text-indigo-800'
                            : trip.routeType === 'NATIONAL_ROAD'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-teal-100 text-teal-800'
                        }`}
                      >
                        {trip.routeType === 'HIGHWAY'
                          ? 'Cao tốc'
                          : trip.routeType === 'NATIONAL_ROAD'
                          ? 'Quốc lộ'
                          : 'Kết hợp'}
                      </span>
                      {veh && (
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                          {veh.seatCategory} • {veh.brand} {veh.model}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenQuickExpense(trip)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Phạt / Đậu xe
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditTrip(trip)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Sửa
                      </button>
                    </div>
                  </div>

                  <div className="text-xs sm:text-sm font-bold text-slate-900">
                    {trip.pickupLocation} → {trip.dropoffLocation}{' '}
                    <span className="text-xs font-normal text-slate-500">
                      ({trip.distanceKm} km • Tài xế: {drv?.fullName})
                    </span>
                  </div>

                  {/* Ghi chú chi phí phạt, đậu xe, nhập tay */}
                  {(trip.parkingFee > 0 || trip.trafficFineFee > 0 || trip.manualExpenseTotal > 0) && (
                    <div className="flex flex-wrap gap-1.5">
                      {trip.parkingFee > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-xs text-blue-800 font-medium">
                          Đậu xe: {formatVND(trip.parkingFee)}{' '}
                          {trip.parkingNote ? `(${trip.parkingNote})` : ''}
                        </span>
                      )}
                      {trip.trafficFineFee > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold">
                          Phạt GT: {formatVND(trip.trafficFineFee)}{' '}
                          {trip.trafficFineNote ? `(${trip.trafficFineNote})` : ''}
                        </span>
                      )}
                      {trip.manualExpenseTotal > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
                          Nhập tay: {formatVND(trip.manualExpenseTotal)}{' '}
                          {trip.manualExpenseNote ? `(${trip.manualExpenseNote})` : ''}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Khung số liệu tài chính không bao giờ tràn chữ */}
                  <div
                    className={
                      isMobile
                        ? 'grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200'
                        : 'grid grid-cols-7 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200'
                    }
                  >
                    <div>
                      <div className="text-xs text-slate-500">Doanh thu chuyến (+)</div>
                      <div className="font-bold text-emerald-700">{formatVND(b.grossRevenue)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Cao tốc + phí điều hành (-)</div>
                      <div className="font-semibold text-amber-700">
                        -{formatVND(b.totalAutoDeducted - (Number(trip.autoFuelQuota) || 0))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">
                        {veh?.fuelType === 'ELECTRIC' ? 'Tiền điện (-)' : 'Tiền xăng/dầu (-)'}
                      </div>
                      <div className="font-semibold text-amber-700">
                        -{formatVND(Number(trip.autoFuelQuota) || 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Chi phí tài xế (-)</div>
                      <div className="font-semibold text-rose-600">-{formatVND(b.driverPay)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Chi phí khách sạn (-)</div>
                      <div className="font-semibold text-rose-600">-{formatVND(b.hotelFee)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Chi phí khác (-)</div>
                      <div className="font-semibold text-rose-600">
                        -{formatVND(b.manualExpenseOnly + b.totalRiskExpense)}
                      </div>
                    </div>
                    <div className={isMobile ? 'border-t border-slate-200 pt-1.5 col-span-2 flex items-center justify-between' : 'border-l border-slate-200 pl-3'}>
                      <div className="text-xs font-bold text-blue-700">Thực tế còn vào TK (=)</div>
                      <div className="font-extrabold text-blue-900 text-sm">
                        {formatVND(b.netRemainingToAccount)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Nhập nhanh Chi phí */}
      {quickExpenseTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-white text-slate-900 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold">
                  Cập Nhật Nhanh Chi Phí #{quickExpenseTrip.tripCode}
                </h4>
                <p className="text-xs text-slate-500">
                  Nhập chi phí đậu xe, biên bản phạt giao thông hoặc chi phí nhập tay
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickExpenseTrip(null)}
                className="text-slate-400 hover:text-slate-900 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveQuickExpense} className="p-4 space-y-3.5">
              <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 space-y-2">
                <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <ParkingCircle className="w-4 h-4 text-blue-600" />
                  Chi phí đậu xe / bến bãi (VNĐ)
                </label>
                <input
                  type="number"
                  step="5000"
                  value={qParking}
                  onChange={(e) => setQParking(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-sm font-bold"
                />
                <input
                  type="text"
                  value={qParkingNote}
                  onChange={(e) => setQParkingNote(e.target.value)}
                  placeholder="Ghi chú: Đậu xe sân bay, bến xe, resort..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                />
              </div>

              <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200 space-y-2">
                <label className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                  <FileWarning className="w-4 h-4 text-rose-600" />
                  Chi phí phạt giao thông / phạt nguội (VNĐ)
                </label>
                <input
                  type="number"
                  step="50000"
                  value={qFine}
                  onChange={(e) => setQFine(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-sm font-bold text-rose-700"
                />
                <input
                  type="text"
                  value={qFineNote}
                  onChange={(e) => setQFineNote(e.target.value)}
                  placeholder="Ghi chú lỗi phạt: Quá tốc độ, sai làn..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                />
              </div>

              <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 space-y-2">
                <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-amber-600" />
                  Chi phí nhập tay khác (VNĐ)
                </label>
                <input
                  type="number"
                  step="10000"
                  value={qManual}
                  onChange={(e) => setQManual(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-bold"
                />
                <input
                  type="text"
                  value={qManualNote}
                  onChange={(e) => setQManualNote(e.target.value)}
                  placeholder="Ghi chú: Rửa xe, nước uống, xăng lẻ..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickExpenseTrip(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
                >
                  Lưu & Cấn Trừ Ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
