import { type FetchError, get } from '.';

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
  return get<APIResponse>('worker2', 'leaderboard', token, proxy);
}
