import { makeTransformer } from 'src/base/base.transformer';
import {
  NotificationResource,
  NotificationRow,
} from '../types/notification.model';

export const notificationResource = makeTransformer<NotificationRow, NotificationResource>(
  (row) => ({
    id: row.id,
    kind: row.kind,
    channel: row.channel,
    status: row.status,
    recipient: row.recipient,
    title: row.data?.title ?? row.kind,
    body: row.data?.body ?? '',
    href: row.data?.href,
    severity: row.data?.severity ?? 'info',
    read: row.status === 'read' || !!row.read_at,
    ts: row.ts.toISOString(),
  }),
);
