import { FleetDatabase } from '../types/fleet';
import { calculateTripFinancials } from '../utils/calculations';

const ENV_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const ENV_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const savedUrl =
    typeof window !== 'undefined' ? localStorage.getItem('LIUCAR_SUPABASE_URL') || '' : '';
  const savedKey =
    typeof window !== 'undefined' ? localStorage.getItem('LIUCAR_SUPABASE_KEY') || '' : '';
  return {
    url: (ENV_URL || savedUrl).trim().replace(/\/$/, ''),
    anonKey: (ENV_KEY || savedKey).trim(),
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey);
}

export async function loadFromSupabase(): Promise<FleetDatabase | null> {
  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey) return null;

  try {
    const res = await fetch(
      `${url}/rest/v1/fleet_state?id=eq.MAIN_STATE&select=payload`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (Array.isArray(rows) && rows.length > 0 && rows[0]?.payload?.vehicles) {
      return rows[0].payload as FleetDatabase;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveToSupabase(db: FleetDatabase): Promise<boolean> {
  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey) return false;

  const headers = {
    'Content-Type': 'application/json',
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    Prefer: 'resolution=merge-duplicates',
  };

  try {
    // 1. Save full state snapshot for instant app hydration
    const stateRes = await fetch(`${url}/rest/v1/fleet_state`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: 'MAIN_STATE',
        payload: db,
        updated_at: new Date().toISOString(),
      }),
    });

    // 2. Also sync relational tables (tenants, vehicles, drivers, trips) so Supabase Table Editor shows structured rows
    if (db.tenants?.length) {
      await fetch(`${url}/rest/v1/tenants`, {
        method: 'POST',
        headers,
        body: JSON.stringify(
          db.tenants.map((t) => ({
            id: t.id,
            name: t.name,
            short_name: t.shortName,
            tax_code: t.taxCode,
            hotline: t.hotline,
            bank_info: t.bankInfo,
            default_dispatch_fee_percent: t.defaultDispatchFeePercent,
            auto_fuel_deduction_enabled: t.autoFuelDeductionEnabled,
            auto_highway_toll_enabled: t.autoHighwayTollEnabled,
            telegram_bot_token: t.telegramBotToken || '',
            telegram_group_chat_id: t.telegramGroupChatId || '',
            zalo_oa_name: t.zaloOaName || '',
          }))
        ),
      }).catch(() => {});
    }

    if (db.vehicles?.length) {
      await fetch(`${url}/rest/v1/vehicles`, {
        method: 'POST',
        headers,
        body: JSON.stringify(
          db.vehicles.map((v) => ({
            id: v.id,
            tenant_id: v.tenantId,
            plate_number: v.plateNumber,
            brand: v.brand,
            model: v.model,
            vehicle_type: v.vehicleType,
            seat_category: v.seatCategory,
            year: v.year,
            color: v.color,
            service_mode: v.serviceMode,
            daily_rate_self_drive: v.dailyRateSelfDrive,
            fuel_cost_per_km: v.fuelCostPerKm,
            highway_toll_multiplier: v.highwayTollMultiplier,
            status: v.status,
            current_odo_km: v.currentOdoKm,
            inspection_expiry: v.inspectionExpiry,
            insurance_expiry: v.insuranceExpiry,
            notes: v.notes || '',
          }))
        ),
      }).catch(() => {});
    }

    if (db.drivers?.length) {
      await fetch(`${url}/rest/v1/drivers`, {
        method: 'POST',
        headers,
        body: JSON.stringify(
          db.drivers.map((d) => ({
            id: d.id,
            tenant_id: d.tenantId,
            code: d.code,
            full_name: d.fullName,
            phone: d.phone,
            cccd: d.cccd,
            license_number: d.licenseNumber,
            license_class: d.licenseClass,
            license_expiry: d.licenseExpiry,
            experience_years: d.experienceYears,
            address: d.address,
            bank_name: d.bankName,
            bank_account: d.bankAccount,
            telegram_username: d.telegramUsername,
            zalo_phone: d.zaloPhone,
            status: d.status,
            base_commission_percent: d.baseCommissionPercent,
            notes: d.notes || '',
          }))
        ),
      }).catch(() => {});
    }

    if (db.trips?.length) {
      await fetch(`${url}/rest/v1/trips`, {
        method: 'POST',
        headers,
        body: JSON.stringify(
          db.trips.map((tr) => {
            const fin = calculateTripFinancials(tr);
            return {
              id: tr.id,
              tenant_id: tr.tenantId,
              trip_code: tr.tripCode,
              booking_type: tr.bookingType,
              vehicle_id: tr.vehicleId,
              driver_id: tr.driverId,
              tagged_driver_ids: tr.taggedDriverIds,
              customer_name: tr.customerName,
              customer_phone: tr.customerPhone,
              trip_date: tr.tripDate,
              departure_time: tr.departureTime,
              return_time: tr.returnTime,
              pickup_location: tr.pickupLocation,
              dropoff_location: tr.dropoffLocation,
              route_type: tr.routeType,
              route_detail: tr.routeDetail,
              distance_km: tr.distanceKm,
              is_round_trip: tr.isRoundTrip,
              base_fare_revenue: tr.baseFareRevenue,
              surcharge_revenue: tr.surchargeRevenue,
              payment_collected_by: tr.paymentCollectedBy,
              auto_highway_toll: tr.autoHighwayToll,
              auto_fuel_quota: tr.autoFuelQuota,
              auto_dispatch_fee: tr.autoDispatchFee,
              manual_expense_total: tr.manualExpenseTotal,
              manual_expense_note: tr.manualExpenseNote,
              parking_fee: tr.parkingFee,
              parking_note: tr.parkingNote,
              traffic_fine_fee: tr.trafficFineFee,
              traffic_fine_note: tr.trafficFineNote,
              other_risk_fee: tr.otherRiskFee,
              other_risk_note: tr.otherRiskNote,
              net_remaining_to_account: fin.netRemainingToAccount,
              status: tr.status,
              bot_channel: tr.botChannel,
              bot_confirmed_at: tr.botConfirmedAt || '',
              bot_confirmed_by_driver_name: tr.botConfirmedByDriverName || '',
              notes: tr.notes || '',
            };
          })
        ),
      }).catch(() => {});
    }

    return stateRes.ok;
  } catch {
    return false;
  }
}
