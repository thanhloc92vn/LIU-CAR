import React, { useState } from 'react';
import {
  AtSign,
  Bot,
  CheckCircle2,
  FileWarning,
  MessageSquare,
  ParkingCircle,
  RefreshCw,
  Send,
  Settings,
  Sparkles,
  UserPlus,
  Zap,
} from 'lucide-react';
import {
  BotNotificationLog,
  Driver,
  HighwayPreset,
  TenantConfig,
  Trip,
  Vehicle,
} from '../types/fleet';
import {
  buildBotDispatchMessage,
  parseNaturalBookingCommand,
} from '../utils/aiBotEngine';
import { calculateTripFinancials, formatVND } from '../utils/calculations';

interface AIBotZaloTelegramTabProps {
  trips: Trip[];
  drivers: Driver[];
  vehicles: Vehicle[];
  highwayPresets: HighwayPreset[];
  botLogs: BotNotificationLog[];
  activeTenant: TenantConfig;
  isMobile?: boolean;
  onCreateTripFromAI: (tripData: Omit<Trip, 'id' | 'createdAt'>, botLog: Omit<BotNotificationLog, 'id'>) => void;
  onDriverConfirmTrip: (tripId: string, channel: 'TELEGRAM' | 'ZALO') => void;
  onTagReassignDriver: (tripId: string, newDriverId: string, channel: 'TELEGRAM' | 'ZALO') => void;
  onBotQuickAddRisk: (tripId: string, type: 'PARKING' | 'FINE', amount: number, note: string) => void;
  onSaveTelegramConfig: (botToken: string, groupChatId: string) => void;
}

const SAMPLE_PROMPTS = [
  'Đặt xe 7 chỗ Xpander ngày mai 07:30 đi Phan Thiết theo đường cao tốc, giá 3.200.000đ, phí đậu xe 60.000đ, giao @taixe_minh',
  'Đặt xe 4 chỗ Vios hôm nay 09:00 đi Bảo Lộc theo đường quốc lộ, giá 2.400.000đ, giao @hung_tran_driver',
  'Đặt xe 16 chỗ Solati ngày mai 06:00 đi Vũng Tàu tuyến cao tốc, giá 3.800.000đ, đậu xe 100.000đ, tag @nam_limousine @taixe_minh',
];

