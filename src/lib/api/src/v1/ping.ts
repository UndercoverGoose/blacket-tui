import { BASE_HEADERS, type FetchError, fetch } from '.';

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
  try {
    const res = await fetch('https://blacket.org/worker/ping', {
      headers: BASE_HEADERS,
      proxy,
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
  } catch (err) {
    return {
      error: true,
      reason: `Fetch Error: ${err}`,
      internal: true,
    };
  }
}
