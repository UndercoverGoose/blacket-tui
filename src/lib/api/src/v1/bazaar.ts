import { type FetchError, post, get } from '.';

export type BazaarItem = {
  id: number;
  item: string;
  price: number;
  seller: string;
  date: number;
};

type APIResponse = FetchError | { error: false };
type APIResponse_Items = FetchError | { error: false; bazaar: BazaarItem[] };

export default class {
  private token: string;
  private _proxy: string | undefined;
  private _once_proxy: string | undefined;
  get proxy() {
    if (this._once_proxy) {
      const proxy = this._once_proxy;
      this._once_proxy = undefined;
      return proxy;
    }
    return this._proxy;
  }
  /**
   * Create a new bazaar API instance.
   * @param token The API token.
   * @param proxy The proxy URL.
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
   * Search the bazaar for listings.
   * @param query The item name to search for or user ID to search by. Searching by item name is not guaranteed to include only the listings for that item.
   * @returns The bazaar items if successful, or an error if not.
   */
  async search(query?: number | string): Promise<APIResponse_Items> {
    if (!query) return this.get();
    return this.get('?item=' + query);
  }
  /**
   * List an item on the bazaar.
   * @param item The item to list.
   * @param price The price to list the item for.
   * @returns Whether or not the item was successfully listed.
   */
  async list(item: string, price: number | string): Promise<APIResponse> {
    return this.post('list', {
      item,
      price: price.toString(),
    });
  }
  /**
   * Delist an item from the bazaar.
   * @param listing_id The ID of the listing to delist.
   * @returns Whether or not the item was successfully delisted.
   */
  async delist(listing_id: number): Promise<APIResponse> {
    return this.post('remove', {
      id: listing_id,
    });
  }
  /**
   * Buy an item from the bazaar.
   * @param listing_id The ID of the listing to buy.
   * @returns Whether or not the item was successfully purchased.
   */
  async buy(listing_id: number): Promise<APIResponse> {
    return this.post('buy', {
      id: listing_id,
    });
  }
  /**
   * Internal method to make a POST request to the clans API.
   * @param endpoint The endpoint to make the request to.
   * @param data The data to send with the request.
   * @returns The response from the API.
   */
  private async post<T = APIResponse>(endpoint = '', data?: Object): Promise<T> {
    return post<T>('worker/bazaar', endpoint, this.token, this.proxy, data);
  }
  /**
   * Internal method to make a GET request to the clans API.
   * @param endpoint The endpoint to make the request to.
   * @param data The data to send with the request.
   * @returns The response from the API.
   */
  private async get<T = APIResponse>(endpoint = '', data?: Object): Promise<T> {
    return get<T>('worker/bazaar', endpoint, this.token, this.proxy, data);
  }
}
