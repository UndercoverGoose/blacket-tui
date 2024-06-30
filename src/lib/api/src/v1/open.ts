import { AUTH_HEADERS, type FetchError, fetch } from '.';
import { RateLimiter } from './RateLimiter';

type APIResponse =
  | FetchError
  | {
      error: false;
      blook: string;
      new?: true;
    };

const limit = new RateLimiter(750, true);

export default async function (token: string, pack_name: string): Promise<APIResponse> {
  await limit.wait();
  const res = await fetch('https://blacket.org/worker3/open', {
    headers: AUTH_HEADERS(token),
    method: 'POST',
    body: JSON.stringify({ pack: pack_name }),
  });
  limit.hit();
  switch (res.status) {
    case 200: {
      const json = (await res.json()) as APIResponse;
      return json;
    }
    default: {
      return {
        error: true,
        reason: `Unexpected status code: ${res.status}.`,
        internal: true,
      };
    }
  }
}
