import { request } from '../utils/request';

export function apiAcceptShare(inviter_id: string): Promise<{ rewarded: boolean; message: string }> {
  return request<{ rewarded: boolean; message: string }>({
    url: '/api/v1/share/accept',
    method: 'POST',
    data: { inviter_id }
  });
}
