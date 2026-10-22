import { request } from '../utils/request';
import { getApiBaseUrl } from '../utils/config';

export function getShareQrcodeUrl(inviterId?: string): string {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}/api/v1/share/qrcode?inviter_id=${inviterId || ''}`;
}

export function apiAcceptShare(inviter_id: string): Promise<{ rewarded: boolean; message: string }> {
  return request<{ rewarded: boolean; message: string }>({
    url: '/api/v1/share/accept',
    method: 'POST',
    data: { inviter_id }
  });
}
