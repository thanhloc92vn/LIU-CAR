import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Calendar,
  Car,
  ChevronRight,
  Edit3,
  Globe,
  LogOut,
  MapPin,
  MessageCircle,
  Navigation,
  Plus,
  Route,
  Printer,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import {
  AuthUserSession,
  BotNotificationLog,
  Driver,
  FleetDatabase,
  HighwayPreset,
  JourneyRoute,
  SeatCategory,
  TenantConfig,
  Trip,
  Vehicle,
} from './types/fleet';
import { initialFleetDatabase } from './services/seedData';
import {
  driverTripAction,
  isSignedIn,
  loadAdminState,
  loadDriverState,
  loadTelegramLinks,
  mergeState,
  saveAdminState,
  signOutSupabase,
  trackDeletions,
  uploadVehicleImage,
} from './services/supabaseClient';
import { calculateTripFinancials, formatVND } from './utils/calculations';
import { buildBotDispatchMessage } from './utils/aiBotEngine';
import { ownsVehicle } from './utils/party';
import { busyDriverIds, driverUnavailableReason, isDispatched, vehicleFitsTrip } from './utils/dispatch';
import { BookingModal } from './components/BookingModal';
import { FinanceSettlementTab } from './components/FinanceSettlementTab';
import { FleetAndDriversTab } from './components/FleetAndDriversTab';
import { JourneyRoutesTab } from './components/JourneyRoutesTab';
import { SiteContentTab } from './components/SiteContentTab';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AIBotZaloTelegramTab } from './components/AIBotZaloTelegramTab';
import { MultiTenantSaaSModal } from './components/MultiTenantSaaSModal';
import { AuthLoginGate } from './components/AuthLoginGate';
import { AdminSecurityModal } from './components/AdminSecurityModal';
import { AddExpenseModal, EXPENSE_LABELS, ExpenseKind } from './components/AddExpenseModal';
import { useConfirm } from './components/ConfirmDialog';
import { DriverEarningsTab } from './components/DriverEarningsTab';
import { PrintableVoucherModal } from './components/PrintableVoucherModal';
import { PublicCustomerBookingPortal } from './components/PublicCustomerBookingPortal';

type ActiveTab = 'BOOKINGS' | 'JOURNEYS' | 'FINANCE' | 'FLEET_DRIVERS' | 'AI_BOT' | 'SITE_CONTENT';

const NAV_TABS: { id: ActiveTab; label: string; short: string; icon: React.ElementType }[] = [
  { id: 'BOOKINGS', label: 'Lịch đặt xe', short: 'Lịch xe', icon: Calendar },
  { id: 'JOURNEYS', label: 'Hành trình chuyến', short: 'Hành trình', icon: Route },
  { id: 'FINANCE', label: 'Doanh thu & đối soát', short: 'Đối soát', icon: Wallet },
  { id: 'FLEET_DRIVERS', label: 'Đội xe & tài xế', short: 'Đội xe', icon: Users },
  { id: 'AI_BOT', label: 'Bot Telegram', short: 'Bot', icon: Bot },
  { id: 'SITE_CONTENT', label: 'Nội dung trang khách', short: 'Trang khách', icon: Globe },
];

