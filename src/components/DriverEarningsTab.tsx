import React, { useMemo, useState } from 'react';
import { Driver, Trip, Vehicle } from '../types/fleet';
import { calculateTripFinancials, formatVND } from '../utils/calculations';
import { normalizePlate, ownerPlates, ownsVehicle } from '../utils/party';

interface DriverEarningsTabProps {
  me: Driver | undefined;
  trips: Trip[];
  vehicles: Vehicle[];
  drivers: Driver[];
}

const STATUS_LABELS: Record<Trip['status'], string> = {
  PENDING_CONFIRM: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  IN_PROGRESS: 'Đang chạy',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

const Stat: React.FC<{ label: string; value: string; hint?: string; dark?: boolean }> = ({
  label,
  value,
  hint,
  dark,
}) => (
  <div className={`rounded-2xl p-4 shadow-sm ${dark ? 'bg-slate-900 text-white' : 'bg-white'}`}>
    <div className={`text-xs font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</div>
    <div className="text-xl sm:text-2xl font-semibold tracking-tight mt-1">{value}</div>
    {hint && <div className={`text-xs mt-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{hint}</div>}
  </div>
);

export const DriverEarningsTab: React.FC<DriverEarningsTabProps> = ({
  me,
  trips,
  vehicles,
  drivers,
}) => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const inRange = (t: Trip) =>
    (!dateFrom || t.tripDate >= dateFrom) && (!dateTo || t.tripDate <= dateTo);

  // Tiền công: chuyến có tài xế do chính tài xế này chạy
  const myTrips = useMemo(
    () =>
      trips.filter(
        (t) =>
          me &&
          t.driverId === me.id &&
          t.bookingType === 'WITH_DRIVER' &&
          t.status !== 'CANCELLED' &&
          inRange(t)
      ),
    [trips, me, dateFrom, dateTo]
  );
  const doneTrips = myTrips.filter((t) => t.status === 'COMPLETED');
  const openTrips = myTrips.filter((t) => t.status !== 'COMPLETED');
  const totalPay = doneTrips.reduce((a, t) => a + (Number(t.driverPay) || 0), 0);
  const expectedPay = openTrips.reduce((a, t) => a + (Number(t.driverPay) || 0), 0);

  // Phần chủ xe: doanh thu ghi nhận theo từng xe của mình
  const plates = ownerPlates(me);
  const ownedVehicles = vehicles.filter((v) => ownsVehicle(me, v));
  const unmatchedPlates = plates.filter(
    (p) => !vehicles.some((v) => normalizePlate(v.plateNumber) === normalizePlate(p))
  );

  const driverName = (t: Trip) =>
    t.bookingType === 'SELF_DRIVE'
      ? 'Khách tự lái'
      : drivers.find((d) => d.id === t.driverId)?.fullName || 'Tài xế ngoài danh sách';

  if (!me) {
    return (
      <div className="bg-white rounded-2xl shadow-sm py-16 text-center text-sm text-slate-500">
        Không tìm thấy hồ sơ tài xế của tài khoản này.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Tiền công của tôi</h2>
          <p className="text-sm text-slate-500">
            Tiền công được ghi nhận khi chuyến hoàn thành.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3"
          />
          <span className="text-slate-400">–</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Stat dark label="Tiền công đã ghi nhận" value={formatVND(totalPay)} hint={`${doneTrips.length} chuyến hoàn thành`} />
        <Stat label="Dự kiến (chưa hoàn thành)" value={formatVND(expectedPay)} hint={`${openTrips.length} chuyến`} />
        <Stat label="Tổng cộng dự kiến" value={formatVND(totalPay + expectedPay)} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 text-sm font-semibold">Chuyến tôi chạy</div>
        {myTrips.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">Chưa có chuyến nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="px-4 py-2 font-medium">Chuyến</th>
                  <th className="px-3 py-2 font-medium">Ngày</th>
                  <th className="px-3 py-2 font-medium">Hành trình</th>
                  <th className="px-3 py-2 font-medium">Xe</th>
                  <th className="px-3 py-2 font-medium">Trạng thái</th>
                  <th className="px-4 py-2 font-medium text-right">Tiền công</th>
                </tr>
              </thead>
              <tbody>
                {myTrips.map((t) => {
                  const veh = vehicles.find((v) => v.id === t.vehicleId);
                  return (
                    <tr key={t.id} className="border-t border-slate-100">
                      <td className="px-4 py-2.5 font-medium">#{t.tripCode}</td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {t.tripDate}
                        {t.tripEndDate && t.tripEndDate !== t.tripDate ? ` → ${t.tripEndDate}` : ''}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {t.pickupLocation} → {t.dropoffLocation}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{veh?.plateNumber || '-'}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            t.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {STATUS_LABELS[t.status]}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-semibold ${
                          t.status === 'COMPLETED' ? 'text-slate-900' : 'text-slate-400'
                        }`}
                      >
                        {formatVND(Number(t.driverPay) || 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {me.partyType === 'VEHICLE_OWNER' && (
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Xe của tôi (chủ xe)</h2>
            <p className="text-sm text-slate-500">
              Doanh thu được ghi nhận theo từng xe và theo tên tài xế chạy, chỉ tính chuyến đã hoàn thành.
            </p>
          </div>

          {unmatchedPlates.length > 0 && (
            <p className="text-xs text-amber-600">
              Biển số chưa có trong danh mục xe: {unmatchedPlates.join(', ')}. Liên hệ điều hành để thêm xe.
            </p>
          )}

          {ownedVehicles.map((v) => {
            const vTrips = trips.filter(
              (t) => t.vehicleId === v.id && t.status === 'COMPLETED' && inRange(t)
            );
            const sum = vTrips.reduce(
              (acc, t) => {
                const f = calculateTripFinancials(t);
                return {
                  revenue: acc.revenue + f.grossRevenue,
                  cost: acc.cost + f.totalAllExpenses,
                  net: acc.net + f.netRemainingToAccount,
                };
              },
              { revenue: 0, cost: 0, net: 0 }
            );
            return (
              <div key={v.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold">
                    {v.brand} {v.model}
                    <span className="text-slate-500 font-normal"> · {v.seatCategory}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md border border-slate-300 text-xs font-medium font-mono">
                    {v.plateNumber}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-px bg-slate-200 text-sm">
                  <div className="bg-white px-4 py-3">
                    <div className="text-xs text-slate-500">Doanh thu</div>
                    <div className="font-semibold">{formatVND(sum.revenue)}</div>
                  </div>
                  <div className="bg-white px-4 py-3">
                    <div className="text-xs text-slate-500">Chi phí</div>
                    <div className="font-semibold">{formatVND(sum.cost)}</div>
                  </div>
                  <div className="bg-slate-900 text-white px-4 py-3">
                    <div className="text-xs text-slate-400">Còn lại</div>
                    <div className="font-semibold">{formatVND(sum.net)}</div>
                  </div>
                </div>
                {vTrips.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-500">
                    Chưa có chuyến hoàn thành.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-slate-500">
                          <th className="px-4 py-2 font-medium">Chuyến</th>
                          <th className="px-3 py-2 font-medium">Ngày</th>
                          <th className="px-3 py-2 font-medium">Tài xế</th>
                          <th className="px-3 py-2 font-medium text-right">Doanh thu</th>
                          <th className="px-3 py-2 font-medium text-right">Chi phí</th>
                          <th className="px-4 py-2 font-medium text-right">Còn lại</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vTrips.map((t) => {
                          const f = calculateTripFinancials(t);
                          return (
                            <tr key={t.id} className="border-t border-slate-100">
                              <td className="px-4 py-2.5 font-medium">#{t.tripCode}</td>
                              <td className="px-3 py-2.5 text-slate-600">{t.tripDate}</td>
                              <td className="px-3 py-2.5 text-slate-600">{driverName(t)}</td>
                              <td className="px-3 py-2.5 text-right">{formatVND(f.grossRevenue)}</td>
                              <td className="px-3 py-2.5 text-right">{formatVND(f.totalAllExpenses)}</td>
                              <td className="px-4 py-2.5 text-right font-semibold">
                                {formatVND(f.netRemainingToAccount)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
