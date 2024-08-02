import { type FetchError, post } from '.';

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
  return post<APIResponse>('worker', 'register', null, proxy, {
    username,
    password,
    form: {
      age: age.toString(),
      discord,
      body: reason,
    },
    acceptedToS: true,
  });
}
