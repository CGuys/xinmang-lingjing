import { request } from '../utils/request';
import type { UserProfile } from '../types';

export function apiGetUserProfile(): Promise<UserProfile> {
  return request<UserProfile>({
    url: '/api/v1/user/profile',
    method: 'GET'
  });
}
