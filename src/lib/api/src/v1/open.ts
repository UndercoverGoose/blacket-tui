import { type FetchError, post } from '.';
import { RateLimiter } from './RateLimiter';

type APIResponse =
  | FetchError
  | {
      error: false;
      blook: string;
      new?: true;
    };

const limit = new RateLimiter(700, true);

export default async function (token: string, pack_name: string, proxy?: string): Promise<APIResponse> {
  await limit.wait();
  const res = await post<APIResponse>('worker3', 'open', token, proxy, {
    pack: pack_name,
  });
  limit.hit();
  return res;
}
