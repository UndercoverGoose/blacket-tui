import { AUTH_HEADERS, type FetchError, fetch } from '.';

type User = {
  id: number;
  username: string;
  role: string;
  color: string;
  avatar: string;
  banner: string;
};

type APIResponse =
  | FetchError
  | {
      error: false;
      friends: User[];
      blocks: User[];
      sending: User[];
      receiving: User[];
    };

/**
 * Get the friends of the user.
 * @param token Auth token.
 * @returns The users friends, blocks, and awaiting requests if successful, or an error if not.
 */
export default async function (token: string): Promise<APIResponse> {
  const res = await fetch('https://blacket.org/worker2/friends', {
    headers: AUTH_HEADERS(token),
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
}
