import { FleetDatabase } from '../types/fleet';

export const initialFleetDatabase: FleetDatabase = {
  activeTenantId: 'TENANT-MAIN',
  // Đăng nhập dùng Supabase Auth; không còn tài khoản mẫu nằm trong code
  adminAccounts: [],
  tenants: [
    {
      id: 'TENANT-MAIN',
      name: 'Thuê xe nhà',
      shortName: 'Thuê xe nhà',
      taxCode: '',
      hotline: '0393953935',
      bankInfo: '',
      defaultDispatchFeePercent: 10,
      autoFuelDeductionEnabled: true,
      autoHighwayTollEnabled: true,
      telegramBotToken: '',
      telegramGroupChatId: '',
      zaloOaName: '',
      createdAt: '2026-01-01',
    },
  ],
  journeyRoutes: [],
  highwayPresets: [],
  vehicles: [],
  drivers: [],
  trips: [],
  botLogs: [],
};
