import React, { useEffect, useMemo, useState } from 'react';
import {
  BatteryCharging,
  Bot,
  Building2,
  Calendar,
  Car,
  ChevronRight,
  Edit3,
  Globe,
  Laptop,
  LogOut,
  MapPin,
  Plus,
  Printer,
  ShieldCheck,
  Signal,
  Smartphone,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  Wallet,
  Wifi,
} from 'lucide-react';
import {
  AdminAccount,
  AuthUserSession,
  BotNotificationLog,
  Driver,
  FleetDatabase,
  HighwayPreset,
  SeatCategory,
  TenantConfig,
  Trip,
  Vehicle,
} from './types/fleet';
import { initialFleetDatabase } from './services/seedData';
import {
  isSupabaseConfigured,
  loadFromSupabase,
  saveToSupabase,
} from './services/supabaseClient';
import { calculateTripFinancials, formatVND } from './utils/calculations';
import { buildBotDispatchMessage } from './utils/aiBotEngine';
import { BookingModal } from './components/BookingModal';
import { FinanceSettlementTab } from './components/FinanceSettlementTab';
import { FleetAndDriversTab } from './components/FleetAndDriversTab';
import { AIBotZaloTelegramTab } from './components/AIBotZaloTelegramTab';
import { MultiTenantSaaSModal } from './components/MultiTenantSaaSModal';
import { AuthLoginGate } from './components/AuthLoginGate';
import { AdminSecurityModal } from './components/AdminSecurityModal';
import { PrintableVoucherModal } from './components/PrintableVoucherModal';
import { PublicCustomerBookingPortal } from './components/PublicCustomerBookingPortal';

type ActiveTab = 'BOOKINGS' | 'FINANCE' | 'FLEET_DRIVERS' | 'AI_BOT';

function checkIsAdminUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  return (
    path.startsWith('/admin') ||
    path.startsWith('/quan-tri') ||
    path.startsWith('/login') ||
    hash.includes('admin') ||
    hash.includes('quan-tri')
  );
}

