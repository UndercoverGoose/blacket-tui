import { AUTH_HEADERS, type FetchError } from '.';

type APIResponse =
  | FetchError
  | {
      error: false;
    };

export default async function (token: string, blook: string, quantity: number | string): Promise<APIResponse> {
  const res = await fetch('https://blacket.org/worker/sell', {
    headers: AUTH_HEADERS(token),
    body: JSON.stringify({
      blook,
      quantity,
    }),
    method: 'POST',
  });
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
