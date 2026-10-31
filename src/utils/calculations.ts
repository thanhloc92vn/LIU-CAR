import { Trip } from '../types/fleet';

export interface TripFinancialBreakdown {
  grossRevenue: number;           // Tổng doanh thu chuyến (Giá chuyến + Phụ thu + Tiền pin)
  batteryFee: number;             // Tiền pin thu khách thuê tự lái xe điện (km thực tế x đơn giá)
  totalAutoDeducted: number;      // Tổng chi phí tự cấn trừ (Phí Cao tốc + Định mức nhiên liệu + Phí điều hành)
  totalManualExpense: number;     // Tổng chi phí nhập tay (gồm tiền tài xế + khách sạn)
  driverPay: number;              // Tiền tài xế (đã nằm trong totalManualExpense)
  hotelFee: number;               // Tiền khách sạn (đã nằm trong totalManualExpense)
  totalRiskExpense: number;       // Tổng chi phí phát sinh rủi ro (Phạt giao thông + Đậu xe + Sự cố khác)
  parkingFee: number;             // Riêng chi phí đậu xe
  trafficFineFee: number;         // Riêng chi phí phạt
  otherRiskFee: number;           // Riêng chi phí rủi ro khác
  totalAllExpenses: number;       // Tổng toàn bộ chi phí trừ
  netRemainingToAccount: number;  // Số tiền thực tế còn lại vào tài khoản
}

export function calculateTripFinancials(trip: Trip): TripFinancialBreakdown {
  const batteryFee = Math.round((Number(trip.actualKm) || 0) * (Number(trip.batteryRatePerKm) || 0));
  const grossRevenue =
    (Number(trip.baseFareRevenue) || 0) + (Number(trip.surchargeRevenue) || 0) + batteryFee;

  const totalAutoDeducted =
    (Number(trip.autoHighwayToll) || 0) +
    (Number(trip.autoFuelQuota) || 0) +
    (Number(trip.autoDispatchFee) || 0);

  const driverPay = Number(trip.driverPay) || 0;
  const hotelFee = Number(trip.hotelFee) || 0;
  const totalManualExpense = (Number(trip.manualExpenseTotal) || 0) + driverPay + hotelFee;

  const parkingFee = Number(trip.parkingFee) || 0;
  const trafficFineFee = Number(trip.trafficFineFee) || 0;
  const otherRiskFee = Number(trip.otherRiskFee) || 0;
  const totalRiskExpense = parkingFee + trafficFineFee + otherRiskFee;

  const totalAllExpenses = totalAutoDeducted + totalManualExpense + totalRiskExpense;
  const netRemainingToAccount = grossRevenue - totalAllExpenses;

  return {
    grossRevenue,
    batteryFee,
    totalAutoDeducted,
    totalManualExpense,
    driverPay,
    hotelFee,
    totalRiskExpense,
    parkingFee,
    trafficFineFee,
    otherRiskFee,
    totalAllExpenses,
    netRemainingToAccount,
  };
}

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount || 0));
}
