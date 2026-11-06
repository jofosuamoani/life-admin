/** Thin fetch wrapper that normalises JSON and error handling. */
import type { RateLimitDetails } from '@life-admin/shared';

export interface FieldIssue {
  path: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    /** HTTP status, or 0 when the server couldn't be reached at all. */
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Field-level validation issues from a 400 response, if any. */
  get fieldIssues(): FieldIssue[] {
    return Array.isArray(this.details) ? (this.details as FieldIssue[]) : [];
  }

  /** Reason and wait time from a 429 response, if any. */
  get rateLimit(): RateLimitDetails | null {
    const d = this.details as Partial<RateLimitDetails> | undefined;
    return this.status === 429 && typeof d?.reason === 'string' && typeof d.retryAfterSeconds === 'number'
      ? { reason: d.reason, retryAfterSeconds: d.retryAfterSeconds }
      : null;
  }
}

export const NETWORK_ERROR_MESSAGE = "Can't reach Life Admin right now. Check your connection and try again.";

/** Human-readable message for any thrown error. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof ApiError) {
    if (err.status >= 500) return fallback;
    return err.message || fallback;
  }
  return fallback;
}

// The API is served from the same origin (via the Vite proxy in dev), so the
// HttpOnly session cookie is sent automatically with credentials: 'same-origin'.
// `?.` keeps this module importable outside Vite (e.g. unit tests run with Node).
const BASE_URL = import.meta.env?.VITE_API_BASE_URL ?? '/api';

let onUnauthorized: (() => void) | null = null;

/** Called when a non-auth request gets 401 (e.g. the session expired). */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...init.headers },
    });
  } catch {
    // fetch only rejects on network failure (offline, server down, CORS).
    throw new ApiError(0, NETWORK_ERROR_MESSAGE);
  }

  if (res.status === 401 && !path.startsWith('/auth/')) onUnauthorized?.();

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, body?.error ?? `Request failed (${res.status})`, body?.details);
  }
  return body as T;
}
