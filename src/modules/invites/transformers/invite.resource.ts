import { makeTransformer } from 'src/base/base.transformer';
import { InviteResource, InviteRow } from '../types/invite.model';

type Row = InviteRow & { invited_by_name?: string | null };

export const inviteResource = makeTransformer<Row, InviteResource>((row) => ({
  id: row.id,
  teamId: row.team_id,
  email: row.email,
  role: row.role,
  status: row.status,
  invitedBy: row.invited_by,
  invitedByName: row.invited_by_name ?? undefined,
  token: row.token,
  createdAt: row.created_at.toISOString(),
  expiresAt: row.expires_at.toISOString(),
  acceptedAt: row.accepted_at?.toISOString(),
}));
