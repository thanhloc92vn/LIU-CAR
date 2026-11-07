export type SeatCategory =
  | '4 chỗ'
  | '5 chỗ'
  | '7 chỗ'
  | '9 chỗ Limousine'
  | '16 chỗ'
  | '29 chỗ';

export type VehicleType =
  | 'Sedan'
  | 'SUV / CUV'
  | 'MPV Đa dụng'
  | 'Limousine VIP'
  | 'Minivan'
  | 'Bán tải (Pickup)'
  | 'Hatchback';

export type ServiceMode = 'WITH_DRIVER' | 'SELF_DRIVE' | 'BOTH';

export type RouteType = 'HIGHWAY' | 'NATIONAL_ROAD' | 'MIXED';

export interface SiteDestination {
  name: string;
  province: string;
  distance: string;
  blurb: string;
  image?: string; // link ảnh trên Supabase Storage
}

export interface SiteFaq {
  question: string;
  answer: string[];
}

// Nội dung trang khách do admin chỉnh. Trường nào chưa có thì trang khách dùng nội dung mặc định.
export interface SiteContent {
  facebookUrl?: string;
  destinations?: SiteDestination[];
  faqs?: SiteFaq[];
}

export interface TenantConfig {
  id: string;
  name: string;
  shortName: string;
  taxCode: string;
  hotline: string;
  bankInfo: string;
  defaultDispatchFeePercent: number; // % phí điều hành / tự cấn trừ mặc định
  autoFuelDeductionEnabled: boolean; // Tự động trừ định mức nhiên liệu theo km
  autoHighwayTollEnabled: boolean;   // Tự động trừ phí ETC khi chọn tuyến Cao tốc
  telegramBotToken?: string;
  telegramGroupChatId?: string;
  zaloOaName?: string;
  siteContent?: SiteContent;
  createdAt: string;
}

export type FuelType = 'ELECTRIC' | 'GASOLINE' | 'DIESEL';

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  ELECTRIC: '⚡ Xe điện',
  GASOLINE: '⛽ Xăng',
  DIESEL: '🛢️ Dầu',
};

export interface Vehicle {
  id: string;
  tenantId: string;
  plateNumber: string;
  brand: string;          // Hãng xe: Toyota, Mitsubishi, VinFast, Ford, Hyundai, Kia...
  model: string;          // Dòng xe: Xpander, Innova Cross, VF8, Vios, Carnival...
  vehicleType: VehicleType;
  seatCategory: SeatCategory; // 4 chỗ, 7 chỗ, 16 chỗ...
  year: number;
  color: string;
  serviceMode: ServiceMode;
  dailyRateSelfDrive: number; // Giá thuê tự lái / ngày
  fuelType?: FuelType;        // Loại nhiên liệu: Xe điện / Xăng / Dầu
  fuelCostPerKm: number;      // Định mức nhiên liệu tự cấn trừ (VNĐ/km)
  highwayTollMultiplier: number; // Hệ số phí trạm cao tốc (1.0 cho 4-7 chỗ, 1.5 cho 16 chỗ...)
  status: 'AVAILABLE' | 'ON_TRIP' | 'BOOKED' | 'MAINTENANCE';
  currentOdoKm: number;
  inspectionExpiry: string; // Hạn đăng kiểm
  insuranceExpiry: string;  // Hạn bảo hiểm
  notes?: string;
  images?: string[];        // Tối đa 3 ảnh (link Supabase Storage); ảnh đầu tiên là thumbnail
}

export interface Driver {
  id: string;
  tenantId: string;
  code: string;
  fullName: string;       // Họ và tên người lái
  phone: string;
  cccd: string;           // Số CCCD
  licenseNumber: string;  // Số GPLX
  licenseClass: 'B1' | 'B2' | 'C' | 'D' | 'E' | 'FC';
  licenseExpiry: string;  // Ngày hết hạn GPLX
  experienceYears: number;
  address: string;
  bankName: string;
  bankAccount: string;
  telegramUsername: string; // VD: @taixe_minh
  zaloPhone: string;
  telegramLinkCode?: string; // Mã 6 số admin cấp để tài xế liên kết bot Telegram (gõ /start <mã>)
  partyType?: 'EXTERNAL_DRIVER' | 'VEHICLE_OWNER'; // Tài xế ngoài (mặc định) hoặc Chủ xe
  ownedPlateNumbers?: string[]; // Các biển số xe của chủ xe, đối chiếu với danh mục xe
  ownedPlateNumber?: string; // (cũ) một biển số, vẫn đọc được để tương thích dữ liệu đã lưu
  status: 'ACTIVE' | 'ON_TRIP' | 'OFF_DUTY';
  baseCommissionPercent: number; // % chiết khấu / hoa hồng
  documentsVerified: {
    cccd: boolean;
    driverLicense: boolean;
    contract: boolean;
    healthCert: boolean;
  };
  notes?: string;
}

