import { AUTH_HEADERS, type FetchError, fetch } from '.';

type APIResponse =
  | FetchError
  | {
      error: false;
    };

export default async function (token: string, item: string, price: number | string, proxy?: string): Promise<APIResponse> {
  try {
    const res = await fetch('https://blacket.org/worker/bazaar/list', {
      headers: AUTH_HEADERS(token),
      body: JSON.stringify({
        item,
        price: price.toString(),
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
