import { makeTransformer } from 'src/base/base.transformer';
import { AuditResource, AuditRow } from '../types/audit.model';

export const auditResource = makeTransformer<AuditRow, AuditResource>((row) => ({
  id: row.id,
  actorUserId: row.actor_user_id,
  resourceType: row.resource_type,
  resourceId: row.resource_id,
  action: row.action,
  ip: row.ip,
  ts: row.ts.toISOString(),
  method: row.data?.method,
  path: row.data?.path,
  requestId: row.data?.request_id,
  statusCode: row.data?.status_code,
}));
