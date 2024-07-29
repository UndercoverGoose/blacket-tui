import { BASE_HEADERS, type FetchError, fetch } from '.';

type APIResponse =
  | FetchError
  | {
      error: false;
    };
type LoginResponse = {
  error: false;
  token: string;
};

/**
 * Login to Blacket
 * @param username The username to login with.
 * @param password The password to login with.
 * @returns The users token if successful, or an error if not.
 */
export default async function (username: string, password: string, proxy?: string): Promise<LoginResponse | FetchError> {
  const res = await fetch('https://blacket.org/worker/login', {
    headers: BASE_HEADERS,
    body: JSON.stringify({
      username,
      password,
    }),
    proxy,
    method: 'POST',
  });
  switch (res.status) {
    case 200: {
      const json = (await res.json()) as APIResponse;
      if (json.error) return json;
      return {
        error: false,
        token: res.headers.get('set-cookie')!.split(';')[0].slice(6),
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
