import { parseArgs } from 'util';

export const { values } = parseArgs({
  args: Bun.argv,
  options: {
    proxy: {
      short: 'p',
      type: 'string',
    },
  },
  strict: true,
  allowPositionals: true,
});

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

/**
 * Applies a proxy to a URL.
 * @param url The URL to proxy.
 * @returns The proxied URL.
 */
export function fetch(input: URL | RequestInfo, init: FetchRequestInit = {}) {
  return globalThis.fetch(input, {
    proxy: values.proxy,
    ...init,
  });
}

/**
 * Send a POST request to the API.
 * @param base_path The base path to the API.
 * @param endpoint The endpoint to send the request to.
 * @param token The token to authenticate with.
 * @param proxy The proxy to use.
 * @param data The data to send.
 * @returns The response from the API.
 */
export async function post<T>(base_path: string, endpoint: string, token?: string | null, proxy?: string, data?: Object): Promise<T> {
  try {
    const res = await fetch(`https://blacket.org/${base_path}/${endpoint}`, {
      headers: token ? AUTH_HEADERS(token) : BASE_HEADERS,
      body: JSON.stringify(data),
      proxy,
      method: 'POST',
    });
    switch (res.status) {
      case 200: {
        const json = (await res.json()) as T;
        return json;
      }
      default: {
        return {
          error: true,
          reason: `Unexpected status code: ${res.status}.`,
          internal: true,
        } as T;
      }
    }
  } catch (err) {
    return {
      error: true,
      reason: `Fetch Error: ${err}`,
      internal: true,
    } as T;
  }
}

/**
 * Send a GET request to the API.
 * @param base_path The base path to the API.
 * @param endpoint The endpoint to send the request to.
 * @param token The token to authenticate with.
 * @param proxy The proxy to use.
 * @param data The data to send.
 * @returns The response from the API.
 */
export async function get<T>(base_path: string, endpoint: string, token?: string | null, proxy?: string, data?: Object): Promise<T> {
  try {
    const res = await fetch(`https://blacket.org/${base_path}/${endpoint}`, {
      headers: token ? AUTH_HEADERS(token) : BASE_HEADERS,
      proxy,
      body: JSON.stringify(data),
    });
    switch (res.status) {
      case 200: {
        const json = (await res.json()) as T;
        return json;
      }
      default: {
        return {
          error: true,
          reason: `Unexpected status code: ${res.status}.`,
          internal: true,
        } as T;
      }
    }
  } catch (err) {
    return {
      error: true,
      reason: `Fetch Error: ${err}`,
      internal: true,
    } as T;
  }
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
import sell from './sell';
import register from './register';
import settings from './settings';

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
  buy,
  sell,
  register,
  settings,
};
