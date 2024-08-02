import { type FetchError, get } from '.';

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

export default async function (token: string, proxy?: string): Promise<TokenReward | FetchError> {
  const res = await get<APIResponse>('worker', 'claim', token, proxy);
  if (res.error) return res;
  return {
    error: false,
    reward_index: res.reward,
    tokens: REWARDS[res.reward - 1],
  };
}
