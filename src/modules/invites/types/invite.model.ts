export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface InviteRow {
  id: string;
  team_id: string;
  email: string;
  role: string;
  token: string;
  status: InviteStatus;
  invited_by: string;
  expires_at: Date;
  accepted_at: Date | null;
  created_at: Date;
  updated_at: Date;
  data: {
    message?: string;
    resent_at?: string;
    accepted_user_id?: string;
  };
}

export interface InviteResource {
  id: string;
  teamId: string;
  email: string;
  role: string;
  status: InviteStatus;
  invitedBy: string;
  invitedByName?: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
}

/** Public-safe shape for the guest accept page. */
export interface PublicInviteResource {
  token: string;
  email: string;
  role: string;
  team: { name: string };
  invitedBy: { name: string };
  expiresAt: string;
  status: InviteStatus;
}
