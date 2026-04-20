/** CLS keys used across the request lifecycle. */
export const CLS_POOL_CLIENT = 'pg.client';
export const CLS_REQUEST_ID = 'request.id';
export const CLS_USER_ID = 'user.id';
export const CLS_TEAM_ID = 'team.id';

/** Baked-in role names. Custom roles (any string) are allowed at runtime. */
export const ROLES = {
  OWNER: 'admin',          // workspace owner
  DOCTOR: 'doctor',
  ASSISTANT: 'assistant',
  RECEPTIONIST: 'receptionist',
} as const;
export type Role = string;
