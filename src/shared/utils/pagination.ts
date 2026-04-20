export interface PaginationInput {
  limit?: number | string;
  offset?: number | string;
  page?: number | string;
  perPage?: number | string;
}

export interface PaginationMeta {
  totalItems: number;
  totalPages: number;
  perPage: number;
  currentPage: number;
}

export function getPaginationOptions(input: PaginationInput = {}): {
  limit: number;
  offset: number;
} {
  const perPage = clamp(numberOr(input.perPage ?? input.limit, 20), 1, 200);
  const page = Math.max(1, numberOr(input.page, 1));
  const explicitOffset = input.offset !== undefined ? numberOr(input.offset, 0) : null;
  const offset = explicitOffset ?? (page - 1) * perPage;
  return { limit: perPage, offset };
}

export function buildMeta(
  totalItems: number,
  limit: number,
  offset: number,
): PaginationMeta {
  const perPage = Math.max(1, limit);
  return {
    totalItems,
    totalPages: Math.ceil(totalItems / perPage),
    perPage,
    currentPage: Math.floor(offset / perPage) + 1,
  };
}

function numberOr(v: unknown, fallback: number): number {
  const n = typeof v === 'string' ? parseInt(v, 10) : (v as number);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}
