import type {
  ChangePasswordInput,
  DeleteAccountInput,
  LoginInput,
  PublicUser,
  SessionInfo,
  SignupInput,
  UpdateProfileInput,
} from '@life-admin/shared';
import { ApiError, request } from './http';

export const authApi = {
  /** The current user, or null if there is no valid session. */
  async me(): Promise<PublicUser | null> {
    try {
      return await request<PublicUser>('/auth/me');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return null;
      throw err;
    }
  },

  signup(input: SignupInput): Promise<PublicUser> {
    return request<PublicUser>('/auth/signup', { method: 'POST', body: JSON.stringify(input) });
  },

  login(input: LoginInput): Promise<PublicUser> {
    return request<PublicUser>('/auth/login', { method: 'POST', body: JSON.stringify(input) });
  },

  logout(): Promise<void> {
    return request<void>('/auth/logout', { method: 'POST' });
  },

  updateProfile(input: UpdateProfileInput): Promise<PublicUser> {
    return request<PublicUser>('/auth/me', { method: 'PATCH', body: JSON.stringify(input) });
  },

  /** Signs out all other devices; this one gets a fresh session cookie. */
  changePassword(input: ChangePasswordInput): Promise<{ otherSessionsEnded: number }> {
    return request('/auth/password', { method: 'PUT', body: JSON.stringify(input) });
  },

  deleteAccount(input: DeleteAccountInput): Promise<void> {
    return request<void>('/auth/me', { method: 'DELETE', body: JSON.stringify(input) });
  },

  sessions(): Promise<SessionInfo[]> {
    return request<SessionInfo[]>('/auth/sessions');
  },

  revokeSession(id: string): Promise<void> {
    return request<void>(`/auth/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  revokeOtherSessions(): Promise<{ ended: number }> {
    return request('/auth/sessions', { method: 'DELETE' });
  },
};
