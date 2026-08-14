// Shared response envelope for API routes — not a domain model, just a
// UI/transport-facing shape, which is why it lives outside src/domain.
export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };

export function apiOk<T>(data: T): ApiResponse<T> {
  return { ok: true, data };
}

export function apiError(error: string): ApiResponse<never> {
  return { ok: false, error };
}
