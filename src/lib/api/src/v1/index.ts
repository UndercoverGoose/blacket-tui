/**
 * The base headers for all API requests. This does not include authentication.
 */
export const BASE_HEADERS = {
  'Content-Type': 'application/json',
};

/**
 * A generic error response. This also includes an internal flag to differentiate between server errors and errors thrown by the program. Errors marked as internal may be caused by errors in connecting to the server.
 */
export type FetchError = { error: true; reason: string; internal?: true };

/**
 * Applies a token to the base headers.
 * @param token The token to include.
 * @returns The headers with the token included.
 */
export function AUTH_HEADERS(token: string) {
  return {
    ...BASE_HEADERS,
    Cookie: `token=${token}`,
  };
}

import auth_status from './auth-status';
import bazaar from './bazaar';
import claim from './claim';
import data from './data';
import friends from './friends';
import leaderboard from './leaderboard';
import login from './login';
import messages from './messages';
import ping from './ping';
import user from './user';
import use from './use';
import open from './open';
import buy from './buy';

export default {
  auth_status,
  bazaar,
  claim,
  data,
  friends,
  leaderboard,
  login,
  messages,
  ping,
  user,
  use,
  open,
  buy
};
