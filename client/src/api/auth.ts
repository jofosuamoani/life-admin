import type { LoginInput, PublicUser, SignupInput } from '@life-admin/shared';
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
};