export const AIBotZaloTelegramTab: React.FC<AIBotZaloTelegramTabProps> = ({
  trips,
  drivers,
  vehicles,
  highwayPresets,
  botLogs,
  activeTenant,
  isMobile = false,
  onCreateTripFromAI,
  onDriverConfirmTrip,
  onTagReassignDriver,
  onBotQuickAddRisk,
  onSaveTelegramConfig,
}) => {
  const [commandInput, setCommandInput] = useState<string>(SAMPLE_PROMPTS[0]);
  const [selectedChannel, setSelectedChannel] = useState<'BOTH' | 'TELEGRAM' | 'ZALO'>('BOTH');
  const [reassignTargetByTrip, setReassignTargetByTrip] = useState<Record<string, string>>({});
  const [showWebhookSettings, setShowWebhookSettings] = useState(false);
  const [botToken, setBotToken] = useState(activeTenant.telegramBotToken || '');
  const [groupChatId, setGroupChatId] = useState(activeTenant.telegramGroupChatId || '');
  const [lastAiFeedback, setLastAiFeedback] = useState<string>('');

  const livePreview = parseNaturalBookingCommand(
    commandInput,
    vehicles,
    drivers,
    highwayPresets
  );

  const handleInsertTag = (drv: Driver) => {
    setCommandInput((prev) => `${prev.trim()} ${drv.telegramUsername} `);
  };

  const handleRunAICommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;

    const parsed = parseNaturalBookingCommand(
      commandInput,
      vehicles,
      drivers,
      highwayPresets
    );

    const veh = parsed.matchedVehicle || vehicles[0];
    const drv = parsed.matchedDriver || drivers[0];
    const preset = parsed.matchedHighwayPreset || highwayPresets[0];
    const distanceKm = (preset?.defaultDistanceKm || 150) * 2;

    const autoHighwayToll =
      parsed.routeType === 'HIGHWAY' || parsed.routeType === 'MIXED'
        ? Math.round((preset?.baseToll4To7Seats || 180000) * (veh?.highwayTollMultiplier || 1) * 2)
        : Math.round((preset?.baseToll4To7Seats || 0) * 2);

    const autoFuelQuota = Math.round(distanceKm * (veh?.fuelCostPerKm || 2000));
    const autoDispatchFee = Math.round(
      (parsed.baseFareRevenue * (activeTenant.defaultDispatchFeePercent || 10)) / 100
    );

    const tripCode = `AI-${parsed.tripDate.slice(5, 7)}${parsed.tripDate.slice(8, 10)}-${Math.floor(
      100 + Math.random() * 900
    )}`;

    const newTripData: Omit<Trip, 'id' | 'createdAt'> = {
      tenantId: activeTenant.id,
      tripCode,
      bookingType: 'WITH_DRIVER',
      vehicleId: veh.id,
      driverId: drv.id,
      taggedDriverIds: parsed.taggedDrivers.map((d) => d.id),
      customerName: 'Khách đặt qua AI Bot',
      customerPhone: '0909888777',
      tripDate: parsed.tripDate,
      departureTime: parsed.departureTime,
      returnTime: '20:00',
      pickupLocation: parsed.pickupLocation,
      dropoffLocation: parsed.dropoffLocation,
      routeType: parsed.routeType,
      routeDetail: preset?.name || 'Tuyến Cao tốc / Quốc lộ',
      distanceKm,
      isRoundTrip: true,
      baseFareRevenue: parsed.baseFareRevenue,
      surchargeRevenue: 0,
      paymentCollectedBy: 'COMPANY_BANK',
      autoHighwayToll,
      autoFuelQuota,
      autoDispatchFee,
      manualExpenseTotal: parsed.manualExpenseTotal,
      manualExpenseNote: parsed.manualExpenseTotal > 0 ? 'Chi phí nhập từ lệnh AI Bot' : '',
      parkingFee: parsed.parkingFee,
      parkingNote: parsed.parkingFee > 0 ? 'Phí đậu xe báo qua AI Bot' : '',
      trafficFineFee: parsed.trafficFineFee,
      trafficFineNote: parsed.trafficFineFee > 0 ? 'Phí phạt báo qua AI Bot' : '',
      otherRiskFee: 0,
      otherRiskNote: '',
      status: 'PENDING_CONFIRM',
      botChannel: selectedChannel,
      notes: `Tạo tự động từ câu lệnh AI: "${commandInput.trim()}"`,
    };

    const tempTripForMsg: Trip = {
      ...newTripData,
      id: 'TEMP',
      createdAt: new Date().toISOString(),
    };

    const msgContent = buildBotDispatchMessage(
      tempTripForMsg,
      veh,
      drv,
      parsed.taggedDrivers
    );

    // Optional real Telegram API call if configured
    if (botToken && groupChatId) {
      try {
        await fetch('/api/telegram-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            botToken,
            chatId: groupChatId,
            text: msgContent,
          }),
        });
      } catch {
        // Ignore network error in sandbox
      }
    }

    onCreateTripFromAI(newTripData, {
      tenantId: activeTenant.id,
      tripCode,
      timestamp: new Date().toLocaleString('vi-VN'),
      channel: selectedChannel === 'ZALO' ? 'ZALO' : 'TELEGRAM',
      recipientDriverId: drv.id,
      recipientName: drv.fullName,
      recipientHandle: parsed.taggedDrivers
        .map((d) => `${d.telegramUsername} / Zalo:${d.zaloPhone}`)
        .join(', '),
      messageType: 'BOOKING_CONFIRM',
      content: msgContent,
      status: 'SENT_WAITING',
    });

    setLastAiFeedback(
      `Đã tạo chuyến #${tripCode} và bắn thông báo xác nhận lịch đến ${parsed.taggedDrivers
        .map((d) => d.fullName)
        .join(', ')} qua ${selectedChannel === 'BOTH' ? 'cả Zalo & Telegram' : selectedChannel}!`
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Hộp Điều Phối AI Bot Bằng Ngôn Ngữ Tự Nhiên & @Tag Tên Tài Xế */}
      <div className="bg-white text-slate-900 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Bot className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold flex items-center gap-2">
                Trợ Lý AI Đặt Lịch Xe & Tag Tên Tài Xế Qua Zalo / Telegram
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                  ONLINE 24/7
                </span>
              </h2>
              <p className="text-xs text-blue-600">
                Nhập câu lệnh tự nhiên có loại ghế (4 chỗ, 7 chỗ...), tuyến Cao tốc/Quốc lộ và @tag tên tài xế — Bot tự tính cấn trừ và bắn thông báo ngay!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowWebhookSettings(!showWebhookSettings)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition"
          >
            <Settings className="w-3.5 h-3.5" />
            Cấu hình Token Zalo OA & Telegram Bot
          </button>
        </div>

        {showWebhookSettings && (
          <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-slate-500 font-semibold mb-1">
                Telegram Bot Token (Từ @BotFather)
              </label>
              <input
                type="text"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="VD: 78123456:AAHxyz..."
                className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-semibold mb-1">
                Telegram Group / Driver Chat ID
              </label>
              <input
                type="text"
                value={groupChatId}
                onChange={(e) => setGroupChatId(e.target.value)}
                placeholder="-100238492011"
                className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-slate-900"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  onSaveTelegramConfig(botToken, groupChatId);
                  setShowWebhookSettings(false);
                }}
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                Lưu Kết Nối Telegram & Zalo Webhook
              </button>
            </div>
          </div>
        )}

        {/* Các nút bấm nhanh @Tag Tài Xế */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-blue-600 mr-1 flex items-center gap-1">
              <AtSign className="w-3.5 h-3.5" />
              Bấm để @Tag nhanh tài xế vào lệnh:
            </span>
            {drivers.map((drv) => (
              <button
                key={drv.id}
                type="button"
                onClick={() => handleInsertTag(drv)}
                className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-xs font-medium text-blue-700 transition"
              >
                {drv.telegramUsername} ({drv.fullName})
              </button>
            ))}
          </div>

          <form onSubmit={handleRunAICommand} className="space-y-3">
            <textarea
              rows={2}
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="VD: Đặt xe 7 chỗ ngày mai 7h30 đi Vũng Tàu theo đường cao tốc, giá 3.000.000đ, giao @taixe_minh..."
              className="w-full rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-400"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{livePreview.summaryText}</span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedChannel}
                  onChange={(e) =>
                    setSelectedChannel(e.target.value as 'BOTH' | 'TELEGRAM' | 'ZALO')
                  }
                  className="h-10 rounded-full bg-slate-100 border-0 px-4 text-sm font-medium text-slate-900"
                >
                  <option value="BOTH">Bắn qua cả Zalo + Telegram</option>
                  <option value="TELEGRAM">Chỉ bắn qua Telegram Bot</option>
                  <option value="ZALO">Chỉ bắn qua Zalo OA</option>
                </select>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
                >
                  <Send className="w-4 h-4" />
                  Tạo Lịch & Gửi Thông Báo @Tag
                </button>
              </div>
            </div>
          </form>

          {/* Gợi ý câu lệnh mẫu */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs text-blue-600">Mẫu lệnh thử nhanh:</span>
            {SAMPLE_PROMPTS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCommandInput(sample)}
                className="text-xs px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/15 text-blue-600 border border-white/10 transition truncate max-w-xs"
              >
                Mẫu #{idx + 1}: {sample.slice(0, 46)}...
              </button>
            ))}
          </div>

          {lastAiFeedback && (
            <div className="p-3 rounded-xl bg-emerald-50 text-xs font-medium text-emerald-700">
              {lastAiFeedback}
            </div>
          )}
        </div>
      </div>

      {/* 2. Mô Phỏng Tương Tác 2 Chiều Trên Zalo & Telegram Của Tài Xế */}
      <div className={isMobile ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-1 lg:grid-cols-2 gap-6'}>
        {/* Cột Trái: Thao tác Xác nhận Lịch & Tag Chuyển Tài Xế Khác */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-white text-slate-900 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Màn Hình Tương Tác Của Tài Xế Trên Zalo & Telegram
              </h3>
              <p className="text-xs text-slate-500">
                Tài xế bấm Xác nhận lịch, hoặc @Tag tài xế khác nhận thay, hoặc báo nhanh phí đậu xe / phí phạt
              </p>
            </div>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto max-h-[600px]">
            {trips.slice(0, 6).map((trip) => {
              const drv = drivers.find((d) => d.id === trip.driverId);
              const veh = vehicles.find((v) => v.id === trip.vehicleId);
              const fin = calculateTripFinancials(trip);
              const targetReassignId =
                reassignTargetByTrip[trip.id] ||
                drivers.find((d) => d.id !== trip.driverId)?.id ||
                drivers[0]?.id;

              return (
                <div
                  key={trip.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-xs font-bold">
                        #{trip.tripCode}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {veh?.seatCategory} • {veh?.brand} {veh?.model}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        trip.status === 'PENDING_CONFIRM'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {trip.status === 'PENDING_CONFIRM'
                        ? 'Chờ tài xế bấm xác nhận Bot'
                        : `Đã xác nhận (${trip.botConfirmedByDriverName || drv?.fullName})`}
                    </span>
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-slate-200 text-xs space-y-1 font-mono text-slate-700">
                    <div className="font-bold text-blue-900">
                      Tin nhắn gửi đến: {drv?.fullName} ({drv?.telegramUsername} | Zalo:{' '}
                      {drv?.zaloPhone})
                    </div>
                    <div>
                      • Hành trình: {trip.pickupLocation} → {trip.dropoffLocation} ({trip.tripDate}{' '}
                      lúc {trip.departureTime})
                    </div>
                    <div>
                      • Tuyến đường:{' '}
                      <strong>
                        {trip.routeType === 'HIGHWAY'
                          ? 'Cao tốc (ETC)'
                          : trip.routeType === 'NATIONAL_ROAD'
                          ? 'Quốc lộ'
                          : 'Kết hợp'}
                      </strong>{' '}
                      — Tự cấn trừ: {formatVND(fin.totalAutoDeducted)}
                    </div>
                    <div>
                      • Tổng thu: {formatVND(fin.grossRevenue)} | Đậu xe: {formatVND(fin.parkingFee)}{' '}
                      | Phạt: {formatVND(fin.trafficFineFee)} →{' '}
                      <strong className="text-emerald-700">
                        Thực còn: {formatVND(fin.netRemainingToAccount)}
                      </strong>
                    </div>
                  </div>

                  {/* Nút bấm tương tác trên Telegram / Zalo của Tài xế */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onDriverConfirmTrip(trip.id, 'TELEGRAM')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Xác Nhận Qua Telegram
                    </button>
                    <button
                      type="button"
                      onClick={() => onDriverConfirmTrip(trip.id, 'ZALO')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Xác Nhận Qua Zalo
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onBotQuickAddRisk(
                          trip.id,
                          'PARKING',
                          50000,
                          'Tài xế báo vé đậu xe qua Bot Zalo/Telegram'
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition"
                    >
                      <ParkingCircle className="w-3.5 h-3.5 text-blue-600" />
                      +50k Đậu xe
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onBotQuickAddRisk(
                          trip.id,
                          'FINE',
                          350000,
                          'Tài xế báo biên bản phạt qua Bot Zalo/Telegram'
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-semibold transition"
                    >
                      <FileWarning className="w-3.5 h-3.5 text-rose-600" />
                      +350k Phạt GT
                    </button>
                  </div>

                  {/* Chuyển lịch & @Tag tên tài xế khác */}
                  <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                      <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                      Tag chuyển tài xế khác:
                    </span>
                    <select
                      value={targetReassignId}
                      onChange={(e) =>
                        setReassignTargetByTrip((prev) => ({
                          ...prev,
                          [trip.id]: e.target.value,
                        }))
                      }
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold"
                    >
                      {drivers
                        .filter((d) => d.id !== trip.driverId)
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            @{d.fullName} ({d.telegramUsername} • Zalo {d.zaloPhone})
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        onTagReassignDriver(trip.id, targetReassignId, 'TELEGRAM')
                      }
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition"
                    >
                      <RefreshCw className="w-3 h-3" />
                      @Tag & Chuyển Lịch Ngay
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cột Phải: Nhật ký Thông báo Zalo OA & Telegram Bot */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-white text-slate-900 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                Nhật Ký Bot AI Gửi Zalo & Telegram ({botLogs.length} bản ghi)
              </h3>
              <p className="text-xs text-slate-500">
                Lưu vết mọi thông báo xác nhận lịch, @tag tài xế khác và cảnh báo chi phí phạt/đậu xe
              </p>
            </div>
          </div>

          <div className="p-4 space-y-3 overflow-y-auto max-h-[600px]">
            {botLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded font-extrabold text-xs ${
                        log.channel === 'TELEGRAM'
                          ? 'bg-sky-100 text-sky-800 border border-sky-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {log.channel === 'TELEGRAM' ? 'TELEGRAM BOT' : 'ZALO OA'}
                    </span>
                    <span className="font-bold text-slate-900">{log.recipientName}</span>
                    <span className="text-slate-500 text-xs">({log.recipientHandle})</span>
                  </div>
                  <span className="text-xs text-slate-400">{log.timestamp}</span>
                </div>

                <div className="whitespace-pre-line bg-white p-3 rounded-lg border border-slate-200 text-slate-700 leading-relaxed">
                  {log.content}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Mã chuyến: <strong>#{log.tripCode || 'N/A'}</strong>
                  </span>
                  <span
                    className={`font-bold ${
                      log.status === 'DRIVER_CONFIRMED'
                        ? 'text-emerald-700'
                        : log.status === 'DRIVER_BUSY_RETAGGED'
                        ? 'text-indigo-700'
                        : 'text-blue-700'
                    }`}
                  >
                    {log.status === 'DRIVER_CONFIRMED'
                      ? 'Tài xế đã bấm xác nhận'
                      : log.status === 'DRIVER_BUSY_RETAGGED'
                      ? 'Đã @Tag chuyển tài xế khác'
                      : 'Đã gửi thông báo đến điện thoại'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
