import { AUTH_HEADERS, type FetchError, fetch } from '.';

type APIResponse = FetchError | { error: false };

export default class {
  private token: string;
  private proxy: string | undefined;
  /**
   * Create a new settings API instance.
   * @param token Auth token.
   * @param proxy Proxy URL.
   */
  constructor(token: string, proxy?: string) {
    this.token = token;
    this.proxy = proxy;
  }
  /**
   * Set who is allowed to send trade requests to this user.
   * @param state The state to set the trade requests to.
   * - `on` - Anyone can send requests.
   * - `friends` - Only friends can send requests.
   * - `off` - No one can send requests.
   * @returns Whether or not the request was successful.
   */
  async set_trade_requests(state: 'on' | 'friends' | 'off'): Promise<APIResponse> {
    return this.post('requests', { value: state });
  }
  /**
   * Set who is allowed to send friend requests to this user.
   * @param state The state to set the friend requests to.
   * - `on` - Anyone can send requests.
   * - `mutual` - Only friends of friends can send requests.
   * - `off` - No one can send requests.
   * @returns Whether or not the request was successful.
   */
  async set_friend_requests(state: 'on' | 'mutual' | 'off'): Promise<APIResponse> {
    return this.post('friends', { value: state });
  }
  /**
   * Set the color of the user's name. This appears on leaderboards and in chat.
   * @param color The color to set the user's name to.
   * @returns Whether or not the request was successful.
   */
  async set_name_color(color: string): Promise<APIResponse> {
    return this.post('color', { color });
  }
  /**
   * Set the user's username.
   * @param new_username The new username to set.
   * @param password The user's password.
   * @returns Whether or not the request was successful.
   */
  async change_username(new_username: string, password: string): Promise<APIResponse> {
    return this.post('username', { username: new_username, password });
  }
  /**
   * Internal method to make a POST request to the settings API.
   * @param endpoint The endpoint to make the request to.
   * @param data The data to send in the request.
   * @returns The response from the API.
   */
  private async post(endpoint: string, data: Object): Promise<APIResponse> {
    try {
      const res = await fetch(`https://blacket.org/worker/settings/${endpoint}`, {
        headers: AUTH_HEADERS(this.token),
        body: JSON.stringify(data),
        proxy: this.proxy,
        method: 'POST',
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
    } catch (err) {
      return {
        error: true,
        reason: `Fetch Error: ${err}`,
        internal: true,
      };
    }
  }
}
