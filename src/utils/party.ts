import { Driver, Vehicle } from '../types/fleet';

// So khớp biển số bất kể dấu chấm, gạch, khoảng trắng, chữ hoa/thường
export const normalizePlate = (plate: string) => (plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export const isVehicleOwner = (d?: Driver) => d?.partyType === 'VEHICLE_OWNER';

// Danh sách biển số của chủ xe (đọc cả trường cũ một biển số)
export const ownerPlates = (d?: Driver): string[] =>
  (d?.ownedPlateNumbers?.length ? d.ownedPlateNumbers : d?.ownedPlateNumber ? [d.ownedPlateNumber] : []).filter(
    Boolean
  );

// Hồ sơ chủ xe này có phải chủ của chiếc xe đó không (theo biển số)
export const ownsVehicle = (d: Driver | undefined, v: Vehicle | undefined) =>
  !!d &&
  !!v &&
  isVehicleOwner(d) &&
  ownerPlates(d).some((p) => normalizePlate(p) === normalizePlate(v.plateNumber));
