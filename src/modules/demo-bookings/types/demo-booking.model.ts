export interface DemoBookingRow {
  id: string;
  email: string;
  phone: string | null;
  status: 'submitted' | 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  client_nonce: string | null;
  created_at: Date;
  updated_at: Date;
  data: DemoBookingData;
}

export interface DemoBookingData {
  name?: string;
  practice?: string;
  specialty?: string;
  preferred_slot?: string;
  calendly_event_uri?: string;
  notes?: string;
}

export interface DemoBookingResource {
  id: string;
  email: string;
  phone: string | null;
  status: DemoBookingRow['status'];
  name: string | null;
  practice: string | null;
  preferredSlot: string | null;
  calendlyEventUri: string | null;
  createdAt: string;
}
