/** CLS keys used across the request lifecycle. */
export const CLS_POOL_CLIENT = 'pg.client';
export const CLS_REQUEST_ID = 'request.id';
export const CLS_USER_ID = 'user.id';
export const CLS_TEAM_ID = 'team.id';

/** Standard role names. Add, never rename. */
export const ROLES = {
  OWNER: 'owner',
  DOCTOR: 'doctor',
  ASSISTANT: 'assistant',
  RECEPTIONIST: 'receptionist',
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];
