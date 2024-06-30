import { AUTH_HEADERS, type FetchError } from '.';
import { RateLimiter } from './RateLimiter';

type APIResponse =
  | FetchError
  | {
      error: false;
    };

const limit = new RateLimiter(900, true);

export default async function (token: string, blook: string, quantity: number | string): Promise<APIResponse> {
  await limit.wait();
  const res = await fetch('https://blacket.org/worker/sell', {
    headers: AUTH_HEADERS(token),
    body: JSON.stringify({
      blook,
      quantity,
    }),
    method: 'POST',
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
