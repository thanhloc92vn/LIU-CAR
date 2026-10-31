import { Driver, HighwayPreset, SeatCategory, Trip, Vehicle } from '../types/fleet';
import { calculateTripFinancials, formatVND } from './calculations';

export interface ParsedAICommand {
  intent: 'CREATE_BOOKING' | 'REASSIGN_TAG_DRIVER' | 'ADD_RISK_EXPENSE' | 'UNKNOWN';
  seatCategory?: SeatCategory;
  matchedVehicle?: Vehicle;
  matchedDriver?: Driver;
  taggedDrivers: Driver[];
  routeType: 'HIGHWAY' | 'NATIONAL_ROAD' | 'MIXED';
  matchedHighwayPreset?: HighwayPreset;
  tripDate: string;
  departureTime: string;
  pickupLocation: string;
  dropoffLocation: string;
  baseFareRevenue: number;
  manualExpenseTotal: number;
  parkingFee: number;
  trafficFineFee: number;
  summaryText: string;
}

export function parseNaturalBookingCommand(
  input: string,
  vehicles: Vehicle[],
  drivers: Driver[],
  highwayPresets: HighwayPreset[]
): ParsedAICommand {
  const lower = input.toLowerCase();

  // 1. Detect Tagged Drivers via @tag or full name / first name match
  const taggedDrivers: Driver[] = [];
  drivers.forEach((drv) => {
    const cleanHandle = drv.telegramUsername.replace('@', '').toLowerCase();
    const fullNameLower = drv.fullName.toLowerCase();
    const nameParts = fullNameLower.split(' ');
    const lastName = nameParts[nameParts.length - 1];

    if (
      lower.includes(`@${cleanHandle}`) ||
      lower.includes(fullNameLower) ||
      lower.includes(`@${lastName}`) ||
      new RegExp(`\\b(tài xế|tx|giao|tag)\\s+${lastName}\\b`, 'i').test(lower)
    ) {
      if (!taggedDrivers.some((d) => d.id === drv.id)) {
        taggedDrivers.push(drv);
      }
    }
  });

  // 2. Detect Seat Category (4 chỗ, 5 chỗ, 7 chỗ, 9 chỗ, 16 chỗ, 29 chỗ)
  let seatCategory: SeatCategory | undefined;
  if (lower.includes('16 chỗ') || lower.includes('16c') || lower.includes('solati')) {
    seatCategory = '16 chỗ';
  } else if (lower.includes('9 chỗ') || lower.includes('limousine')) {
    seatCategory = '9 chỗ Limousine';
  } else if (lower.includes('7 chỗ') || lower.includes('7c') || lower.includes('xpander') || lower.includes('carnival') || lower.includes('innova')) {
    seatCategory = '7 chỗ';
  } else if (lower.includes('5 chỗ') || lower.includes('5c') || lower.includes('vf8')) {
    seatCategory = '5 chỗ';
  } else if (lower.includes('4 chỗ') || lower.includes('4c') || lower.includes('vios') || lower.includes('sedan')) {
    seatCategory = '4 chỗ';
  }

  // Match Vehicle by brand/model/plate or seatCategory
  let matchedVehicle = vehicles.find(
    (v) =>
      lower.includes(v.model.toLowerCase()) ||
      lower.includes(v.brand.toLowerCase()) ||
      lower.includes(v.plateNumber.toLowerCase())
  );
  if (!matchedVehicle && seatCategory) {
    matchedVehicle = vehicles.find((v) => v.seatCategory === seatCategory && v.status === 'AVAILABLE') ||
      vehicles.find((v) => v.seatCategory === seatCategory);
  }
  if (!matchedVehicle && vehicles.length > 0) {
    matchedVehicle = vehicles[0];
  }

  const matchedDriver = taggedDrivers[0] || drivers[0];

  // 3. Detect Route Type (Cao tốc vs Quốc lộ)
  let routeType: 'HIGHWAY' | 'NATIONAL_ROAD' | 'MIXED' = 'HIGHWAY';
  if (lower.includes('kết hợp') || (lower.includes('cao tốc') && lower.includes('quốc lộ'))) {
    routeType = 'MIXED';
  } else if (lower.includes('quốc lộ') || lower.includes('ql1') || lower.includes('ql20') || lower.includes('ql51')) {
    routeType = 'NATIONAL_ROAD';
  } else if (lower.includes('cao tốc')) {
    routeType = 'HIGHWAY';
  }

  // Match Highway Preset
  let matchedHighwayPreset = highwayPresets.find((hp) => {
    if (lower.includes('phan thiết') || lower.includes('mũi né') || lower.includes('dầu giây')) return hp.id === 'HW-01';
    if (lower.includes('cần thơ') || lower.includes('mỹ thuận') || lower.includes('trung lương')) return hp.id === 'HW-02';
    if (lower.includes('vũng tàu')) return hp.id === 'HW-03';
    if (lower.includes('hải phòng') || lower.includes('hạ long')) return hp.id === 'HW-04';
    if (lower.includes('đà lạt') || lower.includes('bảo lộc')) return hp.id === 'NR-02';
    return false;
  });

  if (!matchedHighwayPreset) {
    matchedHighwayPreset = highwayPresets.find((hp) => hp.routeType === routeType) || highwayPresets[0];
  }

  // 4. Parse Monetary Amounts (Doanh thu, Phí đậu xe, Phí phạt, Nhập tay)
  const extractMoneyAfterKeyword = (keywords: string[]): number => {
    for (const kw of keywords) {
      const regex = new RegExp(`${kw}[^0-9]*([0-9]+(?:[.,][0-9]+)*)\\s*(triệu|tr|nghìn|ngàn|k|đ|vnd)?`, 'i');
      const m = input.match(regex);
      if (m) {
        const rawNum = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
        const unit = (m[2] || '').toLowerCase();
        if (unit === 'triệu' || unit === 'tr') return Math.round(rawNum * 1_000_000);
        if (unit === 'k' || unit === 'nghìn' || unit === 'ngàn') return Math.round(rawNum * 1_000);
        if (rawNum < 1000) return Math.round(rawNum * 1_000);
        return Math.round(rawNum);
      }
    }
    return 0;
  };

  let baseFareRevenue = extractMoneyAfterKeyword(['giá', 'doanh thu', 'cước', 'thu', 'chuyến']);
  if (!baseFareRevenue) {
    // Fallback: look for any "X triệu" or "X.000.000"
    const mTr = input.match(/([0-9]+(?:[.,][0-9]+)?)\s*(triệu|tr)\b/i);
    if (mTr) {
      baseFareRevenue = Math.round(parseFloat(mTr[1].replace(',', '.')) * 1_000_000);
    } else {
      baseFareRevenue = 2500000;
    }
  }

  const parkingFee = extractMoneyAfterKeyword(['đậu xe', 'gửi xe', 'bến bãi']);
  const trafficFineFee = extractMoneyAfterKeyword(['phạt', 'vi phạm', 'phạt nguội']);
  const manualExpenseTotal = extractMoneyAfterKeyword(['nhập tay', 'chi phí thêm', 'rửa xe', 'nước']);

  // 5. Parse Date & Time
  const today = new Date('2026-10-31T14:00:00+07:00');
  let tripDate = '2026-11-01';
  if (lower.includes('hôm nay')) {
    tripDate = '2026-10-31';
  } else if (lower.includes('ngày mốt') || lower.includes('02/11')) {
    tripDate = '2026-11-02';
  }

  const timeMatch = input.match(/\b([01]?[0-9]|2[0-3])\s*(?:h|:|giờ)\s*([0-5][0-9])?/i);
  const departureTime = timeMatch
    ? `${String(timeMatch[1]).padStart(2, '0')}:${timeMatch[2] ? String(timeMatch[2]).padStart(2, '0') : '00'}`
    : '07:30';

  // 6. Destination detection
  let dropoffLocation = 'Điểm đến theo lộ trình';
  const destMatch = input.match(/(?:đi|đến|tới)\s+([A-ZÀ-Ỹa-zà-ỹ0-9\s]+?)(?:,|theo|đường|tuyến|giá|doanh thu|giao|@|$)/i);
  if (destMatch && destMatch[1]) {
    dropoffLocation = destMatch[1].trim();
  }

  let intent: ParsedAICommand['intent'] = 'CREATE_BOOKING';
  if (lower.includes('chuyển lịch') || lower.includes('đổi tài xế') || lower.includes('nhận thay')) {
    intent = 'REASSIGN_TAG_DRIVER';
  } else if ((parkingFee > 0 || trafficFineFee > 0) && !lower.includes('đặt')) {
    intent = 'ADD_RISK_EXPENSE';
  }

  const summaryText = `AI đã nhận diện: Xe ${matchedVehicle?.seatCategory || '7 chỗ'} (${matchedVehicle?.brand} ${matchedVehicle?.model}) • Tuyến ${
    routeType === 'HIGHWAY' ? 'Cao tốc' : routeType === 'NATIONAL_ROAD' ? 'Quốc lộ' : 'Kết hợp'
  } • Tài xế được tag: ${taggedDrivers.length > 0 ? taggedDrivers.map((d) => d.fullName).join(', ') : matchedDriver?.fullName || 'Chưa chọn'} • Doanh thu: ${formatVND(baseFareRevenue)}`;

  return {
    intent,
    seatCategory: matchedVehicle?.seatCategory || seatCategory,
    matchedVehicle,
    matchedDriver,
    taggedDrivers: taggedDrivers.length > 0 ? taggedDrivers : matchedDriver ? [matchedDriver] : [],
    routeType,
    matchedHighwayPreset,
    tripDate,
    departureTime,
    pickupLocation: 'TP.HCM (Điểm đón khách)',
    dropoffLocation,
    baseFareRevenue,
    manualExpenseTotal,
    parkingFee,
    trafficFineFee,
    summaryText,
  };
}

