import { ApiError } from '../api/http';

export type FieldErrors<K extends string = string> = Partial<Record<K, string>>;

interface Issue {
  path: readonly PropertyKey[] | string;
  message: string;
}

/** Turns zod issues (client) or API `details` (server) into { field: firstMessage }. */
export function toFieldErrors<K extends string>(issues: readonly Issue[]): FieldErrors<K> {
  const out: FieldErrors<K> = {};
  for (const issue of issues) {
    const key = (Array.isArray(issue.path) ? issue.path.join('.') : String(issue.path)) as K;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

/** Field errors from a server validation response, or {} if it wasn't one. */
export function apiFieldErrors<K extends string>(err: unknown): FieldErrors<K> {
  return err instanceof ApiError && err.status === 400 ? toFieldErrors<K>(err.fieldIssues) : {};
}
