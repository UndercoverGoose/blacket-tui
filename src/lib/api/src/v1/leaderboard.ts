import { AUTH_HEADERS, type FetchError, fetch } from '.';

interface TokenLBUser {
  id: number;
  username: string;
  role: string;
  tokens: number;
  exp: number;
  color: string;
  position: {
    tokens: number;
    exp: number;
  };
}
interface ExpLBUser extends TokenLBUser {
  level: number;
}
type APIResponse =
  | FetchError
  | {
      error: false;
      tokens: TokenLBUser[];
      exp: ExpLBUser[];
      me: {
        tokens: ExpLBUser;
        exp: ExpLBUser;
      };
    };

/**
 * Get the leaderboard for tokens and exp.
 * @param token Auth token.
 * @returns The leaderboard if successful, or an error if not.
 */
export default async function (token: string, proxy?: string): Promise<APIResponse> {
  try {
    const res = await fetch('https://blacket.org/worker2/leaderboard', {
      headers: AUTH_HEADERS(token),
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
