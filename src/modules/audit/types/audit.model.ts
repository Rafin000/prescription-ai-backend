export interface AuditRow {
  id: string;
  team_id: string;
  actor_user_id: string | null;
  resource_type: string;
  resource_id: string;
  action: string;
  ip: string | null;
  ts: Date;
  prev_hash: string | null;
  data: {
    hash?: string;            // sha256 of prev_hash + payload
    method?: string;
    path?: string;
    request_id?: string;
    user_agent?: string;
    status_code?: number;
    query?: Record<string, unknown>;
    body?: Record<string, unknown>;
  };
}

export interface AuditResource {
  id: string;
  actorUserId: string | null;
  resourceType: string;
  resourceId: string;
  action: string;
  ip: string | null;
  ts: string;
  method?: string;
  path?: string;
  requestId?: string;
  statusCode?: number;
}
