import { AUTH_HEADERS, type FetchError } from '.';

type APIResponse =
  | FetchError
  | {
      error: false;
      message: string;
    };

/**
 * Use an item in the inventory.
 * @param token Auth token.
 * @param item The name of the item to use.
 * @returns If the item was used or not.
 */
export default async function (token: string, item: string): Promise<APIResponse> {
  const res = await fetch('https://blacket.org/worker/use', {
    headers: AUTH_HEADERS(token),
    body: JSON.stringify({
      item,
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
