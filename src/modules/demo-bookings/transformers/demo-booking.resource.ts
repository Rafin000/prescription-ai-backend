import { makeTransformer } from 'src/base/base.transformer';
import {
  DemoBookingResource,
  DemoBookingRow,
} from '../types/demo-booking.model';

export const demoBookingResource = makeTransformer<DemoBookingRow, DemoBookingResource>(
  (row) => ({
    id: row.id,
    email: row.email,
    phone: row.phone,
    status: row.status,
    name: row.data?.name ?? null,
    practice: row.data?.practice ?? null,
    preferredSlot: row.data?.preferred_slot ?? null,
    calendlyEventUri: row.data?.calendly_event_uri ?? null,
    createdAt: row.created_at.toISOString(),
  }),
);