export interface HighwayPreset {
  id: string;
  name: string;
  routeType: RouteType;
  defaultDistanceKm: number;
  baseToll4To7Seats: number; // Phí cao tốc chuẩn cho xe 4-7 chỗ (1 chiều)
  description: string;
}

// Hành trình mẫu do admin cấu hình: điểm A - B, giá cước và tiền tài xế theo chặng
export interface JourneyRoute {
  id: string;
  tenantId: string;
  pointA: string;
  pointB: string;
  routeType: RouteType;
  distanceKm: number;        // Quãng đường 1 chiều
  priceOneWay: number;       // Giá cước 1 chiều
  priceRoundTrip: number;    // Giá cước khứ hồi
  tollOneWay?: number;       // Cước phí cao tốc (ETC) một chiều
  tollRoundTrip?: number;    // Cước phí cao tốc (ETC) khứ hồi
  highwayName?: string;      // Tên cao tốc / trạm thu phí cao tốc (admin tự đặt)
  nationalRoadName?: string; // Tên quốc lộ / trạm thu phí quốc lộ (admin tự đặt)
  nationalTollOneWay?: number;   // Cước quốc lộ (trạm BOT...) một chiều
  nationalTollRoundTrip?: number; // Cước quốc lộ khứ hồi
  hotelPerNight?: number;    // Tiền khách sạn mỗi đêm (tự điền khi chuyến qua đêm)
  driverPayOneWay: number;   // Tiền trả tài xế 1 chiều
  driverPayRoundTrip: number; // Tiền trả tài xế khứ hồi
  // Bảng giá bổ sung. Các trường phẳng ở trên là: có tài xế, ngày thường.
  holidayWithDriver?: JourneyPricing;   // Có tài xế, ngày lễ
  selfDriveNormal?: JourneyPricing;     // Tự lái, ngày thường
  selfDriveHoliday?: JourneyPricing;    // Tự lái, ngày lễ
  note?: string;
}

export interface JourneyPricing {
  pricePerDay?: number;      // Thuê tự lái: giá thuê mỗi ngày
  batteryRatePerKm?: number; // Thuê tự lái xe điện: đơn giá pin đ/km (trống = 1.500)
  priceOneWay: number;
  priceRoundTrip: number;
  tollOneWay: number;
  tollRoundTrip: number;
  nationalTollOneWay?: number;
  nationalTollRoundTrip?: number;
  driverPayOneWay: number;
  driverPayRoundTrip: number;
  hotelPerNight: number;
}

export type JourneyService = 'WITH_DRIVER' | 'SELF_DRIVE';

export interface ManualExpenseItem {
  id: string;
  title: string;
  amount: number;
  createdAt: string;
}

export interface Trip {
  id: string;
  tenantId: string;
  tripCode: string;
  bookingType: 'WITH_DRIVER' | 'SELF_DRIVE';
  vehicleId: string;
  driverId: string; // Tài xế chạy chuyến (hoặc người lái chính)
  taggedDriverIds: string[]; // Danh sách tài xế được @tag nhận thông báo
  customerName: string;
  customerPhone: string;
  customerCccd?: string;     // Dùng khi thuê tự lái
  customerLicense?: string;  // GPLX khách tự lái
  // Thông tin thêm của khách tự lái, dùng điền hợp đồng thuê xe
  customerBirthDate?: string;     // YYYY-MM-DD
  customerAddress?: string;       // Địa chỉ thường trú
  customerCccdIssueDate?: string; // YYYY-MM-DD
  customerCccdIssuePlace?: string;
  deliveryMode?: 'SELF_PICKUP' | 'DELIVERY'; // Tự lái: khách tự đến lấy hay giao xe tận nơi
  tripDate: string;          // YYYY-MM-DD
  tripEndDate?: string;      // Ngày về (chuyến nhiều ngày, có ở qua đêm)
  journeyRouteId?: string;   // Hành trình mẫu đã áp dụng
  driverPay?: number;        // Tiền trả tài xế cho chuyến (nhập tay được)
  hotelFee?: number;         // Tiền khách sạn khi ở qua đêm (nhập tay)
  hotelNote?: string;
  departureTime: string;     // HH:mm
  returnTime: string;        // HH:mm
  pickupLocation: string;
  pickupLat?: number;        // toạ độ điểm đón khi khách chọn từ bản đồ, bot gửi vị trí cho tài xế
  pickupLng?: number;
  dropoffLocation: string;
  routeType: RouteType;      // HIGHWAY (Cao tốc) | NATIONAL_ROAD (Quốc lộ) | MIXED (Kết hợp)
  routeDetail: string;       // Tên tuyến cụ thể (VD: Cao tốc TP.HCM - Long Thành - Phan Thiết)
  distanceKm: number;
  isRoundTrip: boolean;
  isHolidayRate?: boolean;   // Áp bảng giá ngày lễ
  actualKm?: number;         // Thuê tự lái xe điện: km thực tế chạy (nhập khi nhận lại xe)
  batteryRatePerKm?: number; // Thuê tự lái xe điện: đơn giá pin đ/km

