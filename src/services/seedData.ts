import { FleetDatabase } from '../types/fleet';

export const initialFleetDatabase: FleetDatabase = {
  activeTenantId: 'TENANT-MAIN',
  adminAccounts: [
    {
      id: 'ADM-01',
      username: 'admin',
      email: 'admin@liucar.vn',
      fullName: 'Chủ Hệ Thống (Super Admin)',
      passwordHash: 'LiuCar@2026',
      role: 'SUPER_ADMIN',
      status: 'APPROVED',
      createdAt: '2026-01-01',
    },
  ],
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