export function buildBotDispatchMessage(
  trip: Trip,
  vehicle: Vehicle | undefined,
  driver: Driver | undefined,
  taggedDrivers: Driver[]
): string {
  const fin = calculateTripFinancials(trip);
  const routeBadge =
    trip.routeType === 'HIGHWAY'
      ? '🛣️ Tuyến Cao Tốc (Có tự cấn trừ ETC)'
      : trip.routeType === 'NATIONAL_ROAD'
      ? '🛤️ Tuyến Đường Quốc Lộ'
      : '🔀 Kết Hợp Cao Tốc & Quốc Lộ';

  const tagsStr =
    taggedDrivers.length > 0
      ? taggedDrivers.map((d) => `${d.fullName} (${d.telegramUsername} / Zalo ${d.zaloPhone})`).join(', ')
      : `${driver?.fullName || 'Tài xế'} (${driver?.telegramUsername || ''})`;

  return [
    `🤖 [BOT AI ĐIỀU XE & XÁC NHẬN LỊCH #${trip.tripCode}]`,
    `• Xe phục vụ: ${vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.seatCategory} - ${vehicle.plateNumber})` : 'Xe đội'}`,
    `• Tài xế được Tag: ${tagsStr}`,
    `• Thời gian: ${trip.departureTime} ngày ${trip.tripDate}`,
    `• Hành trình: ${trip.pickupLocation} ➔ ${trip.dropoffLocation} (${trip.distanceKm} km)`,
    `• Lộ trình: ${routeBadge} (${trip.routeDetail})`,
    `• Tổng thu chuyến: ${formatVND(fin.grossRevenue)} | Tự cấn trừ: ${formatVND(fin.totalAutoDeducted)} | Phí đậu xe/Phạt: ${formatVND(fin.totalRiskExpense)}`,
    `👉 Thực tế còn lại vào TK: ${formatVND(fin.netRemainingToAccount)}`,
    `👉 Vui lòng bấm [✅ XÁC NHẬN LỊCH] trên Zalo / Telegram hoặc @tag tài xế khác nếu bận!`,
  ].join('\n');
}