// Dải trạng thái chuyến: Đã xác nhận, Đang chạy, Hoàn thành. Bước đã qua màu nhạt, bước hiện tại màu đậm.
const TRIP_STEPS: { status: Trip['status']; label: string }[] = [
  { status: 'CONFIRMED', label: 'Đã xác nhận' },
  { status: 'IN_PROGRESS', label: 'Đang chạy' },
  { status: 'COMPLETED', label: 'Hoàn thành' },
];
const TRIP_ORDER: Trip['status'][] = ['PENDING_CONFIRM', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'];

function TripStatusSteps({ status }: { status: Trip['status'] }) {
  if (status === 'CANCELLED') {
    return (
      <span className="inline-flex h-8 items-center px-3.5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">
        Đã hủy
      </span>
    );
  }
  const current = TRIP_ORDER.indexOf(status);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {TRIP_STEPS.map((step) => {
        const idx = TRIP_ORDER.indexOf(step.status);
        const state = current > idx ? 'done' : current === idx ? 'current' : 'todo';
        const strong =
          step.status === 'COMPLETED' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white';
        return (
          <span
            key={step.status}
            className={`inline-flex h-8 items-center gap-1.5 px-3.5 rounded-full text-xs font-medium ${
              state === 'current'
                ? strong
                : state === 'done'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            {state === 'done' && <span aria-hidden>✓</span>}
            {state === 'current' && step.status === 'IN_PROGRESS' && (
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" aria-hidden />
            )}
            {step.label}
          </span>
        );
      })}
    </div>
  );
}

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
  const confirm = useConfirm();
  const [db, setDb] = useState<FleetDatabase>(initialFleetDatabase);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(checkIsAdminUrl);
  const [authSession, setAuthSession] = useState<AuthUserSession | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = sessionStorage.getItem('LIUCAR_AUTH_SESSION');
    if (saved && isSignedIn()) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('BOOKINGS');
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
  const [expenseTrip, setExpenseTrip] = useState<Trip | null>(null);
  // Tài xế đã liên kết bot Telegram (đọc từ bảng telegram_links, do bot ghi)
  const [telegramLinks, setTelegramLinks] = useState<Record<string, string>>({});
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

  const isMobileLayout = isSmallScreen;
  const isAdmin = authSession?.role === 'ADMIN';
  // Tài xế / chủ xe chỉ dùng Lịch đặt xe và Doanh thu của mình
  const visibleTabs = isAdmin
    ? NAV_TABS
    : NAV_TABS.filter((t) => t.id === 'BOOKINGS' || t.id === 'FINANCE').map((t) =>
        t.id === 'FINANCE' ? { ...t, label: 'Tiền công', short: 'Tiền công' } : t
      );

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  // Tải dữ liệu sau khi đăng nhập: admin đọc toàn bộ, tài xế chỉ nhận phần của mình (DB tự lọc).
  // Trang khách không tải DB; dữ liệu công khai lấy qua /api/public-catalog.
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadForRole = async (role: AuthUserSession['role']) => {
    const data = role === 'DRIVER' ? await loadDriverState() : await loadAdminState();
    // DB mới tạo chưa có dữ liệu: admin bắt đầu từ dữ liệu mẫu
    if (data) setDb({ ...initialFleetDatabase, ...data, adminAccounts: [] });
    return !!data;
  };

  useEffect(() => {
    if (!authSession) return;
    let mounted = true;
    setIsLoaded(false);
    setLoadError(null);
    loadForRole(authSession.role).then((ok) => {
      if (!mounted) return;
      if (ok) setIsLoaded(true);
      else setLoadError('Không tải được dữ liệu. Kiểm tra mạng hoặc đăng nhập lại.');
    });
    return () => {
      mounted = false;
    };
  }, [authSession?.id]);

  // Admin: lưu mỗi khi dữ liệu đổi, lần lượt từng bản. Nếu người khác vừa sửa (khách đặt, tài xế xác nhận)
  // thì máy chủ gộp và trả bản đã gộp để hiển thị. Tài xế không ghi trực tiếp (xem runDriverAction).
  const saveChain = useRef(Promise.resolve());
  const pendingSaves = useRef(0);
  const lastDb = useRef<FleetDatabase | null>(null);
  useEffect(() => {
    if (!isLoaded || authSession?.role !== 'ADMIN') {
      lastDb.current = null;
      return;
    }
    // Ghi nhận mục người dùng vừa xóa, để khi gộp chỉ những mục này mới bị bỏ khỏi server
    if (lastDb.current) trackDeletions(lastDb.current, db);
    lastDb.current = db;
    const sent = db;
    pendingSaves.current++;
    saveChain.current = saveChain.current.then(async () => {
      const r = await saveAdminState(sent);
      pendingSaves.current--;
      if (!r.ok) showToast(`Chưa lưu được lên máy chủ: ${r.error}`);
      else if (r.merged) {
        const merged = r.merged;
        setDb((prev) => mergeState(sent, prev, merged));
      }
    });
  }, [db, isLoaded, authSession?.role]);

  // Ảnh xe cũ còn nằm trong DB dạng base64: chuyển lên Storage một lần sau khi tải rồi thay bằng link,
  // để mỗi lần lưu không phải gửi lại cả MB ảnh
  const imagesMigrated = useRef(false);
  useEffect(() => {
    if (!isLoaded || authSession?.role !== 'ADMIN' || imagesMigrated.current) return;
    const inline = [
      ...new Set(db.vehicles.flatMap((v) => (v.images || []).filter((src) => src.startsWith('data:')))),
    ];
    if (!inline.length) return;
    imagesMigrated.current = true;
    (async () => {
      const moved = new Map<string, string>();
      for (const src of inline) {
        try {
          moved.set(src, await uploadVehicleImage(src));
        } catch (err: any) {
          showToast(`Chưa chuyển được ảnh xe lên Storage: ${err.message}`);
          break;
        }
      }
      if (!moved.size) return;
      setDb((prev) => ({
        ...prev,
        vehicles: prev.vehicles.map((v) =>
          v.images?.some((src) => moved.has(src))
            ? { ...v, images: v.images.map((src) => moved.get(src) || src) }
            : v
        ),
      }));
    })();
  }, [db.vehicles, isLoaded, authSession?.role]);

  // F5/đóng tab khi bản lưu (có thể kèm ảnh xe) chưa gửi xong thì mất thay đổi: hỏi lại trước khi rời trang
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (pendingSaves.current > 0) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  useEffect(() => {
    if (!isLoaded || authSession?.role !== 'ADMIN') return;
    loadTelegramLinks().then((rows) =>
      setTelegramLinks(Object.fromEntries(rows.map((x) => [x.driver_id, x.linked_at])))
    );
  }, [isLoaded, authSession?.role, activeTab]);

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
      const me = db.drivers.find((d) => d.id === drvId);
      return all.filter((t) => {
        if (t.driverId === drvId || t.taggedDriverIds?.includes(drvId)) return isDispatched(t);
        // Chủ xe thấy mọi chuyến dùng xe của mình (kể cả chuyến tự lái)
        const veh = db.vehicles.find((v) => v.id === t.vehicleId);
        return ownsVehicle(me, veh);
      });
    }
    return all;
  }, [db.trips, db.drivers, db.vehicles, activeTenant.id, authSession]);

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
      // Doanh thu chỉ ghi nhận khi chuyến đã hoàn thành
      if (t.status !== 'COMPLETED') return;
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
    showToast(`Chào mừng ${session.fullName} đã đăng nhập hệ thống!`);
  };

  const handleLogout = () => {
    signOutSupabase();
    setAuthSession(null);
    sessionStorage.removeItem('LIUCAR_AUTH_SESSION');
    setIsLoaded(false);
    setLoadError(null);
    setDb(initialFleetDatabase);
  };

  // Tài xế không sửa DB trực tiếp: gửi thao tác để DB kiểm tra quyền, rồi tải lại phần dữ liệu của mình
  const runDriverAction = async (
    tripId: string,
    action: 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'ADD_EXPENSE',
    doneMsg: string,
    expense?: { kind: string; amount: number; note: string }
  ) => {
    const r = await driverTripAction(tripId, action, expense);
    if (!r.ok) {
      showToast(r.error || 'Không thực hiện được thao tác');
      return;
    }
    await loadForRole('DRIVER');
    showToast(doneMsg);
  };

  // Handlers
  // Báo chuyến vào nhóm Telegram qua máy chủ (token không nằm ở trình duyệt).
  // Đợi vài giây để chuyến kịp lưu lên Supabase, thử lại một lần nếu máy chủ chưa thấy chuyến.
  // Xác nhận cho khách qua Zalo cá nhân (miễn phí, không cần gói Zalo OA): chép sẵn nội dung rồi mở chat với số khách.
  // zalo.me không nhận nội dung soạn sẵn nên điều hành dán vào khung chat rồi bấm gửi.
  const openCustomerZalo = (trip: Trip) => {
    const veh = db.vehicles.find((v) => v.id === trip.vehicleId);
    const drv = isDispatched(trip) ? db.drivers.find((d) => d.id === trip.driverId) : undefined;
    const total = calculateTripFinancials(trip).grossRevenue;
    const vnDate = (d: string) => d.split('-').reverse().join('/'); // 2026-11-20 -> 20/11/2026
    const text = [
      `${activeTenant.name} xin xác nhận lịch đặt xe của anh/chị ${trip.customerName}:`,
      `- Mã chuyến: #${trip.tripCode}`,
      `- Hình thức: ${trip.bookingType === 'SELF_DRIVE' ? 'Thuê tự lái' : 'Có tài xế'}`,
      veh ? `- Xe: ${veh.brand} ${veh.model} (${veh.plateNumber}), ${veh.seatCategory}` : '',
      `- Thời gian: ${trip.departureTime} ngày ${vnDate(trip.tripDate)}${
        trip.tripEndDate && trip.tripEndDate !== trip.tripDate
          ? ` đến ${trip.returnTime} ngày ${vnDate(trip.tripEndDate)}`
          : ''
      }`,
      `- Lộ trình: ${trip.pickupLocation} → ${trip.dropoffLocation}`,
      drv ? `- Tài xế: ${drv.fullName} - ${drv.phone}` : '',
      total > 0 ? `- Giá cước: ${formatVND(total)}` : '',
      `Cần hỗ trợ vui lòng gọi hotline ${activeTenant.hotline}. Cảm ơn anh/chị!`,
    ]
      .filter(Boolean)
      .join('\n');
    // Chép trước khi mở tab mới, vì trình duyệt chỉ cho chép khi trang còn đang được chọn
    navigator.clipboard?.writeText(text).catch(() => {});
    window.open(`https://zalo.me/${trip.customerPhone.replace(/\D/g, '')}`, '_blank', 'noopener');
    showToast('Đã chép nội dung xác nhận. Dán vào khung chat Zalo của khách rồi bấm gửi.');
  };

  const sendTripToTelegram = (tripId: string, tripCode: string, manual = false) => {
    // Chạy trên máy (localhost) không có máy chủ bot nên không báo lỗi mỗi lần tạo chuyến
    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const warn = (msg: string) => {
      if (manual || !isLocal) showToast(msg);
    };
    const attempt = async (retry: boolean) => {
      try {
        const res = await fetch('/api/telegram-notify-trip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tripId }),
        });
        // Bản chạy trên máy trả trang HTML cho đường dẫn lạ nên phải đọc JSON để biết gửi thật hay không
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok) {
          showToast(`Đã báo chuyến #${tripCode} vào nhóm Telegram`);
        } else if (res.status === 404 && retry) {
          setTimeout(() => attempt(false), 4000);
        } else if (res.status === 503) {
          warn('Bot Telegram chưa được cấu hình trên máy chủ (thiếu biến môi trường trên Vercel)');
        } else {
          warn(`Chưa báo được chuyến #${tripCode} vào Telegram. Bấm "Gửi Telegram" trên thẻ chuyến để gửi lại.`);
        }
      } catch {
        warn(`Không kết nối được máy chủ bot. Bấm "Gửi Telegram" trên thẻ chuyến để gửi lại.`);
      }
    };
    setTimeout(() => attempt(true), manual ? 0 : 3500);
  };

  // Nhắn riêng tài xế + báo nhóm khi điều hành điều phối. Đợi chuyến kịp lưu lên Supabase, thử lại một lần.
  const sendDispatchToTelegram = (tripId: string, tripCode: string, driverName: string) => {
    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const attempt = async (retry: boolean) => {
      try {
        const res = await fetch('/api/telegram-dispatch-driver', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tripId }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok) {
          showToast(
            data.dm === 'sent'
              ? `Đã nhắn riêng cho ${driverName} qua Telegram`
              : `${driverName} chưa liên kết Telegram nên chưa nhắn riêng được`
          );
        } else if (res.status === 404 && retry) {
          setTimeout(() => attempt(false), 4000);
        } else if (!isLocal) {
          showToast(`Chưa báo được tài xế chuyến #${tripCode} qua Telegram`);
        }
      } catch {
        if (!isLocal) showToast(`Không kết nối được máy chủ bot cho chuyến #${tripCode}`);
      }
    };
    setTimeout(() => attempt(true), 3500);
  };

  // Điều hành chọn xe cho chuyến từ thẻ chuyến; tính lại phần cấn trừ nhiên liệu theo xe mới
  const handleChangeTripVehicle = (tripId: string, vehicleId: string) => {
    const veh = db.vehicles.find((v) => v.id === vehicleId);
    if (!veh) return;
    setDb((prev) => ({
      ...prev,
      trips: prev.trips.map((t) => {
        if (t.id !== tripId) return t;
        const fuel =
          t.bookingType === 'SELF_DRIVE'
            ? 0
            : activeTenant.autoFuelDeductionEnabled
            ? Math.round((Number(t.distanceKm) || 0) * (veh.fuelCostPerKm || 2000))
            : 0;
        return { ...t, vehicleId, autoFuelQuota: fuel };
      }),
    }));
    showToast(`Đã đổi xe sang ${veh.brand} ${veh.model} (${veh.plateNumber})`);
  };

  // Điều phối: điều hành chọn tài xế cho chuyến. Chỉ lúc này tài xế mới được báo riêng.
  const handleDispatchDriver = (tripId: string, driverId: string) => {
    const trip = db.trips.find((t) => t.id === tripId);
    const drv = db.drivers.find((d) => d.id === driverId);
    if (!trip || !drv) return;
    const by = authSession?.fullName || 'Điều hành';
    setDb((prev) => ({
      ...prev,
      trips: prev.trips.map((t) =>
        t.id === tripId
          ? {
              ...t,
              driverId,
              taggedDriverIds: Array.from(new Set([driverId, ...(t.taggedDriverIds || [])])),
              dispatchedAt: new Date().toISOString(),
              dispatchedByName: by,
              // Tài xế mới phải tự xác nhận lại
              status: t.status === 'CONFIRMED' ? 'PENDING_CONFIRM' : t.status,
              botConfirmedAt: undefined,
              botConfirmedByDriverName: undefined,
            }
          : t
      ),
    }));
    showToast(`Đã điều phối chuyến #${trip.tripCode} cho ${drv.fullName}`);
    sendDispatchToTelegram(tripId, trip.tripCode, drv.fullName);
  };

  const handleSaveTrip = (tripData: Omit<Trip, 'id' | 'createdAt'>, existingId?: string) => {
    if (existingId) {
      setDb((prev) => ({
        ...prev,
        trips: prev.trips.map((t) => {
          if (t.id !== existingId) return t;
          // Đổi địa chỉ đón thì toạ độ cũ không còn đúng: bỏ đi để bot không ghim sai chỗ
          if (tripData.pickupLocation !== t.pickupLocation) {
            const { pickupLat, pickupLng, ...rest } = t;
            return { ...rest, ...tripData };
          }
          return { ...t, ...tripData };
        }),
      }));
      showToast(`Đã cập nhật chuyến #${tripData.tripCode} và tính lại số thực tế còn lại vào TK!`);
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
      showToast(`Đã tạo lịch #${newTrip.tripCode}`);
      sendTripToTelegram(newId, newTrip.tripCode);
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
    showToast('Đã cập nhật chi phí phạt / đậu xe / nhập tay và cấn trừ vào số thực tế còn lại!');
  };

  // Tài xế / chủ xe chỉ cộng thêm chi phí phát sinh, không ghi đè khoản đã có
  const handleDriverAddExpense = (
    tripId: string,
    kind: ExpenseKind,
    amount: number,
    note: string
  ) => {
    const trip = db.trips.find((t) => t.id === tripId);
    if (!trip) return;
    if (!isAdmin) {
      const msg = `Đã thêm ${formatVND(amount)} (${EXPENSE_LABELS[kind]}) vào chuyến #${trip.tripCode}`;
      runDriverAction(tripId, 'ADD_EXPENSE', msg, { kind, amount, note });
      return;
    }
    const who = authSession?.fullName || '';
    const label = `${note || EXPENSE_LABELS[kind]} (${who}, ${new Date().toLocaleDateString('vi-VN')})`;
    const join = (prev: string | undefined) => (prev ? `${prev}; ${label}` : label);
    setDb((prev) => ({
      ...prev,
      trips: prev.trips.map((t) => {
        if (t.id !== tripId) return t;
        if (kind === 'PARKING')
          return { ...t, parkingFee: (Number(t.parkingFee) || 0) + amount, parkingNote: join(t.parkingNote) };
        if (kind === 'TIRE')
          return { ...t, otherRiskFee: (Number(t.otherRiskFee) || 0) + amount, otherRiskNote: join(t.otherRiskNote) };
        if (kind === 'FINE')
          return { ...t, trafficFineFee: (Number(t.trafficFineFee) || 0) + amount, trafficFineNote: join(t.trafficFineNote) };
        return { ...t, manualExpenseTotal: (Number(t.manualExpenseTotal) || 0) + amount, manualExpenseNote: join(t.manualExpenseNote) };
      }),
    }));
    showToast(`Đã thêm ${formatVND(amount)} (${EXPENSE_LABELS[kind]}) vào chuyến #${trip.tripCode}`);
  };

  const handleUpdateTripStatus = (
    tripId: string,
    status: 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED'
  ) => {
    const trip = db.trips.find((t) => t.id === tripId);
    if (!trip) return;
    const doneMsg =
      status === 'COMPLETED'
        ? `Chuyến #${trip.tripCode} đã hoàn thành, doanh thu và chi phí đã được ghi nhận`
        : status === 'CONFIRMED'
        ? `Đã xác nhận chuyến #${trip.tripCode}`
        : `Chuyến #${trip.tripCode} bắt đầu chạy`;
    if (!isAdmin) {
      runDriverAction(tripId, status, doneMsg);
      return;
    }
    const by = authSession?.fullName || 'Điều hành';
    setDb((prev) => ({
      ...prev,
      trips: prev.trips.map((t) =>
        t.id === tripId
          ? status === 'COMPLETED'
            ? { ...t, status, completedAt: new Date().toISOString(), completedByName: by }
            : status === 'CONFIRMED'
            ? { ...t, status, botConfirmedAt: new Date().toLocaleString('vi-VN'), botConfirmedByDriverName: by }
            : { ...t, status }
          : t
      ),
    }));
    showToast(doneMsg);
  };

  const handleDriverConfirmTrip = (tripId: string, channel: 'TELEGRAM' | 'ZALO' | 'APP') => {
    const targetTrip = db.trips.find((t) => t.id === tripId);
    if (!targetTrip) return;
    if (!isAdmin) {
      runDriverAction(tripId, 'CONFIRMED', `Đã xác nhận lịch #${targetTrip.tripCode}`);
      return;
    }
    const drv = db.drivers.find((d) => d.id === targetTrip.driverId);
    const nowStr = new Date().toLocaleString('vi-VN');

    const newLog: BotNotificationLog = {
      id: `LOG-${Date.now()}`,
      tenantId: activeTenant.id,
      tripId: targetTrip.id,
      tripCode: targetTrip.tripCode,
      timestamp: nowStr,
      channel: channel === 'APP' ? 'AI_SYSTEM' : channel,
      recipientDriverId: drv?.id,
      recipientName: drv?.fullName || 'Tài xế',
      recipientHandle:
        channel === 'TELEGRAM'
          ? drv?.telegramUsername || ''
          : channel === 'ZALO'
          ? drv?.zaloPhone || ''
          : drv?.phone || '',
      messageType: 'BOOKING_CONFIRM',
      content: `Tài xế ${drv?.fullName} đã bấm nút [XÁC NHẬN LỊCH #${targetTrip.tripCode}] ${channel === 'APP' ? 'trên ứng dụng' : `qua ${channel}`}. Hệ thống đã khóa lịch xe và ghi nhận tự cấn trừ.`,
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

    showToast(
      `Tài xế ${drv?.fullName} đã xác nhận lịch #${targetTrip.tripCode}${channel === 'APP' ? '' : ` qua ${channel}`}`
    );
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
      content: `[TAG CHUYỂN TÀI XẾ] Chuyến #${targetTrip.tripCode} đã được tag chuyển từ ${
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
      `Đã @Tag chuyển chuyến #${targetTrip.tripCode} sang tài xế ${newDrv.fullName} qua Zalo & Telegram!`
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
      `Bot đã cộng thêm ${formatVND(amount)} (${
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
    sendTripToTelegram(newTripId, newTrip.tripCode);
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
    showToast(`Đã thêm xe ${newVeh.brand} ${newVeh.model} (${newVeh.seatCategory}) vào đội xe!`);
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
    showToast(`Đã lưu hồ sơ tài xế ${newDrv.fullName} (GPLX hạng ${newDrv.licenseClass})!`);
  };

  // Handler when a public customer submits a booking from `/`
  // 1. TRANG CÔNG KHAI CHO KHÁCH HÀNG ĐẶT XE (`/`) — Tách biệt hoàn toàn khỏi link Admin
  if (!isAdminRoute) {
    return (
      <PublicCustomerBookingPortal />
    );
  }

  // 2. TRANG ĐĂNG NHẬP QUẢN TRỊ RIÊNG (`/admin` hoặc `/quan-tri` hoặc `/login`)
  if (!authSession) {
    return (
      <AuthLoginGate
        onLoginSuccess={handleLoginSuccess}
        onBackToPublicPortal={() => navigateToRoute('/')}
      />
    );
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-3 p-4 text-sm text-slate-600">
        <span>{loadError || 'Đang tải dữ liệu...'}</span>
        {loadError && (
          <button
            type="button"
            onClick={handleLogout}
            className="h-9 px-4 rounded-full bg-slate-900 text-white text-xs font-medium"
          >
            Đăng nhập lại
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900">
      <div className="w-full min-h-screen flex flex-col pb-24 md:pb-8">
        {/* Header */}
        <header className="glass sticky top-0 z-30 border-b border-slate-200/80 shrink-0">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                <Car className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold leading-tight truncate">Thuê xe nhà</h1>
                <p className="text-xs text-slate-500 leading-tight truncate">
                  {activeTenant.shortName} · {authSession.role === 'ADMIN' ? 'Quản trị' : 'Tài xế'} · {authSession.fullName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {authSession.role === 'ADMIN' && (
                <button
                  type="button"
                  onClick={() => setIsSaaSModalOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium text-slate-700 hover:bg-slate-200/70 transition"
                  title="Bảng định mức tuyến cao tốc (ETC)"
                >
                  <Navigation className="w-4 h-4 text-slate-500" />
                  <span>Định mức ETC</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => navigateToRoute('/')}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium text-slate-700 hover:bg-slate-200/70 transition"
                title="Xem trang đặt xe dành cho khách hàng"
              >
                <Globe className="w-4 h-4 text-slate-500" />
                <span className="hidden md:inline">Trang khách</span>
              </button>
              {authSession.role === 'ADMIN' && (
                <button
                  type="button"
                  onClick={() => setIsSecurityModalOpen(true)}
                  className="relative inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium text-slate-700 hover:bg-slate-200/70 transition"
                  title="Tài khoản quản trị & kết nối dữ liệu"
                >
                  <ShieldCheck className="w-4 h-4 text-slate-500" />
                  <span className="hidden sm:inline">Bảo mật</span>
                </button>
              )}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTrip(null);
                    setIsBookingModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 h-8 px-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Đặt lịch</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-200/70 hover:text-rose-600 transition"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Điều hướng trên máy tính: dải nền xanh nhạt, mỗi mục là một ô riêng */}
          <div className="hidden md:block bg-blue-50 border-t border-blue-100">
            <div className="max-w-7xl mx-auto px-6 flex items-center gap-2 py-2">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-medium transition ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 shadow-sm hover:bg-blue-100/70 hover:text-blue-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {toastMsg && (
          <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md bg-slate-900/95 text-white px-4 py-3 rounded-2xl shadow-xl text-sm font-medium">
            {toastMsg}
          </div>
        )}


        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
          <ErrorBoundary resetKey={activeTab}>
          {/* TAB 1: LỊCH ĐẶT XE & LỘ TRÌNH DI CHUYỂN */}
          {activeTab === 'BOOKINGS' && (
            <div className="space-y-4">
              {/* Tổng quan tài chính */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('FINANCE')}
                  className="text-left bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition"
                >
                  <div className="text-xs font-medium text-slate-500">Tổng doanh thu</div>
                  <div className="text-xl sm:text-2xl font-semibold tracking-tight mt-1 text-slate-900">
                    {formatVND(kpi.grossRevenue)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {tenantTrips.filter((t) => t.status === 'COMPLETED').length} chuyến hoàn thành
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('FINANCE')}
                  className="text-left bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition"
                >
                  <div className="text-xs font-medium text-slate-500">Cấn trừ & chi phí nhập tay</div>
                  <div className="text-xl sm:text-2xl font-semibold tracking-tight mt-1 text-slate-900">
                    {formatVND(kpi.totalAutoDeducted + kpi.totalManualExpense)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Tự động: {formatVND(kpi.totalAutoDeducted)}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('FINANCE')}
                  className="text-left bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition"
                >
                  <div className="text-xs font-medium text-slate-500">Phạt & đậu xe</div>
                  <div className="text-xl sm:text-2xl font-semibold tracking-tight mt-1 text-rose-600">
                    {formatVND(kpi.totalRiskExpense)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 truncate">
                    Đậu xe {formatVND(kpi.totalParking)} · Phạt {formatVND(kpi.totalTrafficFine)}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('FINANCE')}
                  className="text-left bg-slate-900 text-white rounded-2xl p-4 shadow-sm hover:bg-slate-800 transition"
                >
                  <div className="text-xs font-medium text-slate-400">Thực còn vào tài khoản</div>
                  <div className="text-xl sm:text-2xl font-semibold tracking-tight mt-1">
                    {formatVND(kpi.netRemainingToAccount)}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 inline-flex items-center gap-0.5">
                    Xem đối soát <ChevronRight className="w-3 h-3" />
                  </div>
                </button>
              </div>

              {/* Bộ lọc */}
              <div className="bg-white rounded-2xl p-3 shadow-sm space-y-3">
                <div className="flex items-center gap-1 overflow-x-auto p-1 rounded-xl bg-slate-100 w-fit max-w-full">
                  {(['ALL', '4 chỗ', '5 chỗ', '7 chỗ', '9 chỗ Limousine', '16 chỗ'] as const).map(
                    (seat) => (
                      <button
                        key={seat}
                        type="button"
                        onClick={() => setBookingSeatFilter(seat)}
                        className={`px-3 h-7 rounded-lg text-xs font-medium shrink-0 transition ${
                          bookingSeatFilter === seat
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {seat === 'ALL' ? 'Tất cả' : seat}
                      </button>
                    )
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  <select
                    value={bookingRouteFilter}
                    onChange={(e) =>
                      setBookingRouteFilter(e.target.value as 'ALL' | 'HIGHWAY' | 'NATIONAL_ROAD')
                    }
                    className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800"
                  >
                    <option value="ALL">Tất cả tuyến đường</option>
                    <option value="HIGHWAY">Cao tốc (ETC)</option>
                    <option value="NATIONAL_ROAD">Quốc lộ</option>
                  </select>

                  <select
                    value={bookingDriverFilter}
                    onChange={(e) => setBookingDriverFilter(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800"
                  >
                    <option value="ALL">Tất cả tài xế</option>
                    {tenantDrivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.fullName} ({d.telegramUsername})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Danh sách chuyến */}
              {filteredDashboardTrips.length === 0 && (
                <div className="bg-white rounded-2xl shadow-sm py-16 text-center text-sm text-slate-500">
                  Chưa có chuyến nào phù hợp bộ lọc.
                </div>
              )}
              <div className="space-y-3">
                {filteredDashboardTrips.map((trip) => {
                  const veh = tenantVehicles.find((v) => v.id === trip.vehicleId);
                  const drv = tenantDrivers.find((d) => d.id === trip.driverId);
                  const taggedDrvs = tenantDrivers.filter((d) =>
                    trip.taggedDriverIds?.includes(d.id)
                  );
                  const fin = calculateTripFinancials(trip);
                  const myDriver = tenantDrivers.find((d) => d.id === authSession.driverId);
                  // Chuyến có tài xế: tài xế được gán hoặc admin. Chuyến tự lái: chủ xe của chiếc xe đó hoặc admin.
                  const canActWithDriver =
                    isAdmin || (!!authSession.driverId && trip.driverId === authSession.driverId);
                  const canActSelfDrive = isAdmin || ownsVehicle(myDriver, veh);

                  return (
                    <div key={trip.id} className="bg-white rounded-2xl shadow-sm p-4 sm:p-5 space-y-4">
                      {/* Hàng đầu: mã chuyến, trạng thái, thao tác */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-semibold text-slate-900">#{trip.tripCode}</span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                            {trip.bookingType === 'SELF_DRIVE' ? 'Tự lái' : 'Có tài xế'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                            {trip.routeType === 'HIGHWAY'
                              ? 'Cao tốc'
                              : trip.routeType === 'NATIONAL_ROAD'
                              ? 'Quốc lộ'
                              : 'Cao tốc + quốc lộ'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              trip.status === 'PENDING_CONFIRM'
                                ? 'bg-amber-100 text-amber-700'
                                : trip.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-700'
                                : trip.status === 'CANCELLED'
                                ? 'bg-slate-100 text-slate-500'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {trip.status === 'PENDING_CONFIRM'
                              ? 'Chờ xác nhận'
                              : trip.status === 'CONFIRMED'
                              ? 'Đã xác nhận'
                              : trip.status === 'IN_PROGRESS'
                              ? 'Đang chạy'
                              : trip.status === 'COMPLETED'
                              ? 'Hoàn thành'
                              : 'Đã hủy'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setVoucherTrip(trip)}
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium transition"
                            title="In phiếu lệnh điều xe / sao chép gửi nhóm Zalo"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Phiếu / Zalo</span>
                          </button>
                          {isAdmin && trip.status !== 'CANCELLED' && trip.customerPhone && (
                            <button
                              type="button"
                              onClick={() => openCustomerZalo(trip)}
                              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-medium transition"
                              title="Mở Zalo của khách, nội dung xác nhận đã được chép sẵn để dán"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>Zalo khách</span>
                            </button>
                          )}
                          {isAdmin && trip.status !== 'CANCELLED' && (
                            <button
                              type="button"
                              onClick={() => sendTripToTelegram(trip.id, trip.tripCode, true)}
                              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition"
                              title="Gửi (lại) chuyến này vào nhóm Telegram"
                            >
                              <Bot className="w-3.5 h-3.5" />
                              <span>Gửi Telegram</span>
                            </button>
                          )}
                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTrip(trip);
                                setIsBookingModalOpen(true);
                              }}
                              className="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 transition"
                              title="Chỉnh sửa lịch & chi phí"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          ) : (
                            (trip.status === 'CONFIRMED' || trip.status === 'IN_PROGRESS') &&
                            (trip.bookingType === 'SELF_DRIVE' ? canActSelfDrive : canActWithDriver) && (
                              <button
                                type="button"
                                onClick={() => setExpenseTrip(trip)}
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium transition"
                                title="Thêm chi phí phát sinh: đậu xe, vá lốp..."
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Thêm chi phí</span>
                              </button>
                            )
                          )}
                          {authSession.role === 'ADMIN' && (
                            <button
                              type="button"
                              onClick={async () => {
                                const ok = await confirm({
                                  title: `Xóa chuyến #${trip.tripCode}?`,
                                  message: 'Thao tác này không hoàn tác được.',
                                  confirmLabel: 'Xóa chuyến',
                                  tone: 'danger',
                                });
                                if (!ok) return;
                                setDb((prev) => ({
                                  ...prev,
                                  trips: prev.trips.filter((t) => t.id !== trip.id),
                                }));
                                showToast(`Đã xóa chuyến #${trip.tripCode}`);
                              }}
                              className="w-8 h-8 inline-flex items-center justify-center rounded-full text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition"
                              title="Xóa chuyến"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Xe */}
                      {veh && (
                        <div className="flex items-center justify-between gap-2 text-sm">
                          {isAdmin && trip.status !== 'COMPLETED' && trip.status !== 'CANCELLED' ? (
                            <select
                              value={trip.vehicleId}
                              onChange={(e) => handleChangeTripVehicle(trip.id, e.target.value)}
                              className="min-w-0 flex-1 max-w-md h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900"
                              title="Đổi xe cho chuyến"
                            >
                              {tenantVehicles
                                .filter((v) => v.id === trip.vehicleId || vehicleFitsTrip(v, trip))
                                .map((v) => (
                                  <option key={v.id} value={v.id}>
                                    [{v.seatCategory}] {v.brand} {v.model} ({v.plateNumber})
                                  </option>
                                ))}
                            </select>
                          ) : (
                            <span className="font-medium text-slate-900">
                              {veh.brand} {veh.model}
                              <span className="text-slate-500 font-normal"> · {veh.seatCategory}</span>
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-md border border-slate-300 text-slate-800 text-xs font-medium font-mono bg-white">
                            {veh.plateNumber}
                          </span>
                        </div>
                      )}

                      {/* Lộ trình & tài xế */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-sm">
                        <div className="space-y-1.5">
                          <div className="font-medium text-slate-900 flex items-start gap-1.5">
                            <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <span>
                              {trip.pickupLocation} → {trip.dropoffLocation}
                            </span>
                          </div>
                          <div className="text-slate-600">
                            Tuyến: <span className="text-slate-900">{trip.routeDetail}</span> ({trip.distanceKm} km)
                          </div>
                          <div className="text-slate-600">
                            Thời gian: <span className="text-slate-900">{trip.tripDate}</span>
                            {trip.tripEndDate && trip.tripEndDate !== trip.tripDate && (
                              <> → <span className="text-slate-900">{trip.tripEndDate}</span></>
                            )}{' '}
                            ({trip.departureTime} – {trip.returnTime})
                          </div>
                          <div className="text-slate-600">
                            Khách: <span className="text-slate-900">{trip.customerName}</span> ({trip.customerPhone})
                          </div>
                        </div>

                        {trip.bookingType === 'SELF_DRIVE' ? (
                          <div className="md:border-l md:border-slate-200 md:pl-4 space-y-2">
                            <div className="text-slate-600 flex items-start gap-1.5">
                              <UserCheck className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                              <span>Khách tự lái, không gán tài xế</span>
                            </div>
                            {trip.status === 'PENDING_CONFIRM' ? (
                              <span className="inline-flex h-8 items-center px-3.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                                Chờ chủ xe / điều hành xác nhận
                              </span>
                            ) : (
                              <TripStatusSteps status={trip.status} />
                            )}
                          </div>
                        ) : (
                        <div className="space-y-1.5 md:border-l md:border-slate-200 md:pl-4">
                          {isAdmin && trip.status !== 'COMPLETED' && trip.status !== 'CANCELLED' ? (
                            <div className="space-y-1.5">
                              <select
                                value={trip.driverId || ''}
                                onChange={async (e) => {
                                  const newId = e.target.value;
                                  if (!newId || newId === trip.driverId) return;
                                  const target = tenantDrivers.find((d) => d.id === newId);
                                  const ok = await confirm({
                                    title: `Điều phối chuyến #${trip.tripCode}?`,
                                    message: `Giao chuyến cho ${target?.fullName}. Tài xế sẽ nhận tin nhắn Telegram nếu đã liên kết bot.`,
                                    confirmLabel: 'Điều phối',
                                  });
                                  if (ok) handleDispatchDriver(trip.id, newId);
                                }}
                                className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900"
                                title="Chọn tài xế điều phối cho chuyến"
                              >
                                {!trip.driverId && <option value="">Chọn tài xế điều phối</option>}
                                {tenantDrivers.map((d) => {
                                  const reason =
                                    d.id === trip.driverId
                                      ? ''
                                      : driverUnavailableReason(
                                          d,
                                          trip,
                                          veh,
                                          busyDriverIds(db.trips, trip)
                                        );
                                  return (
                                    <option key={d.id} value={d.id} disabled={!!reason}>
                                      {d.fullName} ({d.code}){reason ? ` — ${reason}` : ''}
                                    </option>
                                  );
                                })}
                              </select>
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                {drv && (
                                  <span className="text-slate-500">
                                    Bằng {drv.licenseClass} · {drv.phone}
                                  </span>
                                )}
                                {drv && !isDispatched(trip) ? (
                                  <>
                                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                                      Chưa điều phối
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleDispatchDriver(trip.id, drv.id)}
                                      className="h-7 px-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium transition"
                                    >
                                      Điều phối & báo tài xế
                                    </button>
                                  </>
                                ) : drv && trip.dispatchedAt ? (
                                  <span className="text-slate-500">
                                    Đã điều phối{trip.dispatchedByName ? ` bởi ${trip.dispatchedByName}` : ''}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          ) : (
                            <div className="font-medium text-slate-900 flex items-start gap-1.5">
                              <UserCheck className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                              <span>
                                {drv?.fullName || 'Chưa điều phối tài xế'}
                                {drv && (
                                  <span className="text-slate-500 font-normal">
                                    {' '}
                                    · Bằng {drv.licenseClass} · {drv.phone}
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                          <div className="text-slate-600 flex flex-wrap items-center gap-1">
                            <span>Đã tag:</span>
                            {taggedDrvs.map((d) => (
                              <span
                                key={d.id}
                                className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium"
                              >
                                {d.telegramUsername}
                              </span>
                            ))}
                          </div>
                          <div className="pt-1">
                            {trip.status === 'PENDING_CONFIRM' ? (
                              canActWithDriver && isDispatched(trip) ? (
                                <button
                                  type="button"
                                  onClick={() => handleDriverConfirmTrip(trip.id, 'APP')}
                                  className="h-8 px-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition"
                                >
                                  Xác nhận nhận chuyến
                                </button>
                              ) : (
                                <span className="inline-flex h-8 items-center px-3.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                                  {isDispatched(trip) ? 'Chờ tài xế xác nhận' : 'Chờ điều hành điều phối'}
                                </span>
                              )
                            ) : (
                              <TripStatusSteps status={trip.status} />
                            )}
                          </div>
                        </div>
                        )}
                      </div>

                      {/* Hoàn thành chuyến: ghi nhận doanh thu */}
                      {trip.status !== 'CANCELLED' && (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs text-slate-500">
                            {trip.status === 'COMPLETED'
                              ? `Hoàn thành ${
                                  trip.completedAt
                                    ? new Date(trip.completedAt).toLocaleString('vi-VN')
                                    : ''
                                }${trip.completedByName ? ` · xác nhận bởi ${trip.completedByName}` : ''}. Đã ghi nhận vào doanh thu.`
                              : 'Số liệu dưới đây là dự kiến, được ghi nhận vào doanh thu khi chuyến hoàn thành.'}
                          </p>
                          <div className="flex items-center gap-2">
                            {trip.bookingType === 'SELF_DRIVE' ? (
                              canActSelfDrive && (
                                <>
                                  {trip.status === 'PENDING_CONFIRM' && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateTripStatus(trip.id, 'CONFIRMED')}
                                      className="h-8 px-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition"
                                    >
                                      Xác nhận chuyến
                                    </button>
                                  )}
                                  {trip.status === 'CONFIRMED' && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateTripStatus(trip.id, 'IN_PROGRESS')}
                                      className="h-8 px-3.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium transition"
                                    >
                                      Giao xe cho khách
                                    </button>
                                  )}
                                  {trip.status === 'IN_PROGRESS' && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const ok = await confirm({
                                          title: `Hoàn thành chuyến #${trip.tripCode}?`,
                                          message: 'Xác nhận đã nhận lại xe. Doanh thu và chi phí sẽ được ghi nhận.',
                                          confirmLabel: 'Hoàn thành',
                                          tone: 'success',
                                        });
                                        if (ok) handleUpdateTripStatus(trip.id, 'COMPLETED');
                                      }}
                                      className="h-8 px-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition"
                                    >
                                      Nhận lại xe, hoàn thành
                                    </button>
                                  )}
                                </>
                              )
                            ) : (
                              canActWithDriver && (
                                <>
                                  {trip.status === 'CONFIRMED' && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateTripStatus(trip.id, 'IN_PROGRESS')}
                                      className="h-8 px-3.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium transition"
                                    >
                                      Bắt đầu chạy
                                    </button>
                                  )}
                                  {(trip.status === 'CONFIRMED' || trip.status === 'IN_PROGRESS') && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const ok = await confirm({
                                          title: `Hoàn thành chuyến #${trip.tripCode}?`,
                                          message: 'Doanh thu và chi phí của chuyến sẽ được ghi nhận vào hệ thống.',
                                          confirmLabel: 'Hoàn thành',
                                          tone: 'success',
                                        });
                                        if (ok) handleUpdateTripStatus(trip.id, 'COMPLETED');
                                      }}
                                      className="h-8 px-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition"
                                    >
                                      Hoàn thành chuyến
                                    </button>
                                  )}
                                </>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* Đối soát chuyến */}
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-px rounded-xl overflow-hidden bg-slate-200 text-sm">
                        <div className="bg-white px-3 py-2.5">
                          <div className="text-xs text-slate-500">Tiền chuyến</div>
                          <div className="font-semibold text-slate-900">{formatVND(fin.grossRevenue)}</div>
                        </div>
                        <div className="bg-white px-3 py-2.5">
                          <div className="text-xs text-slate-500">Cấn trừ tự động</div>
                          <div className="font-semibold text-slate-900">
                            -{formatVND(fin.totalAutoDeducted)}
                          </div>
                        </div>
                        <div className="bg-white px-3 py-2.5">
                          <div className="text-xs text-slate-500">Tiền tài xế</div>
                          <div className="font-semibold text-slate-900">-{formatVND(fin.driverPay)}</div>
                        </div>
                        <div className="bg-white px-3 py-2.5">
                          <div className="text-xs text-slate-500">Khách sạn & nhập tay</div>
                          <div className="font-semibold text-slate-900">
                            -{formatVND(fin.hotelFee + fin.manualExpenseOnly)}
                          </div>
                        </div>
                        <div className="bg-white px-3 py-2.5">
                          <div className="text-xs text-slate-500">Phạt & đậu xe</div>
                          <div className="font-semibold text-rose-600">
                            -{formatVND(fin.totalRiskExpense)}
                          </div>
                        </div>
                        <div className="bg-slate-900 px-3 py-2.5 col-span-2 md:col-span-1">
                          <div className="text-xs text-slate-400">
                            {trip.status === 'COMPLETED' ? 'Thực còn vào TK' : 'Dự kiến còn lại'}
                          </div>
                          <div className="font-semibold text-white">
                            {formatVND(fin.netRemainingToAccount)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: HÀNH TRÌNH CHUYẾN */}
          {isAdmin && activeTab === 'JOURNEYS' && (
            <JourneyRoutesTab
              routes={(db.journeyRoutes || []).filter((r) => r.tenantId === activeTenant.id)}
              highwayPresets={db.highwayPresets}
              activeTenantId={activeTenant.id}
              canEdit={authSession.role === 'ADMIN'}
              onSave={(data, existingId) => {
                setDb((prev) => ({
                  ...prev,
                  journeyRoutes: existingId
                    ? (prev.journeyRoutes || []).map((r) =>
                        r.id === existingId ? { ...r, ...data } : r
                      )
                    : [...(prev.journeyRoutes || []), { ...data, id: `JR-${Date.now()}` } as JourneyRoute],
                }));
                showToast(existingId ? 'Đã cập nhật hành trình' : 'Đã thêm hành trình');
              }}
              onDelete={(id) => {
                setDb((prev) => ({
                  ...prev,
                  journeyRoutes: (prev.journeyRoutes || []).filter((r) => r.id !== id),
                }));
                showToast('Đã xóa hành trình');
              }}
            />
          )}

          {/* TAB: NỘI DUNG TRANG KHÁCH */}
          {isAdmin && activeTab === 'SITE_CONTENT' && (
            <SiteContentTab
              key={activeTenant.id}
              content={activeTenant.siteContent}
              canEdit={authSession.role === 'ADMIN'}
              onSave={(siteContent) => {
                setDb((prev) => ({
                  ...prev,
                  tenants: prev.tenants.map((t) => (t.id === activeTenant.id ? { ...t, siteContent } : t)),
                }));
                showToast('Đã lưu nội dung trang khách');
              }}
            />
          )}

          {/* TAB 2: ĐỐI SOÁT DOANH THU, CHI PHÍ TỰ CẤN TRỪ, PHẠT & ĐẬU XE */}
          {activeTab === 'FINANCE' && !isAdmin && (
            <DriverEarningsTab
              me={tenantDrivers.find((d) => d.id === authSession.driverId)}
              trips={tenantTrips}
              vehicles={tenantVehicles}
              drivers={tenantDrivers}
            />
          )}
          {activeTab === 'FINANCE' && isAdmin && (
            <FinanceSettlementTab
              trips={tenantTrips}
              drivers={
                isAdmin ? tenantDrivers : tenantDrivers.filter((d) => d.id === authSession.driverId)
              }
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
          {isAdmin && activeTab === 'FLEET_DRIVERS' && (
            <FleetAndDriversTab
              vehicles={tenantVehicles}
              drivers={tenantDrivers}
              trips={tenantTrips}
              activeTenantId={activeTenant.id}
              isMobile={isMobileLayout}
              telegramLinks={telegramLinks}
              onAddVehicle={handleAddVehicle}
              onUpdateVehicle={(updatedVeh) => {
                setDb((prev) => ({
                  ...prev,
                  vehicles: prev.vehicles.map((v) =>
                    v.id === updatedVeh.id ? updatedVeh : v
                  ),
                }));
                showToast(`Đã cập nhật thông tin xe ${updatedVeh.plateNumber}!`);
              }}
              onDeleteVehicle={(vehId) => {
                setDb((prev) => ({
                  ...prev,
                  vehicles: prev.vehicles.filter((v) => v.id !== vehId),
                }));
                showToast('Đã xóa xe khỏi danh sách!');
              }}
              onAddDriver={handleAddDriver}
              onUpdateDriver={(updatedDrv) => {
                setDb((prev) => ({
                  ...prev,
                  drivers: prev.drivers.map((d) =>
                    d.id === updatedDrv.id ? updatedDrv : d
                  ),
                }));
                showToast(`Đã cập nhật hồ sơ tài xế ${updatedDrv.fullName}!`);
              }}
              onDeleteDriver={(drvId) => {
                setDb((prev) => ({
                  ...prev,
                  drivers: prev.drivers.filter((d) => d.id !== drvId),
                }));
                showToast('Đã xóa hồ sơ tài xế!');
              }}
            />
          )}

          {/* TAB 4: AI BOT XÁC NHẬN LỊCH & TAG TÊN TÀI XẾ QUA ZALO / TELEGRAM */}
          {isAdmin && activeTab === 'AI_BOT' && (
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
              onDeleteBotLogs={(ids) => {
                setDb((prev) => ({ ...prev, botLogs: (prev.botLogs || []).filter((l) => !ids.includes(l.id)) }));
                showToast(ids.length > 1 ? `Đã xóa ${ids.length} bản ghi nhật ký` : 'Đã xóa bản ghi nhật ký');
              }}
              onSaveTelegramConfig={(token, chatId) => {
                setDb((prev) => ({
                  ...prev,
                  tenants: prev.tenants.map((t) =>
                    t.id === activeTenant.id
                      ? { ...t, telegramBotToken: token, telegramGroupChatId: chatId }
                      : t
                  ),
                }));
                showToast('Đã lưu cấu hình Telegram Bot Token & Zalo Webhook!');
              }}
            />
          )}
          </ErrorBoundary>
        </main>

        {/* Thanh điều hướng dưới (di động) */}
        <nav style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}
          className="md:hidden glass fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] grid">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 text-xs font-medium transition ${
                activeTab === tab.id ? 'text-blue-600' : 'text-slate-500'
              }`}
            >
              <tab.icon className="w-6 h-6" />
              <span>{tab.short}</span>
            </button>
          ))}
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
        trips={db.trips.filter((t) => t.tenantId === activeTenant.id)}
        journeyRoutes={(db.journeyRoutes || []).filter((r) => r.tenantId === activeTenant.id)}
        highwayPresets={db.highwayPresets}
        activeTenant={activeTenant}
        editingTrip={editingTrip}
      />

      <AddExpenseModal
        trip={expenseTrip}
        onClose={() => setExpenseTrip(null)}
        onSubmit={handleDriverAddExpense}
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
        highwayPresets={db.highwayPresets}
        onAddHighwayPreset={(presetData) => {
          const newPreset: HighwayPreset = {
            ...presetData,
            id: `HW-${Date.now()}`,
          };
          setDb((prev) => ({
            ...prev,
            highwayPresets: [...prev.highwayPresets, newPreset],
          }));
          showToast(`Đã thêm tuyến định mức "${newPreset.name}"!`);
        }}
        onUpdateHighwayPreset={(preset) => {
          setDb((prev) => ({
            ...prev,
            highwayPresets: prev.highwayPresets.map((p) => (p.id === preset.id ? preset : p)),
          }));
          showToast(`Đã cập nhật tuyến "${preset.name}"!`);
        }}
        onDeleteHighwayPreset={async (preset) => {
          const ok = await confirm({
            title: `Xóa tuyến "${preset.name}"?`,
            message: 'Các chuyến đã tạo không bị ảnh hưởng.',
            confirmLabel: 'Xóa tuyến',
            tone: 'danger',
          });
          if (!ok) return;
          setDb((prev) => ({
            ...prev,
            highwayPresets: prev.highwayPresets.filter((p) => p.id !== preset.id),
          }));
          showToast(`Đã xóa tuyến "${preset.name}"!`);
        }}
      />

      {/* Modal Quản trị Bảo mật & Xác nhận Đăng nhập Admin */}
      <AdminSecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        isSuperAdmin={authSession.subRole === 'SUPER_ADMIN'}
        drivers={tenantDrivers}
        showToast={showToast}
      />
    </div>
  );
}

export default App;
