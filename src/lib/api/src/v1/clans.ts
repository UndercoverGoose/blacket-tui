import { type FetchError, post, get } from '.';

interface SimpleUser {
  id: number;
  username: string;
  color: string;
  avatar: string;
}

interface InternalClan {
  id: number;
  name: string;
  description: string;
  color: string;
  image: string;
  owner: SimpleUser;
  created: number;
  room: number;
  members: SimpleUser[];
  inventory: string;
  investments: {
    level: number;
    users: Record<string, unknown>;
  };
  exp: number;
  shielded: boolean;
  disguised: boolean;
  settings: {
    requests: boolean;
  };
  safe: boolean;
  safe_cooldown: number;
  online: number;
  offline: number;
}

interface PendingRequests {
  id: number;
  name: string;
  description: string;
  color: string;
  image: string;
  created: number;
  exp: number;
  owner: SimpleUser;
  members: SimpleUser[];
  safe: boolean;
  online: number;
  offline: number;
  accepted: boolean;
}

type APIResponse = FetchError | { error: false };
type APIResponse_Item = FetchError | { error: false; item: string };
type APIResponse_InternalClan = FetchError | { error: false; clan: InternalClan };
type APIResponse_PendingReqs = FetchError | { error: false; requests: SimpleUser[] };
type APIResponse_AcceptedReqs = FetchError | { error: false; clans: PendingRequests[] };
type APIResponse_ClanCreate = FetchError | { error: false; clan: number };

