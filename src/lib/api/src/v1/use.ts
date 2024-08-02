import { type FetchError, post } from '.';

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
export default async function (token: string, item: string, proxy?: string): Promise<APIResponse> {
  return post<APIResponse>('worker', 'use', token, proxy, {
    item,
  });
}
