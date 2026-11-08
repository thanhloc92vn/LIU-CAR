import { SeatCategory, TaxiFareConfig } from '../types/fleet';

// Giá mặc định khi admin chưa cấu hình
export const DEFAULT_TAXI_FARE: TaxiFareConfig = {
  perKm4To5Seats: 10000,
  perKm7Seats: 12000,
  holidaySurchargePerKm: 3000,
  holidays: [],
};

export const resolveTaxiFare = (cfg?: Partial<TaxiFareConfig>): TaxiFareConfig => ({
  ...DEFAULT_TAXI_FARE,
  ...cfg,
  holidays: cfg?.holidays || [],
});

// date dạng YYYY-MM-DD nên so sánh chuỗi là đúng thứ tự ngày
export const isTaxiHoliday = (cfg: TaxiFareConfig, date: string) =>
  !!date && cfg.holidays.some((h) => h.from && date >= h.from && date <= (h.to || h.from));

// Đơn giá đ/km cho loại ghế vào ngày đó; null = loại xe chưa có giá taxi (khách gọi hotline)
export const taxiRatePerKm = (cfg: TaxiFareConfig, seat: SeatCategory, date: string): number | null => {
  const base =
    seat === '4 chỗ' || seat === '5 chỗ' ? cfg.perKm4To5Seats : seat === '7 chỗ' ? cfg.perKm7Seats : 0;
  if (!base) return null;
  return base + (isTaxiHoliday(cfg, date) ? cfg.holidaySurchargePerKm : 0);
};
