import { AUTH_HEADERS, type FetchError, fetch } from '.';

type APIResponse =
  | FetchError
  | {
      error: false;
      reward: number;
    };
type TokenReward = {
  error: false;
  reward_index: number;
  tokens: number;
};

/**
 * The corresponding token values for rewards.
 */
const REWARDS = [500, 550, 600, 650, 700, 800, 900, 1000];

export default async function (token: string): Promise<TokenReward | FetchError> {
  const res = await fetch('https://blacket.org/worker/claim', {
    headers: AUTH_HEADERS(token),
    method: 'GET',
  });
  switch (res.status) {
    case 200: {
      const json = (await res.json()) as APIResponse;
      if (json.error) return json;
      return {
        error: false,
        reward_index: json.reward,
        tokens: REWARDS[json.reward - 1],
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
