import { AUTH_HEADERS, type FetchError, fetch } from '.';

export type BazaarItem = {
  id: number;
  item: string;
  price: number;
  seller: string;
  date: number;
};
type APIResponse =
  | FetchError
  | {
      error: false;
      bazaar: BazaarItem[];
    };

/**
 * Get listed bazaar items.
 * @param token Auth token.
 * @param item_id Optional item id or user id to filter by.
 * @returns The bazaar items if successful, or an error if not.
 */
export default async function (token: string, item_id: number | string): Promise<APIResponse> {
  const res = await fetch(`https://blacket.org/worker/bazaar${item_id ? '/?item=' + item_id : ''}`, {
    headers: AUTH_HEADERS(token),
    method: 'GET',
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