export function App() {
  const [db, setDb] = useState<FleetDatabase>(initialFleetDatabase);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(checkIsAdminUrl);
  const [authSession, setAuthSession] = useState<AuthUserSession | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = sessionStorage.getItem('LIUCAR_AUTH_SESSION');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('BOOKINGS');
  const [mobilePreviewMode, setMobilePreviewMode] = useState<boolean>(false);
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  // Filters on the Bookings Dashboard
  const [bookingSeatFilter, setBookingSeatFilter] = useState<'ALL' | SeatCategory>('ALL');
  const [bookingRouteFilter, setBookingRouteFilter] = useState<'ALL' | 'HIGHWAY' | 'NATIONAL_ROAD'>(
    'ALL'
  );
  const [bookingDriverFilter, setBookingDriverFilter] = useState<string>('ALL');

  // Modals
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [voucherTrip, setVoucherTrip] = useState<Trip | null>(null);
  const [isSaaSModalOpen, setIsSaaSModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => setIsSmallScreen(window.innerWidth < 768);
    const handleRouteChange = () => setIsAdminRoute(checkIsAdminUrl());
    window.addEventListener('resize', handleResize);
    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
    };
  }, []);

  const navigateToRoute = (targetPath: '/' | '/admin') => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', targetPath);
      setIsAdminRoute(checkIsAdminUrl());
    }
  };

  const isMobileLayout = mobilePreviewMode || isSmallScreen;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  // Load persistent DB from Supabase -> backend `/api/db` -> localStorage
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      if (isSupabaseConfigured()) {
        const cloudData = await loadFromSupabase();
        if (cloudData && cloudData.vehicles && mounted) {
          setDb({
            ...initialFleetDatabase,
            ...cloudData,
            adminAccounts:
              cloudData.adminAccounts && cloudData.adminAccounts.length > 0
                ? cloudData.adminAccounts
                : initialFleetDatabase.adminAccounts,
          });
          setIsLoaded(true);
          return;
        }
      }

      try {
        const res = await fetch('/api/db');
        if (res.ok) {
          const serverData = await res.json();
          if (serverData && serverData.vehicles && mounted) {
            setDb({
              ...initialFleetDatabase,
              ...serverData,
              adminAccounts:
                serverData.adminAccounts && serverData.adminAccounts.length > 0
                  ? serverData.adminAccounts
                  : initialFleetDatabase.adminAccounts,
            });
            setIsLoaded(true);
            return;
          }
        }
      } catch {
        // Fallback to localStorage
      }

      const cached = localStorage.getItem('SMARTFLEET_DB_V1');
      if (cached && mounted) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.vehicles) {
            setDb({
              ...initialFleetDatabase,
              ...parsed,
              adminAccounts:
                parsed.adminAccounts && parsed.adminAccounts.length > 0
                  ? parsed.adminAccounts
                  : initialFleetDatabase.adminAccounts,
            });
            setIsLoaded(true);
            return;
          }
        } catch {
          // ignore
        }
      }

      // Initialize backend with seed data
      try {
        await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(initialFleetDatabase),
        });
      } catch {
        // ignore
      }
      if (mounted) setIsLoaded(true);
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  // Persist DB whenever it changes
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('SMARTFLEET_DB_V1', JSON.stringify(db));
    if (isSupabaseConfigured()) {
      saveToSupabase(db).catch(() => {});
    }
    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(db),
    }).catch(() => {});
  }, [db, isLoaded]);

  const adminAccounts: AdminAccount[] = useMemo(
    () => db.adminAccounts || initialFleetDatabase.adminAccounts || [],
    [db.adminAccounts]
  );

  const pendingApprovalsCount = useMemo(
    () => adminAccounts.filter((a) => a.status === 'PENDING_APPROVAL').length,
    [adminAccounts]
  );

  const activeTenant: TenantConfig = useMemo(() => {
    return (
      db.tenants.find((t) => t.id === db.activeTenantId) ||
      db.tenants[0] ||
      initialFleetDatabase.tenants[0]
    );
  }, [db.tenants, db.activeTenantId]);

  const tenantVehicles = useMemo(
    () => db.vehicles.filter((v) => v.tenantId === activeTenant.id),
    [db.vehicles, activeTenant.id]
  );

  const tenantDrivers = useMemo(
    () => db.drivers.filter((d) => d.tenantId === activeTenant.id),
    [db.drivers, activeTenant.id]
  );

  const tenantTrips = useMemo(() => {
    const all = db.trips.filter((t) => t.tenantId === activeTenant.id);
    // If logged in as a DRIVER, restrict to only their assigned or tagged trips
    if (authSession?.role === 'DRIVER' && authSession.driverId) {
      const drvId = authSession.driverId;
      return all.filter(
        (t) =>
          t.driverId === drvId ||
          t.taggedDriverIds?.includes(drvId)
      );
    }
    return all;
  }, [db.trips, activeTenant.id, authSession]);

  const tenantBotLogs = useMemo(
    () => db.botLogs.filter((l) => l.tenantId === activeTenant.id),
    [db.botLogs, activeTenant.id]
  );

  // Dashboard Metrics
  const kpi = useMemo(() => {
    let grossRevenue = 0;
    let totalAutoDeducted = 0;
    let totalManualExpense = 0;
    let totalParking = 0;
    let totalTrafficFine = 0;
    let totalRiskExpense = 0;
    let netRemainingToAccount = 0;

    tenantTrips.forEach((t) => {
      if (t.status === 'CANCELLED') return;
      const b = calculateTripFinancials(t);
      grossRevenue += b.grossRevenue;
      totalAutoDeducted += b.totalAutoDeducted;
      totalManualExpense += b.totalManualExpense;
      totalParking += b.parkingFee;
      totalTrafficFine += b.trafficFineFee;
      totalRiskExpense += b.totalRiskExpense;
      netRemainingToAccount += b.netRemainingToAccount;
    });

    return {
      grossRevenue,
      totalAutoDeducted,
      totalManualExpense,
      totalParking,
      totalTrafficFine,
      totalRiskExpense,
      netRemainingToAccount,
    };
  }, [tenantTrips]);

  // Filtered bookings for Tab 1
  const filteredDashboardTrips = useMemo(() => {
    return tenantTrips.filter((t) => {
      if (bookingDriverFilter !== 'ALL' && t.driverId !== bookingDriverFilter) return false;
      if (bookingRouteFilter === 'HIGHWAY' && t.routeType !== 'HIGHWAY' && t.routeType !== 'MIXED')
        return false;
      if (bookingRouteFilter === 'NATIONAL_ROAD' && t.routeType !== 'NATIONAL_ROAD') return false;
      if (bookingSeatFilter !== 'ALL') {
        const veh = tenantVehicles.find((v) => v.id === t.vehicleId);
        if (!veh || veh.seatCategory !== bookingSeatFilter) return false;
      }
      return true;
    });
  }, [tenantTrips, bookingDriverFilter, bookingRouteFilter, bookingSeatFilter, tenantVehicles]);

  // Auth Handlers
  const handleLoginSuccess = (session: AuthUserSession) => {
    setAuthSession(session);
    sessionStorage.setItem('LIUCAR_AUTH_SESSION', JSON.stringify(session));
    showToast(`👋 Chào mừng ${session.fullName} đã đăng nhập hệ thống!`);
  };

  const handleLogout = () => {
    setAuthSession(null);
    sessionStorage.removeItem('LIUCAR_AUTH_SESSION');
  };

  const handleRequestAdminAccess = (
    newAcc: Omit<AdminAccount, 'id' | 'createdAt' | 'status'>
  ) => {
    const created: AdminAccount = {
      ...newAcc,
      id: `ADM-${Date.now()}`,
      status: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setDb((prev) => ({
      ...prev,
      adminAccounts: [...(prev.adminAccounts || []), created],
    }));
  };

  // Handlers
  const handleSaveTrip = (tripData: Omit<Trip, 'id' | 'createdAt'>, existingId?: string) => {
    if (existingId) {
      setDb((prev) => ({
        ...prev,
        trips: prev.trips.map((t) =>
          t.id === existingId ? { ...t, ...tripData } : t
        ),
      }));
      showToast(`✅ Đã cập nhật chuyến #${tripData.tripCode} và tính lại số thực tế còn lại vào TK!`);
    } else {
      const newId = `TRIP-${Date.now()}`;
      const newTrip: Trip = {
        ...tripData,
        id: newId,
        createdAt: new Date().toISOString(),
      };
      const veh = tenantVehicles.find((v) => v.id === newTrip.vehicleId);
      const drv = tenantDrivers.find((d) => d.id === newTrip.driverId);
      const taggedDrvs = tenantDrivers.filter((d) =>
        newTrip.taggedDriverIds.includes(d.id)
      );

      const botMsg = buildBotDispatchMessage(newTrip, veh, drv, taggedDrvs);
      const newLog: BotNotificationLog = {
        id: `LOG-${Date.now()}`,
        tenantId: activeTenant.id,
        tripId: newId,
        tripCode: newTrip.tripCode,
        timestamp: new Date().toLocaleString('vi-VN'),
        channel: newTrip.botChannel === 'ZALO' ? 'ZALO' : 'TELEGRAM',
        recipientDriverId: drv?.id,
        recipientName: drv?.fullName || 'Tài xế',
        recipientHandle: taggedDrvs
          .map((d) => `${d.telegramUsername} / Zalo:${d.zaloPhone}`)
          .join(', '),
        messageType: 'BOOKING_CONFIRM',
        content: botMsg,
        status: 'SENT_WAITING',
      };

      setDb((prev) => ({
        ...prev,
        trips: [newTrip, ...prev.trips],
        botLogs: [newLog, ...prev.botLogs],
      }));
      showToast(
        `🚀 Đã tạo lịch #${newTrip.tripCode} & bắn thông báo @Tag tài xế qua Zalo/Telegram!`
      );
    }
    setEditingTrip(null);
  };

  const handleQuickUpdateExpenses = (
    tripId: string,
    updates: {
      manualExpenseTotal?: number;
      manualExpenseNote?: string;
      parkingFee?: number;
      parkingNote?: string;
      trafficFineFee?: number;
      trafficFineNote?: string;
    }
  ) => {
    setDb((prev) => ({
      ...prev,
      trips: prev.trips.map((t) => (t.id === tripId ? { ...t, ...updates } : t)),
    }));
    showToast('✅ Đã cập nhật chi phí phạt / đậu xe / nhập tay và cấn trừ vào số thực tế còn lại!');
  };

  const handleDriverConfirmTrip = (tripId: string, channel: 'TELEGRAM' | 'ZALO') => {
    const targetTrip = db.trips.find((t) => t.id === tripId);
    if (!targetTrip) return;
    const drv = db.drivers.find((d) => d.id === targetTrip.driverId);
    const nowStr = new Date().toLocaleString('vi-VN');

    const newLog: BotNotificationLog = {
      id: `LOG-${Date.now()}`,
      tenantId: activeTenant.id,
      tripId: targetTrip.id,
      tripCode: targetTrip.tripCode,
      timestamp: nowStr,
      channel,
      recipientDriverId: drv?.id,
      recipientName: drv?.fullName || 'Tài xế',
      recipientHandle: channel === 'TELEGRAM' ? drv?.telegramUsername || '' : drv?.zaloPhone || '',
      messageType: 'BOOKING_CONFIRM',
      content: `✅ Tài xế ${drv?.fullName} đã bấm nút [XÁC NHẬN LỊCH #${targetTrip.tripCode}] qua ${channel}. Hệ thống đã khóa lịch xe và ghi nhận tự cấn trừ.`,
      status: 'DRIVER_CONFIRMED',
    };

    setDb((prev) => ({
      ...prev,
      trips: prev.trips.map((t) =>
        t.id === tripId
          ? {
              ...t,
              status: 'CONFIRMED',
              botConfirmedAt: nowStr,
              botConfirmedByDriverName: drv?.fullName,
            }
          : t
      ),
      botLogs: [newLog, ...prev.botLogs],
    }));

    showToast(`✅ Tài xế ${drv?.fullName} đã xác nhận lịch #${targetTrip.tripCode} qua ${channel}!`);
  };

  const handleTagReassignDriver = (
    tripId: string,
    newDriverId: string,
    channel: 'TELEGRAM' | 'ZALO'
  ) => {
    const targetTrip = db.trips.find((t) => t.id === tripId);
    const oldDrv = db.drivers.find((d) => d.id === targetTrip?.driverId);
    const newDrv = db.drivers.find((d) => d.id === newDriverId);
    if (!targetTrip || !newDrv) return;

    const nowStr = new Date().toLocaleString('vi-VN');
    const newLog: BotNotificationLog = {
      id: `LOG-${Date.now()}`,
      tenantId: activeTenant.id,
      tripId: targetTrip.id,
      tripCode: targetTrip.tripCode,
      timestamp: nowStr,
      channel,
      recipientDriverId: newDrv.id,
      recipientName: newDrv.fullName,
      recipientHandle: `${newDrv.telegramUsername} / Zalo:${newDrv.zaloPhone}`,
      messageType: 'TAG_HANDOVER',
      content: `🔄 [TAG CHUYỂN TÀI XẾ] Chuyến #${targetTrip.tripCode} đã được tag chuyển từ ${
        oldDrv?.fullName || 'Tài xế cũ'
      } sang cho @${newDrv.fullName} (${newDrv.telegramUsername}). Đã gửi thông báo khẩn qua Zalo & Telegram!`,
      status: 'DRIVER_BUSY_RETAGGED',
    };

    setDb((prev) => ({
      ...prev,
      trips: prev.trips.map((t) =>
        t.id === tripId
          ? {
              ...t,
              driverId: newDrv.id,
              taggedDriverIds: Array.from(new Set([...t.taggedDriverIds, newDrv.id])),
              botConfirmedByDriverName: newDrv.fullName,
            }
          : t
      ),
      botLogs: [newLog, ...prev.botLogs],
    }));

    showToast(
      `🔄 Đã @Tag chuyển chuyến #${targetTrip.tripCode} sang tài xế ${newDrv.fullName} qua Zalo & Telegram!`
    );
  };

  const handleBotQuickAddRisk = (
    tripId: string,
    type: 'PARKING' | 'FINE',
    amount: number,
    note: string
  ) => {
    const targetTrip = db.trips.find((t) => t.id === tripId);
    if (!targetTrip) return;

    setDb((prev) => ({
      ...prev,
      trips: prev.trips.map((t) => {
        if (t.id !== tripId) return t;
        if (type === 'PARKING') {
          return {
            ...t,
            parkingFee: (Number(t.parkingFee) || 0) + amount,
            parkingNote: t.parkingNote ? `${t.parkingNote}; ${note}` : note,
          };
        }
        return {
          ...t,
          trafficFineFee: (Number(t.trafficFineFee) || 0) + amount,
          trafficFineNote: t.trafficFineNote ? `${t.trafficFineNote}; ${note}` : note,
        };
      }),
    }));

    showToast(
      `🧾 Bot đã cộng thêm ${formatVND(amount)} (${
        type === 'PARKING' ? 'Chi phí đậu xe' : 'Chi phí phạt GT'
      }) vào chuyến #${targetTrip.tripCode}!`
    );
  };

  const handleCreateTripFromAI = (
    tripData: Omit<Trip, 'id' | 'createdAt'>,
    botLogData: Omit<BotNotificationLog, 'id'>
  ) => {
    const newTripId = `TRIP-${Date.now()}`;
    const newTrip: Trip = {
      ...tripData,
      id: newTripId,
      createdAt: new Date().toISOString(),
    };
    const newLog: BotNotificationLog = {
      ...botLogData,
      id: `LOG-${Date.now()}`,
      tripId: newTripId,
    };

    setDb((prev) => ({
      ...prev,
      trips: [newTrip, ...prev.trips],
      botLogs: [newLog, ...prev.botLogs],
    }));
  };

  const handleAddVehicle = (vehData: Omit<Vehicle, 'id'>) => {
    const newVeh: Vehicle = {
      ...vehData,
      id: `VEH-${Date.now()}`,
    };
    setDb((prev) => ({
      ...prev,
      vehicles: [newVeh, ...prev.vehicles],
    }));
    showToast(`🚗 Đã thêm xe ${newVeh.brand} ${newVeh.model} (${newVeh.seatCategory}) vào đội xe!`);
  };

  const handleAddDriver = (drvData: Omit<Driver, 'id'>) => {
    const newDrv: Driver = {
      ...drvData,
      id: `DRV-${Date.now()}`,
    };
    setDb((prev) => ({
      ...prev,
      drivers: [newDrv, ...prev.drivers],
    }));
    showToast(`👨‍✈️ Đã lưu hồ sơ tài xế ${newDrv.fullName} (GPLX hạng ${newDrv.licenseClass})!`);
  };

  const handleCloneNewTenant = (newTenantData: Omit<TenantConfig, 'id' | 'createdAt'>) => {
    const newTenantId = `TENANT-${Date.now()}`;
    const newTenant: TenantConfig = {
      ...newTenantData,
      id: newTenantId,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    const clonedVehicles: Vehicle[] = tenantVehicles.slice(0, 3).map((v, idx) => ({
      ...v,
      id: `VEH-${Date.now()}-${idx}`,
      tenantId: newTenantId,
    }));

    const clonedDrivers: Driver[] = tenantDrivers.slice(0, 2).map((d, idx) => ({
      ...d,
      id: `DRV-${Date.now()}-${idx}`,
      tenantId: newTenantId,
    }));

    setDb((prev) => ({
      ...prev,
      tenants: [...prev.tenants, newTenant],
      activeTenantId: newTenantId,
      vehicles: [...prev.vehicles, ...clonedVehicles],
      drivers: [...prev.drivers, ...clonedDrivers],
    }));
    showToast(`🧬 Đã nhân bản thành công hệ thống cho "${newTenant.name}"!`);
  };

  // Handler when a public customer submits a booking from `/`
  const handleCustomerCreateBooking = (
    tripData: Omit<Trip, 'id' | 'createdAt'>
  ): Trip => {
    const newId = `TRIP-${Date.now()}`;
    const newTrip: Trip = {
      ...tripData,
      id: newId,
      createdAt: new Date().toISOString(),
    };
    const veh = tenantVehicles.find((v) => v.id === newTrip.vehicleId);
    const drv = tenantDrivers.find((d) => d.id === newTrip.driverId);
    const taggedDrvs = tenantDrivers.filter((d) =>
      newTrip.taggedDriverIds.includes(d.id)
    );

    const botMsg = buildBotDispatchMessage(newTrip, veh, drv, taggedDrvs);
    const newLog: BotNotificationLog = {
      id: `LOG-${Date.now()}`,
      tenantId: activeTenant.id,
      tripId: newId,
      tripCode: newTrip.tripCode,
      timestamp: new Date().toLocaleString('vi-VN'),
      channel: 'TELEGRAM',
      recipientDriverId: drv?.id,
      recipientName: drv?.fullName || 'Tài xế',
      recipientHandle: taggedDrvs
        .map((d) => `${d.telegramUsername} / Zalo:${d.zaloPhone}`)
        .join(', '),
      messageType: 'BOOKING_CONFIRM',
      content: `🌐 [KHÁCH ĐẶT TRỰC TUYẾN TRÊN WEB]\n${botMsg}`,
      status: 'SENT_WAITING',
    };

    setDb((prev) => ({
      ...prev,
      trips: [newTrip, ...prev.trips],
      botLogs: [newLog, ...prev.botLogs],
    }));

    return newTrip;
  };

  // 1. TRANG CÔNG KHAI CHO KHÁCH HÀNG ĐẶT XE (`/`) — Tách biệt hoàn toàn khỏi link Admin
  if (!isAdminRoute) {
    return (
      <PublicCustomerBookingPortal
        tenant={activeTenant}
        vehicles={tenantVehicles}
        drivers={tenantDrivers}
        highwayPresets={db.highwayPresets}
        trips={db.trips.filter((t) => t.tenantId === activeTenant.id)}
        onCustomerCreateBooking={handleCustomerCreateBooking}
      />
    );
  }

  // 2. TRANG ĐĂNG NHẬP QUẢN TRỊ RIÊNG (`/admin` hoặc `/quan-tri` hoặc `/login`)
  if (!authSession) {
    return (
      <AuthLoginGate
        adminAccounts={adminAccounts}
        drivers={tenantDrivers}
        companyName={activeTenant.name}
        onLoginSuccess={handleLoginSuccess}
        onRequestAdminAccess={handleRequestAdminAccess}
        onBackToPublicPortal={() => navigateToRoute('/')}
      />
    );
  }

  return (
    <div
      className={`min-h-screen text-slate-900 flex flex-col ${
        mobilePreviewMode ? 'items-center justify-center py-3 px-2 bg-slate-950' : 'bg-slate-100'
      }`}
    >
      {/* Thanh điều khiển nằm NGOÀI khung điện thoại khi bật chế độ Xem trước App Mobile */}
      {mobilePreviewMode && (
        <div className="w-full max-w-[430px] mb-2.5 flex items-center justify-between bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-2xl text-white shadow-lg">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
            <Smartphone className="w-4 h-4 text-blue-400" />
            <span>Khung App Di Động (iOS / Android)</span>
          </div>
          <button
            type="button"
            onClick={() => setMobilePreviewMode(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold transition shadow-sm"
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Mở Rộng Màn Hình Web</span>
          </button>
        </div>
      )}

      {/* Khung bao chính */}
      <div
        className={
          mobilePreviewMode
            ? 'w-full max-w-[430px] h-[840px] max-h-[88vh] bg-slate-100 rounded-[42px] shadow-2xl border-[10px] border-slate-800 flex flex-col overflow-hidden relative'
            : 'w-full min-h-screen flex flex-col pb-20 md:pb-8'
        }
      >
        {/* Thanh trạng thái điện thoại iOS/Android khi ở chế độ Mobile Preview */}
        {mobilePreviewMode && (
          <div className="bg-slate-900 text-white px-6 pt-2 pb-1 flex items-center justify-between text-[11px] font-bold select-none shrink-0">
            <span>09:41</span>
            <div className="w-24 h-4 bg-black rounded-full" />
            <div className="flex items-center gap-1.5 text-slate-200">
              <Signal className="w-3 h-3" />
              <Wifi className="w-3 h-3" />
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
        )}

        {/* Top Header */}
        <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md border-b border-slate-800 shrink-0">
          <div
            className={`${
              isMobileLayout ? 'px-3.5 py-2.5' : 'max-w-7xl mx-auto px-3 sm:px-6 py-3'
            } flex items-center justify-between gap-2`}
          >
            {/* Brand & Tenant Switcher */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-inner shrink-0">
                <Car className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm sm:text-base font-extrabold tracking-tight truncate">
                    {activeTenant.shortName}
                  </h1>
                  {authSession.role === 'ADMIN' && (
                    <button
                      type="button"
                      onClick={() => setIsSaaSModalOpen(true)}
                      className="px-2 py-0.5 rounded-full bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-[10px] font-bold text-blue-300 shrink-0 transition"
                      title="Nhân bản doanh nghiệp mới hoặc chuyển chi nhánh"
                    >
                      🧬 {db.tenants.length} CN
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 truncate">
                  {authSession.role === 'ADMIN'
                    ? `👑 Quản trị: ${authSession.fullName}`
                    : `👨‍✈️ Tài xế: ${authSession.fullName}`}
                </p>
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => navigateToRoute('/')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-blue-300 border border-slate-700 hover:bg-slate-700 transition"
                title="Xem trang công khai dành cho khách hàng đặt xe"
              >
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden md:inline">Trang Khách Đặt Xe</span>
              </button>

              {!isMobileLayout && (
                <button
                  type="button"
                  onClick={() => setMobilePreviewMode(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition"
                >
                  <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                  <span>Xem Giao Diện App Di Động</span>
                </button>
              )}

              {authSession.role === 'ADMIN' && (
                <button
                  type="button"
                  onClick={() => setIsSecurityModalOpen(true)}
                  className="relative inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-400/40 text-emerald-300 text-xs font-bold transition"
                  title="Quản lý tài khoản Admin, phê duyệt đăng nhập & kết nối Supabase"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Bảo mật Admin</span>
                  {pendingApprovalsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-extrabold">
                      {pendingApprovalsCount}
                    </span>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setEditingTrip(null);
                  setIsBookingModalOpen(true);
                }}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold shadow-lg shadow-blue-600/30 transition shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Đặt Lịch</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition"
                title="Đăng xuất khỏi hệ thống"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Desktop Navigation Bar */}
          {!isMobileLayout && (
            <div className="bg-slate-950/60 border-t border-slate-800/80">
              <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center gap-1 overflow-x-auto py-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('BOOKINGS')}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition ${
                    activeTab === 'BOOKINGS'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  1. Lịch Đặt Xe & Lộ Trình (Cao Tốc / Quốc Lộ)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('FINANCE')}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition ${
                    activeTab === 'FINANCE'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  2. Doanh Thu, Tự Cấn Trừ, Phạt/Đậu Xe & Thực Còn Vào TK
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('FLEET_DRIVERS')}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition ${
                    activeTab === 'FLEET_DRIVERS'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  3. Đội Xe (4-7-16 Chỗ) & Hồ Sơ Tài Xế
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('AI_BOT')}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition ${
                    activeTab === 'AI_BOT'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Bot className="w-4 h-4" />
                  4. AI Bot Xác Nhận Lịch & @Tag Zalo / Telegram
                </button>
                {authSession.role === 'ADMIN' && (
                  <button
                    type="button"
                    onClick={() => setIsSaaSModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-blue-300 hover:bg-white/5 shrink-0 ml-auto"
                  >
                    <Building2 className="w-4 h-4" />
                    Nhân bản Doanh nghiệp (SaaS)
                  </button>
                )}
              </div>
            </div>
          )}
        </header>

        {/* Toast Notification */}
        {toastMsg && (
          <div className="fixed bottom-20 md:bottom-6 right-4 z-50 max-w-md bg-slate-900 text-white border border-blue-500/40 px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Main Content Area */}
        <main
          className={`flex-1 w-full mx-auto space-y-4 ${
            mobilePreviewMode
              ? 'overflow-y-auto px-3 py-3.5 pb-24'
              : 'max-w-7xl px-3 sm:px-6 py-5 space-y-6'
          }`}
        >
          {/* Banner thông báo nếu có tài khoản đang chờ Admin xác nhận */}
          {authSession.role === 'ADMIN' && pendingApprovalsCount > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="font-bold text-amber-950 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Có {pendingApprovalsCount} tài khoản nhân viên đang chờ Admin xác nhận cấp quyền đăng nhập!
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsSecurityModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition"
              >
                Mở Bảng Duyệt Ngay
              </button>
            </div>
          )}

          {/* TAB 1: LỊCH ĐẶT XE & LỘ TRÌNH DI CHUYỂN */}
          {activeTab === 'BOOKINGS' && (
            <div className="space-y-4">
              {/* Thẻ Tổng Quan Tài Chính Nhanh */}
              <div
                className={
                  isMobileLayout
                    ? 'grid grid-cols-2 gap-2.5'
                    : 'grid grid-cols-2 lg:grid-cols-4 gap-3'
                }
              >
                <div
                  onClick={() => setActiveTab('FINANCE')}
                  className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-400 transition"
                >
                  <div className="text-[10px] font-bold text-slate-500 uppercase">
                    1. Tổng Doanh Thu (+)
                  </div>
                  <div className="text-base sm:text-xl font-extrabold text-emerald-700 mt-0.5">
                    {formatVND(kpi.grossRevenue)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {tenantTrips.length} chuyến đang quản lý
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('FINANCE')}
                  className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm cursor-pointer hover:border-amber-400 transition"
                >
                  <div className="text-[10px] font-bold text-slate-500 uppercase">
                    2. Tự Cấn Trừ + Nhập Tay
                  </div>
                  <div className="text-base sm:text-xl font-extrabold text-amber-700 mt-0.5">
                    -{formatVND(kpi.totalAutoDeducted + kpi.totalManualExpense)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Tự trừ: {formatVND(kpi.totalAutoDeducted)}
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('FINANCE')}
                  className="bg-white rounded-2xl p-3.5 border border-rose-200 shadow-sm cursor-pointer hover:border-rose-400 transition"
                >
                  <div className="text-[10px] font-bold text-rose-700 uppercase">
                    3. Phạt & Đậu Xe (-)
                  </div>
                  <div className="text-base sm:text-xl font-extrabold text-rose-600 mt-0.5">
                    -{formatVND(kpi.totalRiskExpense)}
                  </div>
                  <div className="text-[10px] text-slate-600 mt-0.5 truncate">
                    Đậu: {formatVND(kpi.totalParking)} • Phạt: {formatVND(kpi.totalTrafficFine)}
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab('FINANCE')}
                  className="bg-gradient-to-br from-blue-700 to-slate-900 text-white rounded-2xl p-3.5 shadow-md cursor-pointer hover:opacity-95 transition"
                >
                  <div className="text-[10px] font-bold text-blue-200 uppercase">
                    4. Thực Còn Vào TK (=)
                  </div>
                  <div className="text-base sm:text-xl font-extrabold text-white mt-0.5">
                    {formatVND(kpi.netRemainingToAccount)}
                  </div>
                  <div className="text-[10px] text-blue-200 mt-0.5 flex items-center gap-0.5">
                    <span>Đối soát chi tiết</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </div>

              {/* Thanh Lọc Nhanh Theo Loại Ghế (4 chỗ, 7 chỗ...), Tuyến Cao tốc/Quốc lộ & Tài xế */}
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm space-y-2.5">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <span className="text-xs font-bold text-slate-600 mr-1 shrink-0">
                    Loại ghế:
                  </span>
                  {(
                    ['ALL', '4 chỗ', '5 chỗ', '7 chỗ', '9 chỗ Limousine', '16 chỗ'] as const
                  ).map((seat) => (
                    <button
                      key={seat}
                      type="button"
                      onClick={() => setBookingSeatFilter(seat)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition ${
                        bookingSeatFilter === seat
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {seat === 'ALL' ? 'Tất cả ghế' : seat}
                    </button>
                  ))}
                </div>

                <div
                  className={
                    isMobileLayout
                      ? 'grid grid-cols-2 gap-2'
                      : 'flex flex-wrap items-center gap-2'
                  }
                >
                  <select
                    value={bookingRouteFilter}
                    onChange={(e) =>
                      setBookingRouteFilter(
                        e.target.value as 'ALL' | 'HIGHWAY' | 'NATIONAL_ROAD'
                      )
                    }
                    className="w-full sm:w-auto rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800"
                  >
                    <option value="ALL">🛣️ Tất cả tuyến đường</option>
                    <option value="HIGHWAY">🛣️ Tuyến Cao Tốc (ETC)</option>
                    <option value="NATIONAL_ROAD">🛤️ Đường Quốc Lộ</option>
                  </select>

                  <select
                    value={bookingDriverFilter}
                    onChange={(e) => setBookingDriverFilter(e.target.value)}
                    className="w-full sm:w-auto rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800"
                  >
                    <option value="ALL">👨‍✈️ Tất cả tài xế</option>
                    {tenantDrivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.fullName} ({d.telegramUsername})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Danh sách Lịch trình & Chuyến xe */}
              <div className="space-y-3">
                {filteredDashboardTrips.map((trip) => {
                  const veh = tenantVehicles.find((v) => v.id === trip.vehicleId);
                  const drv = tenantDrivers.find((d) => d.id === trip.driverId);
                  const taggedDrvs = tenantDrivers.filter((d) =>
                    trip.taggedDriverIds?.includes(d.id)
                  );
                  const fin = calculateTripFinancials(trip);

                  return (
                    <div
                      key={trip.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 sm:p-5 hover:border-blue-400 transition space-y-3"
                    >
                      {/* Top Row */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[11px] font-extrabold">
                            #{trip.tripCode}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              trip.bookingType === 'SELF_DRIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {trip.bookingType === 'SELF_DRIVE'
                              ? '🔑 Thuê Tự Lái'
                              : '👨‍✈️ Có Tài Xế'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              trip.routeType === 'HIGHWAY'
                                ? 'bg-indigo-600 text-white'
                                : trip.routeType === 'NATIONAL_ROAD'
                                ? 'bg-amber-500 text-white'
                                : 'bg-teal-600 text-white'
                            }`}
                          >
                            {trip.routeType === 'HIGHWAY'
                              ? '🛣️ Đi Cao Tốc'
                              : trip.routeType === 'NATIONAL_ROAD'
                              ? '🛤️ Đường Quốc Lộ'
                              : '🔀 Cao Tốc + QL'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              trip.status === 'PENDING_CONFIRM'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : trip.status === 'IN_PROGRESS'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {trip.status === 'PENDING_CONFIRM'
                              ? '⏳ Chờ Xác Nhận'
                              : trip.status === 'IN_PROGRESS'
                              ? '🚗 Đang Chạy'
                              : '✅ Hoàn Thành'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setVoucherTrip(trip)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold transition"
                            title="In phiếu lệnh điều xe / Copy gửi nhóm Zalo"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Phiếu / Zalo</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTrip(trip);
                              setIsBookingModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            title="Chỉnh sửa lịch & chi phí"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {authSession.role === 'ADMIN' && (
                            <button
                              type="button"
                              onClick={() => {
                                setDb((prev) => ({
                                  ...prev,
                                  trips: prev.trips.filter((t) => t.id !== trip.id),
                                }));
                                showToast(`🗑️ Đã xóa chuyến #${trip.tripCode}!`);
                              }}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                              title="Xóa chuyến đi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Vehicle pill */}
                      {veh && (
                        <div className="px-2.5 py-1.5 rounded-xl bg-indigo-50/80 text-indigo-950 border border-indigo-200/80 text-xs font-extrabold flex items-center justify-between">
                          <span>
                            🚘 [{veh.seatCategory}] {veh.brand} {veh.model}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-300 font-mono text-[11px]">
                            {veh.plateNumber}
                          </span>
                        </div>
                      )}

                      {/* Middle Row: Route & Driver */}
                      <div
                        className={
                          isMobileLayout
                            ? 'grid grid-cols-1 gap-2.5 bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-xs'
                            : 'grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 rounded-xl p-3.5 border border-slate-200/70 text-xs'
                        }
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-start gap-1.5">
                            <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <span>
                              {trip.pickupLocation} ➔ {trip.dropoffLocation}
                            </span>
                          </div>
                          <div className="text-slate-600">
                            • Tuyến: <strong>{trip.routeDetail}</strong> ({trip.distanceKm} km)
                          </div>
                          <div className="text-slate-600">
                            • Ngày giờ: <strong>{trip.tripDate}</strong> ({trip.departureTime} –{' '}
                            {trip.returnTime})
                          </div>
                          <div className="text-slate-600">
                            • Khách: <strong>{trip.customerName}</strong> ({trip.customerPhone})
                          </div>
                        </div>

                        <div
                          className={
                            isMobileLayout
                              ? 'space-y-1 border-t border-slate-200/80 pt-2.5'
                              : 'space-y-1 md:border-l md:border-slate-200 md:pl-4'
                          }
                        >
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              Tài xế: {drv?.fullName} (Bằng {drv?.licenseClass} • {drv?.phone})
                            </span>
                          </div>
                          <div className="text-slate-600 flex flex-wrap items-center gap-1">
                            <span>• Tag Zalo/Telegram:</span>
                            {taggedDrvs.map((d) => (
                              <span
                                key={d.id}
                                className="inline-block bg-blue-100 text-blue-800 font-semibold px-1.5 py-0.5 rounded text-[10px]"
                              >
                                {d.telegramUsername}
                              </span>
                            ))}
                          </div>
                          {trip.status === 'PENDING_CONFIRM' && (
                            <div className="pt-1.5 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleDriverConfirmTrip(trip.id, 'TELEGRAM')}
                                className="flex-1 sm:flex-initial px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold text-center"
                              >
                                ✅ Xác nhận Telegram
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDriverConfirmTrip(trip.id, 'ZALO')}
                                className="flex-1 sm:flex-initial px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold text-center"
                              >
                                ✅ Xác nhận Zalo
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row: Financial Breakdown Bar */}
                      {isMobileLayout ? (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl px-3 py-2 flex items-center justify-between">
                            <span className="text-[11px] text-slate-600 font-medium">
                              1. Tiền chuyến (+)
                            </span>
                            <span className="font-extrabold text-emerald-700">
                              {formatVND(fin.grossRevenue)}
                            </span>
                          </div>
                          <div className="bg-amber-50/80 border border-amber-200 rounded-xl px-3 py-2 flex items-center justify-between">
                            <span className="text-[11px] text-slate-600 font-medium">
                              2. Tự cấn trừ (-)
                            </span>
                            <span className="font-bold text-amber-800">
                              -{formatVND(fin.totalAutoDeducted)}
                            </span>
                          </div>
                          <div className="bg-orange-50/80 border border-orange-200 rounded-xl px-3 py-2 flex items-center justify-between">
                            <span className="text-[11px] text-slate-600 font-medium">
                              3. Nhập tay (-)
                            </span>
                            <span className="font-bold text-orange-700">
                              -{formatVND(fin.totalManualExpense)}
                            </span>
                          </div>
                          <div className="bg-rose-50/80 border border-rose-200 rounded-xl px-3 py-2 flex items-center justify-between">
                            <span className="text-[11px] text-rose-700 font-medium">
                              4. Phạt & Đậu xe
                            </span>
                            <span className="font-bold text-rose-600">
                              -{formatVND(fin.totalRiskExpense)}
                            </span>
                          </div>
                          <div className="col-span-2 bg-slate-900 text-white rounded-xl px-3.5 py-2.5 flex items-center justify-between">
                            <span className="text-xs text-blue-300 font-bold">
                              5. Thực tế còn lại vào TK (=)
                            </span>
                            <span className="font-extrabold text-base text-white">
                              {formatVND(fin.netRemainingToAccount)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-5 gap-2.5 pt-1 text-xs">
                          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl px-3 py-2">
                            <div className="text-[10px] text-slate-500">1. Tiền chuyến (+)</div>
                            <div className="font-extrabold text-emerald-700">
                              {formatVND(fin.grossRevenue)}
                            </div>
                          </div>
                          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl px-3 py-2">
                            <div className="text-[10px] text-slate-500">
                              2. Tự cấn trừ (Cao tốc+Xăng)
                            </div>
                            <div className="font-bold text-amber-800">
                              -{formatVND(fin.totalAutoDeducted)}
                            </div>
                          </div>
                          <div className="bg-orange-50/70 border border-orange-200/80 rounded-xl px-3 py-2">
                            <div className="text-[10px] text-slate-500">3. Chi phí nhập tay (-)</div>
                            <div className="font-bold text-orange-700">
                              -{formatVND(fin.totalManualExpense)}
                            </div>
                          </div>
                          <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl px-3 py-2">
                            <div className="text-[10px] text-rose-700 font-semibold">
                              4. Phạt ({formatVND(fin.trafficFineFee)}) + Đậu xe (
                              {formatVND(fin.parkingFee)})
                            </div>
                            <div className="font-bold text-rose-600">
                              -{formatVND(fin.totalRiskExpense)}
                            </div>
                          </div>
                          <div className="bg-slate-900 text-white rounded-xl px-3 py-2 flex flex-col justify-center">
                            <div className="text-[10px] text-blue-300 font-semibold">
                              5. Thực còn vào TK (=)
                            </div>
                            <div className="font-extrabold text-sm text-white">
                              {formatVND(fin.netRemainingToAccount)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: ĐỐI SOÁT DOANH THU, CHI PHÍ TỰ CẤN TRỪ, PHẠT & ĐẬU XE */}
          {activeTab === 'FINANCE' && (
            <FinanceSettlementTab
              trips={tenantTrips}
              drivers={tenantDrivers}
              vehicles={tenantVehicles}
              isMobile={isMobileLayout}
              onEditTrip={(trip) => {
                setEditingTrip(trip);
                setIsBookingModalOpen(true);
              }}
              onQuickUpdateExpenses={handleQuickUpdateExpenses}
            />
          )}

          {/* TAB 3: QUẢN LÝ ĐỘI XE (4 CHỖ, 7 CHỖ...) & HỒ SƠ TÀI XẾ */}
          {activeTab === 'FLEET_DRIVERS' && (
            <FleetAndDriversTab
              vehicles={tenantVehicles}
              drivers={tenantDrivers}
              trips={tenantTrips}
              activeTenantId={activeTenant.id}
              isMobile={isMobileLayout}
              onAddVehicle={handleAddVehicle}
              onUpdateVehicle={(updatedVeh) => {
                setDb((prev) => ({
                  ...prev,
                  vehicles: prev.vehicles.map((v) =>
                    v.id === updatedVeh.id ? updatedVeh : v
                  ),
                }));
                showToast(`✅ Đã cập nhật thông tin xe ${updatedVeh.plateNumber}!`);
              }}
              onDeleteVehicle={(vehId) => {
                setDb((prev) => ({
                  ...prev,
                  vehicles: prev.vehicles.filter((v) => v.id !== vehId),
                }));
                showToast('🗑️ Đã xóa xe khỏi danh sách!');
              }}
              onAddDriver={handleAddDriver}
              onUpdateDriver={(updatedDrv) => {
                setDb((prev) => ({
                  ...prev,
                  drivers: prev.drivers.map((d) =>
                    d.id === updatedDrv.id ? updatedDrv : d
                  ),
                }));
                showToast(`✅ Đã cập nhật hồ sơ tài xế ${updatedDrv.fullName}!`);
              }}
              onDeleteDriver={(drvId) => {
                setDb((prev) => ({
                  ...prev,
                  drivers: prev.drivers.filter((d) => d.id !== drvId),
                }));
                showToast('🗑️ Đã xóa hồ sơ tài xế!');
              }}
            />
          )}

          {/* TAB 4: AI BOT XÁC NHẬN LỊCH & TAG TÊN TÀI XẾ QUA ZALO / TELEGRAM */}
          {activeTab === 'AI_BOT' && (
            <AIBotZaloTelegramTab
              trips={tenantTrips}
              drivers={tenantDrivers}
              vehicles={tenantVehicles}
              highwayPresets={db.highwayPresets}
              botLogs={tenantBotLogs}
              activeTenant={activeTenant}
              isMobile={isMobileLayout}
              onCreateTripFromAI={handleCreateTripFromAI}
              onDriverConfirmTrip={handleDriverConfirmTrip}
              onTagReassignDriver={handleTagReassignDriver}
              onBotQuickAddRisk={handleBotQuickAddRisk}
              onSaveTelegramConfig={(token, chatId) => {
                setDb((prev) => ({
                  ...prev,
                  tenants: prev.tenants.map((t) =>
                    t.id === activeTenant.id
                      ? { ...t, telegramBotToken: token, telegramGroupChatId: chatId }
                      : t
                  ),
                }));
                showToast('✅ Đã lưu cấu hình Telegram Bot Token & Zalo Webhook!');
              }}
            />
          )}
        </main>

        {/* Bottom Navigation Bar */}
        <nav
          className={`${
            mobilePreviewMode
              ? 'absolute bottom-0 left-0 right-0'
              : 'md:hidden fixed bottom-0 left-0 right-0'
          } z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 grid grid-cols-4 gap-1 shadow-lg`}
        >
          <button
            type="button"
            onClick={() => setActiveTab('BOOKINGS')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-bold transition ${
              activeTab === 'BOOKINGS' ? 'text-blue-600 bg-blue-50' : 'text-slate-500'
            }`}
          >
            <Calendar className="w-5 h-5 mb-0.5" />
            <span>Lịch Xe</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('FINANCE')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-bold transition ${
              activeTab === 'FINANCE' ? 'text-blue-600 bg-blue-50' : 'text-slate-500'
            }`}
          >
            <Wallet className="w-5 h-5 mb-0.5" />
            <span>Đối Soát TK</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('FLEET_DRIVERS')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-bold transition ${
              activeTab === 'FLEET_DRIVERS' ? 'text-blue-600 bg-blue-50' : 'text-slate-500'
            }`}
          >
            <Car className="w-5 h-5 mb-0.5" />
            <span>Xe & Tài Xế</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('AI_BOT')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-bold transition ${
              activeTab === 'AI_BOT' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500'
            }`}
          >
            <Bot className="w-5 h-5 mb-0.5" />
            <span>Bot Zalo/TG</span>
          </button>
        </nav>
      </div>

      {/* Modal Tạo / Chỉnh sửa Lịch Đặt Xe */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setEditingTrip(null);
        }}
        onSave={handleSaveTrip}
        vehicles={tenantVehicles}
        drivers={tenantDrivers}
        highwayPresets={db.highwayPresets}
        activeTenant={activeTenant}
        editingTrip={editingTrip}
      />

      {/* Modal Phiếu Lệnh Điều Xe & Copy Zalo */}
      <PrintableVoucherModal
        trip={voucherTrip}
        onClose={() => setVoucherTrip(null)}
        driver={tenantDrivers.find((d) => d.id === voucherTrip?.driverId)}
        vehicle={tenantVehicles.find((v) => v.id === voucherTrip?.vehicleId)}
        tenant={activeTenant}
      />

      {/* Modal Nhân bản Doanh nghiệp (Multi-Tenant SaaS) */}
      <MultiTenantSaaSModal
        isOpen={isSaaSModalOpen}
        onClose={() => setIsSaaSModalOpen(false)}
        tenants={db.tenants}
        activeTenantId={activeTenant.id}
        highwayPresets={db.highwayPresets}
        onSwitchTenant={(tid) => {
          setDb((prev) => ({ ...prev, activeTenantId: tid }));
          setIsSaaSModalOpen(false);
          showToast('🏢 Đã chuyển đổi sang dữ liệu của chi nhánh/doanh nghiệp được chọn!');
        }}
        onCloneNewTenant={handleCloneNewTenant}
        onAddHighwayPreset={(presetData) => {
          const newPreset: HighwayPreset = {
            ...presetData,
            id: `HW-${Date.now()}`,
          };
          setDb((prev) => ({
            ...prev,
            highwayPresets: [...prev.highwayPresets, newPreset],
          }));
          showToast(`🛣️ Đã thêm tuyến định mức "${newPreset.name}"!`);
        }}
      />

      {/* Modal Quản trị Bảo mật & Xác nhận Đăng nhập Admin */}
      <AdminSecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        adminAccounts={adminAccounts}
        onApproveAccount={(accId) => {
          setDb((prev) => ({
            ...prev,
            adminAccounts: (prev.adminAccounts || adminAccounts).map((a) =>
              a.id === accId ? { ...a, status: 'APPROVED' } : a
            ),
          }));
          showToast('✅ Đã xác nhận phê duyệt quyền đăng nhập cho tài khoản!');
        }}
        onToggleLockAccount={(accId) => {
          setDb((prev) => ({
            ...prev,
            adminAccounts: (prev.adminAccounts || adminAccounts).map((a) =>
              a.id === accId
                ? { ...a, status: a.status === 'LOCKED' ? 'APPROVED' : 'LOCKED' }
                : a
            ),
          }));
          showToast('🔒 Đã cập nhật trạng thái khóa tài khoản!');
        }}
        onDeleteAccount={(accId) => {
          setDb((prev) => ({
            ...prev,
            adminAccounts: (prev.adminAccounts || adminAccounts).filter((a) => a.id !== accId),
          }));
          showToast('🗑️ Đã xóa tài khoản khỏi hệ thống!');
        }}
        onUpdateAdminCredentials={(accId, newUsername, newPass) => {
          setDb((prev) => ({
            ...prev,
            adminAccounts: (prev.adminAccounts || adminAccounts).map((a) =>
              a.id === accId
                ? { ...a, username: newUsername, passwordHash: newPass }
                : a
            ),
          }));
          showToast(`🔑 Đã cập nhật User (@${newUsername}) & Mật khẩu Admin thành công!`);
        }}
        onCreateApprovedAdmin={(newAcc) => {
          const created: AdminAccount = {
            ...newAcc,
            id: `ADM-${Date.now()}`,
            createdAt: new Date().toISOString().slice(0, 10),
          };
          setDb((prev) => ({
            ...prev,
            adminAccounts: [...(prev.adminAccounts || adminAccounts), created],
          }));
          showToast(`✅ Đã cấp quyền đăng nhập cho @${created.username}!`);
        }}
        onSaveSupabaseCreds={async (url, anonKey) => {
          localStorage.setItem('LIUCAR_SUPABASE_URL', url.trim());
          localStorage.setItem('LIUCAR_SUPABASE_KEY', anonKey.trim());
          const ok = await saveToSupabase(db);
          if (ok) {
            showToast('☁️ Đã kết nối và đẩy toàn bộ bảng dữ liệu lên Supabase thành công!');
          } else {
            showToast('⚠️ Đã lưu thông tin Supabase. Vui lòng kiểm tra lại URL & Anon Key!');
          }
        }}
      />
    </div>
  );
}

export default App;
