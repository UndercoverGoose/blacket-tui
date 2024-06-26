import { AUTH_HEADERS, type FetchError } from '.';

type APIResponse =
  | FetchError
  | {
      error: false;
      message: string;
    };

export default async function (token: string, id: number): Promise<APIResponse> {
  const res = await fetch('https://blacket.org/worker/bazaar/remove', {
    headers: AUTH_HEADERS(token),
    body: JSON.stringify({
      id,
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
