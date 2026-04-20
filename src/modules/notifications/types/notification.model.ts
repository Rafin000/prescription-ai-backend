export type NotificationChannel = 'in-app' | 'sms' | 'email' | 'web-push' | 'mobile-push';
export type NotificationStatus =
  | 'pending'
  | 'sent'
  | 'failed'
  | 'bounced'
  | 'skipped'
  | 'read';

export interface NotificationRow {
  id: string;
  team_id: string;
  user_id: string | null;
  kind: string;
  channel: NotificationChannel;
  recipient: string;
  status: NotificationStatus;
  read_at: Date | null;
  dedupe_key: string;
  ts: Date;
  data: {
    title?: string;
    body?: string;
    href?: string;
    severity?: 'info' | 'success' | 'warn' | 'danger';
    template_vars?: Record<string, unknown>;
    subject?: string;
    provider_response?: unknown;
    error?: string;
    actor_id?: string;
  };
}

export interface NotificationResource {
  id: string;
  kind: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  recipient: string;
  title: string;
  body: string;
  href?: string;
  severity: 'info' | 'success' | 'warn' | 'danger';
  read: boolean;
  ts: string;
}
