import { Trip } from '../types/fleet';

export interface TripFinancialBreakdown {
  grossRevenue: number;           // Tổng doanh thu chuyến (Giá chuyến + Phụ thu)
  totalAutoDeducted: number;      // Tổng chi phí tự cấn trừ (Phí Cao tốc + Định mức nhiên liệu + Phí điều hành)
  totalManualExpense: number;     // Tổng chi phí nhập tay
  totalRiskExpense: number;       // Tổng chi phí phát sinh rủi ro (Phạt giao thông + Đậu xe + Sự cố khác)
  parkingFee: number;             // Riêng chi phí đậu xe
  trafficFineFee: number;         // Riêng chi phí phạt
  otherRiskFee: number;           // Riêng chi phí rủi ro khác
  totalAllExpenses: number;       // Tổng toàn bộ chi phí trừ
  netRemainingToAccount: number;  // Số tiền thực tế còn lại vào tài khoản
}

export function calculateTripFinancials(trip: Trip): TripFinancialBreakdown {
  const grossRevenue = (Number(trip.baseFareRevenue) || 0) + (Number(trip.surchargeRevenue) || 0);

  const totalAutoDeducted =
    (Number(trip.autoHighwayToll) || 0) +
    (Number(trip.autoFuelQuota) || 0) +
    (Number(trip.autoDispatchFee) || 0);

  const totalManualExpense = Number(trip.manualExpenseTotal) || 0;

  const parkingFee = Number(trip.parkingFee) || 0;
  const trafficFineFee = Number(trip.trafficFineFee) || 0;
  const otherRiskFee = Number(trip.otherRiskFee) || 0;
  const totalRiskExpense = parkingFee + trafficFineFee + otherRiskFee;

  const totalAllExpenses = totalAutoDeducted + totalManualExpense + totalRiskExpense;
  const netRemainingToAccount = grossRevenue - totalAllExpenses;

  return {
    grossRevenue,
    totalAutoDeducted,
    totalManualExpense,
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
