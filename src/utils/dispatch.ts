import { Driver, Trip, Vehicle } from '../types/fleet';
import { ownsVehicle } from './party';

// Chuyến đã được điều hành điều phối (chọn tài xế). Chuyến cũ đã qua bước xác nhận được coi là đã điều phối.
export const isDispatched = (t: Trip) => !!t.dispatchedAt || t.status !== 'PENDING_CONFIRM';

const range = (date: string, endDate: string | undefined, dep: string, ret: string) => {
  const start = Date.parse(`${date}T${dep || '00:00'}`);
  let end = Date.parse(`${endDate || date}T${ret || '23:59'}`);
  if (!(end > start)) end = start + 60000;
  return [start, end];
};

// Tài xế đã có chuyến trùng ngày giờ với chuyến này (không tính chính nó, chuyến hủy, chuyến tự lái)
export function busyDriverIds(trips: Trip[], trip: Trip): Set<string> {
  const [start, end] = range(trip.tripDate, trip.tripEndDate, trip.departureTime, trip.returnTime);
  const busy = new Set<string>();
  trips.forEach((t) => {
    if (t.id === trip.id || t.status === 'CANCELLED' || t.bookingType === 'SELF_DRIVE' || !t.driverId) return;
    const [s2, e2] = range(t.tripDate, t.tripEndDate, t.departureTime, t.returnTime);
    if (start < e2 && s2 < end) busy.add(t.driverId);
  });
  return busy;
}

// Lý do một tài xế không chọn được cho chuyến (rỗng là chọn được)
export function driverUnavailableReason(
  d: Driver,
  trip: Trip,
  vehicle: Vehicle | undefined,
  busy: Set<string>
): string {
  if (d.status === 'OFF_DUTY') return 'đang nghỉ';
  if (busy.has(d.id)) return 'đã có lịch';
  if (d.partyType === 'VEHICLE_OWNER' && !ownsVehicle(d, vehicle)) return 'chủ xe khác';
  return '';
}

// Tài xế không được chọn khi xe không hỗ trợ hình thức thuê của chuyến
export const vehicleFitsTrip = (v: Vehicle, trip: Trip) =>
  v.serviceMode === 'BOTH' || v.serviceMode === trip.bookingType;