  // 1. Doanh thu
  baseFareRevenue: number;   // Số tiền theo chuyến
  surchargeRevenue: number;  // Phụ thu (quá giờ, quá km...)
  paymentCollectedBy: 'COMPANY_BANK' | 'DRIVER_CASH'; // Tiền về TK công ty hay Tài xế thu hộ

  // 2. Chi phí Tự cấn trừ (Auto-deducted)
  autoHighwayToll: number;   // Phí Cao tốc / ETC tự cấn trừ
  autoFuelQuota: number;     // Định mức xăng/dầu tự cấn trừ theo km
  autoDispatchFee: number;   // Chiết khấu/Phí điều hành tự cấn trừ

  // 3. Chi phí Nhập tay (Manual input)
  manualExpenseTotal: number;
  manualExpenseNote: string;
  manualExpenseItems?: ManualExpenseItem[];

  // 4. Chi phí Phát sinh Rủi ro (Phạt giao thông & Đậu xe)
  parkingFee: number;        // Chi phí đậu xe / bến bãi
  parkingNote: string;
  trafficFineFee: number;    // Chi phí phạt giao thông (phạt nguội/nóng)
  trafficFineNote: string;
  otherRiskFee: number;      // Chi phí rủi ro khác (va quệt, cứu hộ...)
  otherRiskNote: string;

  // Trạng thái & Bot AI
  status: 'PENDING_CONFIRM' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  botChannel: 'BOTH' | 'TELEGRAM' | 'ZALO';
  botConfirmedAt?: string;
  botConfirmedByDriverName?: string;
  dispatchedAt?: string;     // Thời điểm điều hành điều phối (chọn) tài xế; chỉ khi đó tài xế mới được báo riêng
  dispatchedByName?: string;
  completedAt?: string;      // Thời điểm xác nhận hoàn thành chuyến
  completedByName?: string;  // Người xác nhận hoàn thành (tài xế hoặc điều hành)
  notes?: string;
  createdAt: string;
}

export interface BotNotificationLog {
  id: string;
  tenantId: string;
  tripId?: string;
  tripCode?: string;
  timestamp: string;
  channel: 'TELEGRAM' | 'ZALO' | 'AI_SYSTEM';
  recipientDriverId?: string;
  recipientName: string;
  recipientHandle: string; // @username hoặc SĐT Zalo
  messageType: 'BOOKING_CONFIRM' | 'TAG_HANDOVER' | 'RISK_ALERT' | 'AI_COMMAND';
  content: string;
  status: 'SENT_WAITING' | 'DRIVER_CONFIRMED' | 'DRIVER_BUSY_RETAGGED' | 'DELIVERED';
}

export interface AdminAccount {
  id: string;
  username: string;
  email: string;
  fullName: string;
  passwordHash: string; // Lưu mật khẩu quản trị
  role: 'SUPER_ADMIN' | 'DISPATCHER' | 'ACCOUNTANT';
  status: 'APPROVED' | 'PENDING_APPROVAL' | 'LOCKED';
  createdAt: string;
}

export interface AuthUserSession {
  id: string;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'DRIVER';
  subRole?: 'SUPER_ADMIN' | 'DISPATCHER' | 'ACCOUNTANT';
  driverId?: string; // Nếu role === 'DRIVER' thì chỉ xem/thao tác chuyến của tài xế này
  loginAt: string;
}

export interface FleetDatabase {
  tenants: TenantConfig[];
  activeTenantId: string;
  adminAccounts?: AdminAccount[];
  vehicles: Vehicle[];
  drivers: Driver[];
  highwayPresets: HighwayPreset[];
  journeyRoutes?: JourneyRoute[];
  trips: Trip[];
  botLogs: BotNotificationLog[];
}
