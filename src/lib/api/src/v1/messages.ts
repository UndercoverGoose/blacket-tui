import { AUTH_HEADERS, type FetchError } from '.';

type Message = {
  message: {
    id: number;
    user: number;
    room: number;
    content: string;
    mentions: string[];
    edited: {
      edited: boolean;
      previous: string[];
    };
    deleted: boolean;
    date: number;
  };
  author: {
    id: number;
    username: string;
    clan: {
      id: string;
      name: string;
      color: string;
    };
    role: string;
    avatar: string;
    banner: string;
    badges: string[];
    color: string;
    exp: number;
    permissions: string[];
  };
  room: {
    id: number;
    name: string;
  };
};
type APIResponse =
  | FetchError
  | {
      error: false;
      messages: Message[];
    };

/**
 * Get message history of a room.
 * @param token Auth token.
 * @param room The room to get messages from.
 * @param count The amount of messages to get.
 * @returns The messages if successful, or an error if not.
 */
export default async function (token: string, room: number | string, count = 250): Promise<APIResponse | FetchError> {
  const res = await fetch(`https://blacket.org/worker2/messages/${room}?limit=${count}`, {
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
