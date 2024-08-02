import { type FetchError, get } from '.';

type APIResponse =
  | FetchError
  | {
      error: false;
      internalResponseTime: string;
    };

/**
 * Ping the Blacket server.
 * @returns The internal response time if successful, or an error if not.
 */
export default async function (proxy?: string): Promise<APIResponse> {
  return get<APIResponse>('worker', 'ping', null, proxy);
}
