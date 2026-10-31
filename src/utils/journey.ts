import { JourneyPricing, JourneyRoute, JourneyService, RouteType } from '../types/fleet';

export const DEFAULT_BATTERY_RATE_PER_KM = 1500;

export const EMPTY_PRICING: JourneyPricing = {
  pricePerDay: 0,
  batteryRatePerKm: 0,
  priceOneWay: 0,
  priceRoundTrip: 0,
  tollOneWay: 0,
  tollRoundTrip: 0,
  nationalTollOneWay: 0,
  nationalTollRoundTrip: 0,
  driverPayOneWay: 0,
  driverPayRoundTrip: 0,
  hotelPerNight: 0,
};

// Bảng giá của hành trình theo hình thức thuê và loại ngày.
// Ngày lễ chưa cấu hình thì dùng giá ngày thường.
export function getJourneyPricing(
  route: JourneyRoute,
  service: JourneyService,
  holiday: boolean
): JourneyPricing {
  const withDriverNormal: JourneyPricing = {
    priceOneWay: route.priceOneWay,
    priceRoundTrip: route.priceRoundTrip,
    tollOneWay: route.tollOneWay || 0,
    tollRoundTrip: route.tollRoundTrip || 0,
    nationalTollOneWay: route.nationalTollOneWay || 0,
    nationalTollRoundTrip: route.nationalTollRoundTrip || 0,
    driverPayOneWay: route.driverPayOneWay,
    driverPayRoundTrip: route.driverPayRoundTrip,
    hotelPerNight: route.hotelPerNight || 0,
  };
  if (service === 'WITH_DRIVER') {
    return holiday && route.holidayWithDriver ? route.holidayWithDriver : withDriverNormal;
  }
  const normal = route.selfDriveNormal || EMPTY_PRICING;
  return holiday && route.selfDriveHoliday ? route.selfDriveHoliday : normal;
}

// Cước đường theo loại đường của chuyến: cao tốc, quốc lộ hoặc cộng cả hai khi đi kết hợp.
export function journeyTollFor(pr: JourneyPricing, routeType: RouteType, roundTrip: boolean): number {
  const highway = roundTrip ? pr.tollRoundTrip : pr.tollOneWay;
  const national = (roundTrip ? pr.nationalTollRoundTrip : pr.nationalTollOneWay) || 0;
  if (routeType === 'HIGHWAY') return highway;
  if (routeType === 'NATIONAL_ROAD') return national;
  return highway + national;
}