export default class {
  private token: string;
  private _proxy?: string;
  private _once_proxy?: string;
  get proxy() {
    if (this._once_proxy) {
      const proxy = this._once_proxy;
      this._once_proxy = undefined;
      return proxy;
    }
    return this._proxy;
  }
  /**
   * Create a new clans API instance.
   * @param token Auth token.
   * @param proxy Proxy URL.
   */
  constructor(token: string, proxy?: string) {
    this.token = token;
    this._proxy = proxy;
  }
  /**
   * Define a proxy URL to use for a single request.
   * @param proxy The proxy URL.
   * @returns The API instance for chaining.
   */
  once(proxy?: string) {
    this._once_proxy = proxy;
    return this;
  }
  /**
   * Join a clan that has accepted the user's request.
   * @param clan_id The ID of the clan to join.
   * @returns Whether or not the request was successful.
   */
  async join(clan_id: number | string): Promise<APIResponse> {
    return this.post('join', { clan: Number(clan_id) });
  }
  /**
   * Kick a user from the clan. The authenticated user must be the owner of the clan.
   * @param user_id The ID of the user to kick.
   * @returns Whether or not the request was successful.
   */
  async kick(user_id: number | string): Promise<APIResponse> {
    return this.post('kick', { user: Number(user_id) });
  }
  /**
   * Get the information of the clan one is currently in.
   * @returns The clan information if successful, otherwise an error if not.
   */
  async me(): Promise<APIResponse_InternalClan> {
    return this.get();
  }
  /**
   * Request to join a clan.
   * @param clan_id The ID of the clan to join.
   * @returns Whether or not the request was successful.
   */
  async request_join(clan_id: number | string): Promise<APIResponse> {
    return this.post('requests/send', { clan: Number(clan_id) });
  }
  /**
   * Get the pending requests to join the clan. The authenticated user must be the owner of the clan.
   * @returns The pending requests if successful, otherwise an error if not.
   */
  async pending_join_requests(): Promise<APIResponse_PendingReqs> {
    return this.get<APIResponse_PendingReqs>('requests/pending');
  }
  /**
   * Accept the request of someone to join your clan. The authenticated user most be the owner of the clan.
   * @param user_id The ID of the user to accept.
   * @returns Whether or not the request was successful.
   */
  async request_accept(user_id: number | string): Promise<APIResponse> {
    return this.post('requests/accept', { user: Number(user_id) });
  }
  /**
   * Reject the request of someone to join your clan. The authenticated user most be the owner of the clan.
   * @param user_id The ID of the user to reject.
   * @returns Whether or not the request was successful.
   */
  async request_reject(user_id: number | string): Promise<APIResponse> {
    return this.post('requests/reject', {
      user: Number(user_id),
    });
  }
  /**
   * Get the clans that accepted your request and you can now join.
   * @returns The clans if successful, otherwise an error if not.
   */
  async pending_requests(): Promise<APIResponse_AcceptedReqs> {
    return this.get<APIResponse_AcceptedReqs>('requests/pending/me');
  }
  /**
   * Add an item to the clan's inventory.
   * @param item_id The name of the item to add.
   * @returns The item UUID if successful, otherwise an error if not.
   */
  async inventory_add(item_id: string): Promise<APIResponse_Item> {
    return this.post<APIResponse_Item>('inventory/add', { item: item_id });
  }
  /**
   * Remove an item from the clan's inventory.
   * @param item_uuid The UUID of the item to remove. This is different from the name of the item.
   * @returns Whether or not the request was successful.
   */
  async inventory_remove(item_uuid: string): Promise<APIResponse> {
    return this.post('inventory/remove', { item: item_uuid });
  }
  /**
   * Add tokens to the clan's investment.
   * @param amount The amount of tokens to add.
   * @returns Whether or not the request was successful.
   */
  async investment_add(amount: number): Promise<APIResponse> {
    return this.post('investments/add', { tokens: amount });
  }
  /**
   * Remove tokens from the clan's investment.
   * @param amount The amount of tokens to remove.
   * @returns Whether or not the request was successful.
   */
  async investment_remove(amount: number): Promise<APIResponse> {
    return this.post('investments/remove', { tokens: amount });
  }
  /**
   * Set the name of the clan. The authenticated user must be the owner of the clan.
   * @param new_name The new name of the clan.
   * @returns Whether or not the request was successful.
   */
  async set_name(new_name: string): Promise<APIResponse> {
    return this.post('settings/name', { name: new_name });
  }
  /**
   * Set the description of the clan. The authenticated user must be the owner of the clan.
   * @param new_desc The new description of the clan.
   * @returns Whether or not the request was successful.
   */
  async set_desc(new_desc: string): Promise<APIResponse> {
    return this.post('settings/description', { description: new_desc });
  }
  /**
   * Sets the cover image of the clan. The authenticated user must be the owner of the clan.
   * @param new_image The new image URL.
   * @returns Whether or not the request was successful.
   */
  async set_image(new_image: string): Promise<APIResponse> {
    return this.post('settings/image', { image: new_image });
  }
  /**
   * Reset the name color of the clan. The authenticated user must be the owner of the clan.
   * @returns Whether or not the request was successful.
   */
  async reset_color(): Promise<APIResponse> {
    return this.post('settings/reset-color', {});
  }
  /**
   * Toggle safe mode for the clan. If safe mode is enabled, the clan cannot be attacked but members cannot invest. The authenticated user must be the owner of the clan. There is a 3 day cooldown when switching the state.
   * @returns Whether or not the request was successful.
   */
  async toggle_safemode(): Promise<APIResponse> {
    return this.post('settings/safe-mode', {});
  }
  /**
   * Toggle the requests setting for the clan. If requests are enabled, users can request to join the clan. The authenticated user must be the owner of the clan.
   * @returns Whether or not the request was successful.
   */
  async toggle_requests(): Promise<APIResponse> {
    return this.post('settings/requests', {});
  }
  /**
   * Set the clan's safe mode state. If the clan is already in the state, an error will be returned. The authenticated user must be the owner of the clan.
   * - Note that this method fetches the clan details to check the current state before toggling if necessary.
   * @param state The state to set the safe mode to.
   * @returns Whether or not the request was successful.
   */
  async set_safemode(state: boolean): Promise<APIResponse> {
    const clan = await this.me();
    if (clan.error) return clan;
    if (clan.clan.safe === state) return { error: true, reason: 'Clan safe mode is already set to this state.', internal: true };
    return this.toggle_safemode();
  }
  /**
   * Set the clan's requests state. If the clan is already in the state, an error will be returned. The authenticated user must be the owner of the clan.
   * - Note that this method fetches the clan details to check the current state before toggling if necessary.
   * @param state The state to set the requests to.
   * @returns Whether or not the request was successful.
   */
  async set_requests(state: boolean): Promise<APIResponse> {
    const clan = await this.me();
    if (clan.error) return clan;
    if (clan.clan.settings.requests === state) return { error: true, reason: 'Clan requests setting is already set to this state.', internal: true };
    return this.toggle_requests();
  }
  /**
   * Transfer ownership of the clan to another user. This user must be in the clan already. The authenticated user must be the owner of the clan.
   * @param user_id The ID of the user to transfer ownership to.
   * @param password The password of the authenticated user.
   * @returns Whether or not the request was successful.
   */
  async transfer_ownership(user_id: number | string, password: string): Promise<APIResponse> {
    return this.post('settings/transfer-ownership', {
      user: user_id,
      password,
    });
  }
  /**
   * Leave the clan.
   * @param password The password of the authenticated user.
   * @returns Whether or not the request was successful.
   */
  async leave(password: string): Promise<APIResponse> {
    return this.post('leave', {
      password,
    });
  }
  /**
   * Create a new clan. The authenticated user must have plus and not be in a clan already.
   * @param name The name of the clan.
   * @param description The description of the clan.
   * @param image The image URL of the clan.
   * @returns The clan ID if successful, otherwise an error if not.
   */
  async create(name: string, description: string, image: string): Promise<APIResponse_ClanCreate> {
    return this.post('create', {
      name,
      description,
      image,
    });
  }
  /**
   * Disband the clan. The authenticated user must be the owner of the clan.
   * @param password The password of the authenticated user.
   * @returns Whether or not the request was successful.
   */
  async delete(password: string): Promise<APIResponse> {
    return this.post('settings/disband', {
      password,
    });
  }
  /**
   * Internal method to make a POST request to the clans API.
   * @param endpoint The endpoint to make the request to.
   * @param data The data to send in the request.
   * @returns The response from the API.
   */
  private async post<T = APIResponse>(endpoint: string, data: Object): Promise<T> {
    return post<T>('worker/clans', endpoint, this.token, this.proxy, data);
  }
  /**
   * Internal method to make a GET request to the clans API.
   * @param endpoint The endpoint to make the request to.
   * @returns The response from the API.
   */
  private async get<T = APIResponse>(endpoint = ''): Promise<T> {
    return get<T>('worker/clans', endpoint, this.token, this.proxy);
  }
}
