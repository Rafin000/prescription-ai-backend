import { makeTransformer } from 'src/base/base.transformer';
import {
  ChamberResource,
  ChamberRowWithDistance,
} from '../types/chamber.model';

export const chamberResource = makeTransformer<ChamberRowWithDistance, ChamberResource>(
  (row) => ({
    id: row.id,
    doctorId: row.doctor_id,
    lat: row.lat,
    lng: row.lng,
    area: row.area,
    status: row.status,
    name: row.data?.name ?? null,
    address: row.data?.address ?? null,
    phone: row.data?.phone ?? null,
    timeLabel: row.data?.time_label ?? null,
    distanceKm:
      typeof row.distance_km === 'number' ? round(row.distance_km, 2) : null,
  }),
);

function round(n: number, digits: number) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
