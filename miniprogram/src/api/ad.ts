import { request } from '../utils/request';

export function apiRewardCallback(trans_id: string, user_id: string): Promise<any> {
  return request({
    url: '/api/v1/ad/reward-callback',
    method: 'POST',
    data: {
      trans_id,
      user_id
    }
  });
}
