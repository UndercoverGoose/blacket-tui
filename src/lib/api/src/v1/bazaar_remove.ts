import { AUTH_HEADERS, type FetchError, fetch } from '.';

type APIResponse =
  | FetchError
  | {
      error: false;
      message: string;
    };

export default async function (token: string, id: number, proxy?: string): Promise<APIResponse> {
  try {
    const res = await fetch('https://blacket.org/worker/bazaar/remove', {
      headers: AUTH_HEADERS(token),
      body: JSON.stringify({
        id,
      }),
      proxy,
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
  } catch (err) {
    return {
      error: true,
      reason: `Fetch Error: ${err}`,
      internal: true,
    };
  }
}
