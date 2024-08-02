import { type FetchError, get } from '.';

export type User = {
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
export default async function (token: string, proxy?: string): Promise<APIResponse> {
  return get<APIResponse>('worker2', 'friends', token, proxy);
}
