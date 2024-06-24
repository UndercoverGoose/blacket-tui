import { AUTH_HEADERS, type FetchError } from '.';

interface UserForeign {
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
interface User extends UserForeign {
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

/**
 * Get yourself or another user's information.
 * @param token Auth token.
 * @param user_id The user to get information for. If not provided, it will get the information for the user associated with the token.
 * @returns The user's information if successful, or an error if not.
 */
export default async function (token: string, user_id: number | string = ''): Promise<UserResponse | FetchError> {
  const res = await fetch(`https://blacket.org/worker2/user/${user_id}`, {
    headers: AUTH_HEADERS(token),
    method: 'GET',
  });
  switch (res.status) {
    case 200: {
      const json = (await res.json()) as APIResponse;
      if (json.error) return json;
      if (user_id) {
        return {
          error: false,
          is_foreign: true,
          user: json.user as UserForeign,
        };
      }
      return {
        error: false,
        is_foreign: false,
        user: json.user as User,
      };
    }
    default: {
      return {
        error: true,
        reason: `Unexpected status code: ${res.status}.`,
        internal: true,
      };
    }
  }
}
