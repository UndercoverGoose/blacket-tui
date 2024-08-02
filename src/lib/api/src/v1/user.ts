import { type FetchError, get } from '.';

export interface UserForeign {
  id: number;
  username: string;
  created: number;
  modified: number;
  avatar: string;
  banner: string;
  badges: string[];
  blooks: Record<string, number>;
  tokens: number;
  clan: {
    id: string;
    name: string;
    color: string;
    room: number;
  } | null;
  role: string;
  color: string;
  exp: number;
  mute: null;
  ban: null;
  misc: {
    opened: number;
    messages: number;
  };
  friends: number[];
}
export interface User extends UserForeign {
  perms: string[];
  inventory: string[];
  blocks: number[];
  claimed: string;
  settings: {
    friends: 'on' | 'mutual' | 'off';
    requests: 'on' | 'friends' | 'off';
  };
  otp: boolean;
  moneySpent: number;
}

type UserResponse = {
  error: false;
} & (
  | {
      is_foreign: true;
      user: UserForeign;
    }
  | {
      is_foreign: false;
      user: User;
    }
);
type APIResponse =
  | FetchError
  | {
      error: false;
      user: User | UserForeign;
    };

let cached_data: UserResponse | null = null;

/**
 * Get yourself or another user's information.
 * @param token Auth token.
 * @param user_id The user to get information for. If not provided, it will get the information for the user associated with the token.
 * @returns The user's information if successful, or an error if not.
 */
export default async function (token: string, user_id: number | string = '', use_cache = false, proxy?: string): Promise<UserResponse | FetchError> {
  if (use_cache && cached_data && !user_id) return cached_data;
  const res = await get<APIResponse>('worker2', `user/${user_id}`, token, proxy);
  if (res.error) return res;
  if (user_id)
    return {
      error: false,
      is_foreign: true,
      user: res.user as UserForeign,
    };
  cached_data = {
    error: false,
    is_foreign: false,
    user: res.user as User,
  };
  return cached_data;
}
