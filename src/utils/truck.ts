import { SeatCategory, TRUCK_CLASSES, TruckFareConfig } from '../types/fleet';

export const isTruckClass = (seat?: SeatCategory) => !!seat && TRUCK_CLASSES.includes(seat);

// Giá xe tải một chiều = max(km × đ/km, giá tối thiểu), làm tròn đến nghìn; null = hạng xe chưa có giá (gọi hotline)
export const truckPrice = (cfg: TruckFareConfig | undefined, seat: SeatCategory, km: number | undefined) => {
  const rate = cfg?.[seat];
  if (!rate?.perKm || !km) return null;
  return Math.round(Math.max(km * rate.perKm, rate.minFare || 0) / 1000) * 1000;
};
