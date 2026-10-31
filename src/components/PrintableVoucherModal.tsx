import React, { useState } from 'react';
import { Check, Copy, Printer, X } from 'lucide-react';
import { Driver, TenantConfig, Trip, Vehicle } from '../types/fleet';
import { calculateTripFinancials, formatVND } from '../utils/calculations';

interface PrintableVoucherModalProps {
  trip: Trip | null;
  onClose: () => void;
  driver?: Driver;
  vehicle?: Vehicle;
  tenant: TenantConfig;
}

export const PrintableVoucherModal: React.FC<PrintableVoucherModalProps> = ({
  trip,
  onClose,
  driver,
  vehicle,
  tenant,
}) => {
  const [copied, setCopied] = useState(false);

  if (!trip) return null;

  const fin = calculateTripFinancials(trip);

  const zaloFormattedText = [
    `[LỆNH ĐIỀU XE & ĐỐI SOÁT #${trip.tripCode}] — ${tenant.shortName.toUpperCase()}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Tài xế phụ trách: @${driver?.fullName || 'Tài xế'} (${driver?.phone || ''})`,
    `Xe phục vụ: [${vehicle?.seatCategory || ''}] ${vehicle?.brand || ''} ${vehicle?.model || ''} — Biển số: ${vehicle?.plateNumber || ''}`,
    `Khách hàng: ${trip.customerName} (${trip.customerPhone})`,
    `Thời gian: ${trip.departureTime} - ${trip.returnTime} ngày ${trip.tripDate}`,
    `Lộ trình: ${trip.pickupLocation} → ${trip.dropoffLocation} (${trip.distanceKm} km)`,
    `Tuyến đường: ${
      trip.routeType === 'HIGHWAY'
        ? 'Đi Cao Tốc (Có thu phí ETC)'
        : trip.routeType === 'NATIONAL_ROAD'
        ? 'Đường Quốc Lộ'
        : 'Kết Hợp Cao Tốc & Quốc Lộ'
    } (${trip.routeDetail})`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `1. Tổng thu chuyến (+): ${formatVND(fin.grossRevenue)} (${
      trip.paymentCollectedBy === 'COMPANY_BANK' ? 'CK Công ty' : 'Tài xế thu tiền mặt'
    })`,
    `2. Chi phí tự cấn trừ (-): -${formatVND(fin.totalAutoDeducted)} (Cao tốc: ${formatVND(
      trip.autoHighwayToll
    )} | Xăng: ${formatVND(trip.autoFuelQuota)} | ĐH: ${formatVND(trip.autoDispatchFee)})`,
    `3. Chi phí nhập tay (-): -${formatVND(fin.totalManualExpense)}${
      trip.manualExpenseNote ? ` (${trip.manualExpenseNote})` : ''
    }`,
    `4. Phí đậu xe & Phạt GT (-): -${formatVND(fin.totalRiskExpense)} (Đậu xe: ${formatVND(
      fin.parkingFee
    )} | Phạt: ${formatVND(fin.trafficFineFee)})`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `SỐ THỰC TẾ CÒN LẠI VÀO TK: ${formatVND(fin.netRemainingToAccount)}`,
    `Đề nghị tài xế @${driver?.fullName || ''} thả tim hoặc nhắn "XÁC NHẬN" khi nhận lệnh!`,
  ].join('\n');

  const handleCopyZalo = async () => {
    try {
      await navigator.clipboard.writeText(zaloFormattedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden">
        {/* Top Action Bar */}
        <div className="bg-white text-slate-900 border-b border-slate-200 px-5 py-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <h3 className="text-sm font-bold">
            Phiếu Lệnh Điều Xe & Quyết Toán Chuyến #{trip.tripCode}
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyZalo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã Copy lệnh Zalo!' : 'Copy Gửi Nhóm Zalo'}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In phiếu / xuất PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Content */}
        <div className="p-6 space-y-5 text-xs text-slate-800">
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 ">{tenant.name}</h2>
              <p className="text-slate-600">
                MST: {tenant.taxCode} • Hotline: {tenant.hotline}
              </p>
              <p className="text-slate-600">Tài khoản thanh toán: {tenant.bankInfo}</p>
            </div>
            <div className="text-right">
              <div className="inline-block px-3 py-1 rounded-lg bg-slate-900 text-white font-extrabold text-xs">
                MÃ CHUYẾN: #{trip.tripCode}
              </div>
              <div className="text-slate-500 mt-1">Ngày đi: {trip.tripDate}</div>
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-lg font-extrabold text-slate-900 ">
              {trip.bookingType === 'SELF_DRIVE'
                ? 'PHIẾU GIAO NHẬN XE TỰ LÁI & QUYẾT TOÁN CHI PHÍ'
                : 'LỆNH ĐIỀU XE & PHIẾU ĐỐI SOÁT DOANH THU - CHI PHÍ'}
            </h1>
          </div>

          {/* 2 Columns Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="space-y-1.5">
              <div className="font-bold text-slate-900 text-xs text-blue-700">
                I. Thông Tin Xe & Người Lái
              </div>
              <div>
                • Loại ghế & Xe:{' '}
                <strong>
                  [{vehicle?.seatCategory}] {vehicle?.brand} {vehicle?.model}
                </strong>
              </div>
              <div>
                • Biển kiểm soát: <strong className="font-mono">{vehicle?.plateNumber}</strong>
              </div>
              <div>
                • Tài xế phụ trách: <strong>{driver?.fullName}</strong> (Mã: {driver?.code})
              </div>
              <div>
                • Bằng lái GPLX: <strong>Hạng {driver?.licenseClass}</strong> — Số:{' '}
                {driver?.licenseNumber}
              </div>
              <div>
                • TK Ngân hàng TX: <strong>{driver?.bankName}</strong> ({driver?.bankAccount})
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="font-bold text-slate-900 text-xs text-blue-700">
                II. Lịch Trình Di Chuyển (Cao tốc / Quốc lộ)
              </div>
              <div>
                • Khách hàng: <strong>{trip.customerName}</strong> ({trip.customerPhone})
              </div>
              <div>
                • Điểm đón → trả:{' '}
                <strong>
                  {trip.pickupLocation} → {trip.dropoffLocation}
                </strong>
              </div>
              <div>
                • Loại tuyến đường:{' '}
                <strong>
                  {trip.routeType === 'HIGHWAY'
                    ? 'Tuyến Cao Tốc (ETC)'
                    : trip.routeType === 'NATIONAL_ROAD'
                    ? 'Đường Quốc Lộ'
                    : 'Kết Hợp Cao Tốc & Quốc Lộ'}
                </strong>
              </div>
              <div>• Chi tiết lộ trình: {trip.routeDetail}</div>
              <div>
                • Tổng cự ly: <strong>{trip.distanceKm} km</strong> (
                {trip.isRoundTrip ? 'Khứ hồi 2 chiều' : '1 chiều'})
              </div>
            </div>
          </div>

          {/* Financial Table */}
          <div className="border border-slate-300 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-xs ">
                  <th className="py-2.5 px-4">Khoản mục đối soát</th>
                  <th className="py-2.5 px-4">Diễn giải chi tiết</th>
                  <th className="py-2.5 px-4 text-right">Số tiền (VNĐ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-2.5 px-4 font-bold text-emerald-800">
                    Tổng doanh thu chuyến (+)
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    Giá chuyến: {formatVND(trip.baseFareRevenue)} + Phụ thu:{' '}
                    {formatVND(trip.surchargeRevenue)} (
                    {trip.paymentCollectedBy === 'COMPANY_BANK'
                      ? 'CK vào TK Công ty'
                      : 'Tài xế thu hộ tiền mặt'}
                    )
                  </td>
                  <td className="py-2.5 px-4 text-right font-extrabold text-emerald-700">
                    +{formatVND(fin.grossRevenue)}
                  </td>
                </tr>

                <tr>
                  <td className="py-2.5 px-4 font-bold text-amber-800">
                    Chi phí tự cấn trừ (-)
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    Phí Cao tốc ETC: {formatVND(trip.autoHighwayToll)} | Định mức xăng:{' '}
                    {formatVND(trip.autoFuelQuota)} | Phí ĐH: {formatVND(trip.autoDispatchFee)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-amber-700">
                    -{formatVND(fin.totalAutoDeducted)}
                  </td>
                </tr>

                <tr>
                  <td className="py-2.5 px-4 font-bold text-orange-800">
                    Chi phí nhập tay (-)
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    {trip.manualExpenseNote || 'Chi phí phát sinh nhập tay theo chuyến'}
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-orange-700">
                    -{formatVND(fin.totalManualExpense)}
                  </td>
                </tr>

                <tr>
                  <td className="py-2.5 px-4 font-bold text-blue-800">
                    Chi phí đậu xe / bến bãi (-)
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    {trip.parkingNote || 'Vé đậu xe sân bay / bến bãi'}
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-blue-700">
                    -{formatVND(fin.parkingFee)}
                  </td>
                </tr>

                <tr>
                  <td className="py-2.5 px-4 font-bold text-rose-800">
                    Chi phí phạt giao thông (-)
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    {trip.trafficFineNote || 'Không phát sinh phạt vi phạm'}
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-rose-600">
                    -{formatVND(fin.trafficFineFee)}
                  </td>
                </tr>

                <tr className="bg-blue-50 font-extrabold text-sm">
                  <td className="py-3 px-4 text-blue-950" colSpan={2}>
                    SỐ TIỀN THỰC TẾ CÒN LẠI VÀO TÀI KHOẢN (=)
                  </td>
                  <td className="py-3 px-4 text-right text-blue-900 text-base">
                    {formatVND(fin.netRemainingToAccount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Preview Tin nhắn Zalo để Copy nhanh */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 print:hidden">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-700 text-xs">
                Mẫu tin nhắn chuẩn gửi Nhóm Zalo / Telegram cho Tài xế:
              </span>
              <button
                type="button"
                onClick={handleCopyZalo}
                className="text-blue-600 font-bold text-xs hover:underline"
              >
                {copied ? '✓ Đã sao chép' : 'Sao chép nội dung'}
              </button>
            </div>
            <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono bg-white p-3 rounded-lg border border-slate-200 max-h-36 overflow-y-auto">
              {zaloFormattedText}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
