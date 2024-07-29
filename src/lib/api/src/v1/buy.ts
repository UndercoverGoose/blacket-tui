import { AUTH_HEADERS, type FetchError, fetch } from '.';

type APIResponse =
  | FetchError
  | {
      error: false;
      message: string;
    };

export default async function (token: string, item: string, proxy?: string): Promise<APIResponse> {
  try {
    const res = await fetch('https://blacket.org/worker/shop/buy', {
      headers: AUTH_HEADERS(token),
      body: JSON.stringify({
        item,
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
