import { type FetchError, get } from '.';

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
export default async function (token: string, room: number | string, count = 250, proxy?: string): Promise<APIResponse> {
  return get<APIResponse>('worker2', `messages/${room}?limit=${count}`, token, proxy);
}
