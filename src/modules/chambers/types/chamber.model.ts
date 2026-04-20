export interface ChamberRow {
  id: string;
  team_id: string;
  doctor_id: string;
  lat: number | null;
  lng: number | null;
  area: string | null;
  status: 'active' | 'paused' | 'archived';
  created_at: Date;
  updated_at: Date;
  data: ChamberData;
}

export interface ChamberData {
  name?: string;
  address?: string;
  phone?: string;
  /** Free-form hours label, e.g. "Sat–Thu · 6pm–9pm" */
  time_label?: string;
  /** Structured weekly hours, used by scheduling later. */
  hours?: WeeklyHours;
  photos?: string[];
  amenities?: string[];
}

export interface WeeklyHours {
  mon?: DayHours;
  tue?: DayHours;
  wed?: DayHours;
  thu?: DayHours;
  fri?: DayHours;
  sat?: DayHours;
  sun?: DayHours;
}

export interface DayHours {
  open?: string; // "18:00"
  close?: string; // "21:00"
  closed?: boolean;
}

/** Same shape as ChamberRow but with a computed distance added by the doctor query. */
export interface ChamberRowWithDistance extends ChamberRow {
  distance_km: number | null;
}

export interface ChamberResource {
  id: string;
  doctorId: string;
  lat: number | null;
  lng: number | null;
  area: string | null;
  status: ChamberRow['status'];
  name: string | null;
  address: string | null;
  phone: string | null;
  timeLabel: string | null;
  distanceKm: number | null;
}
