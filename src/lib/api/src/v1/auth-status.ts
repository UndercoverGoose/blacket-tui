import { AUTH_HEADERS, type FetchError } from '.';

type AuthStatusResponse = {
  error: false;
  authed: boolean;
};

/**
 * Checks the auth status of the token.
 * @param token The token to check if authenticated.
 * @returns If the token is authenticated or not.
 */
export default async function (token: string): Promise<AuthStatusResponse | FetchError> {
  const res = await fetch('https://blacket.org/worker2/auth-status', {
    headers: AUTH_HEADERS(token),
    method: 'GET',
  });
  switch (res.status) {
    case 200: {
      const num = Number(await res.text());
      switch (num) {
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
            reason: `Unexpected response: ${num}`,
            internal: true,
          };
        }
      }
    }
    default: {
      return {
        error: true,
        reason: `Unexpected status code: ${res.status}`,
        internal: true,
      };
    }
  }
}
