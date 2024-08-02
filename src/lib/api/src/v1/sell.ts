import { type FetchError, post } from '.';
import { RateLimiter } from './RateLimiter';

type APIResponse =
  | FetchError
  | {
      error: false;
    };

const limit = new RateLimiter(900, true);

export default async function (token: string, blook: string, quantity: number | string, proxy?: string): Promise<APIResponse> {
  await limit.wait();
  const res = await post<APIResponse>('worker', 'sell', token, proxy, {
    blook,
    quantity,
  });
  limit.hit();
  return res;
}
