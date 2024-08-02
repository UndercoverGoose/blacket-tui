import { type FetchError, post } from '.';

type APIResponse =
  | FetchError
  | {
      error: false;
      message: string;
    };

export default async function (token: string, item: string, proxy?: string): Promise<APIResponse> {
  return post<APIResponse>('worker/shop', 'buy', token, proxy, {
    item,
  });
}
