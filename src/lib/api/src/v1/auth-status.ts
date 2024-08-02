import { type FetchError, get } from '.';

type AuthStatusResponse = {
  error: false;
  authed: boolean;
};

/**
 * Checks the auth status of the token.
 * @param token The token to check if authenticated.
 * @returns If the token is authenticated or not.
 */
export default async function (token: string, proxy?: string): Promise<AuthStatusResponse | FetchError> {
  const res = await get<0 | 1 | FetchError>('worker2', 'auth-status', token, proxy);
  if (typeof res === 'number') {
    switch (res) {
      case 0: {
        return {
          error: false,
          authed: false,
        };
      }
      case 1: {
        return {
          error: false,
          authed: true,
        };
      }
      default: {
        return {
          error: true,
          reason: `Unexpected response: ${res}`,
          internal: true,
        };
      }
    }
  }
  return res;
}
