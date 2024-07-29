import { BASE_HEADERS, type FetchError, fetch } from '.';

type APIResponse =
  | FetchError
  | {
      error: false;
    };

export default async function (
  username: string,
  password: string,
  discord: string,
  age: number | string,
  reason: string,
  proxy?: string
): Promise<APIResponse> {
  try {
    const res = await fetch('https://blacket.org/worker/register', {
      headers: BASE_HEADERS,
      body: JSON.stringify({
        username,
        password,
        form: {
          age: age.toString(),
          discord,
          body: reason,
        },
        acceptedToS: true,
      }),
      proxy,
      method: 'POST',
    });
    switch (res.status) {
      case 200: {
        return (await res.json()) as APIResponse;
      }
      default: {
        return {
          error: true,
          reason: `Unexpected status code: ${res.status}.`,
          internal: true,
        };
      }
    }
  } catch (err) {
    return {
      error: true,
      reason: `Fetch Error: ${err}`,
      internal: true,
    };
  }
}
