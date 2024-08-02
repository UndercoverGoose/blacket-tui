import { Text } from '@lib/tui';
import v1 from '@lib/api';
import Color from '@lib/color';
import { Input, Searchable, Select } from '@component/.';
import type { UserForeign } from '@lib/api/src/v1/user';
import type { BazaarItem } from '@lib/api/src/v1/bazaar';
import type { State } from '@ctx/state';

const root_select = new Select('Select an option:', [
  '[0] View Listings ',
  '[1] Raw Search',
  '[2] Search for Blook ',
  '[3] Search for Missing Blook ',
  '[4] Search by User ',
]);
const listing_search = new Searchable('Select an item:', []);
const blook_search = new Searchable('Select a blook:', []);
const input = new Input('', {});
const buy_select = new Select('Select an action to perform:', ['[0] Request Seller ', '[1] Buy ']);
const info_text = new Text(0, 5, '');
const delist_select = new Select('Select an action to perform:', ['[0] Delist ']);

export const states = {
  /**
   * Bazaar manager.
   * @param state The current state.
   */
  root: async (state: State): Promise<void> => {
    const user_res = await v1.user(state.token, '', true);
    const data_res = await v1.data(true);
    if (user_res.error) return state.notif_section.push_error(user_res.reason);
    if (data_res.error) return state.notif_section.push_error(data_res.reason);
    if (user_res.is_foreign) throw new Error('User is not allowed to be `is_foreign`');
    let user = user_res.user;
    const data = data_res.data;
    function rarity_color(rarity: string): string {
      const rarity_info = data.rarities[rarity];
      if (!rarity_info) return '#ffffff';
      return rarity_info.color;
    }
    blook_search.mutate_func = (blook_name: string) => {
      const blook = data.blooks[blook_name];
      const count = user.blooks[blook_name] ?? 0;
      if (!blook) return blook_name + ` ${count}x`;
      const hex = rarity_color(blook.rarity);
      return Color.hex(hex, '[', blook.rarity, '] ', blook_name, ` ${count}x `);
    };
    while (true) {
      switch (await root_select.response_bind(state.terminal)) {
        case -1:
          return;
        case 0: {
          await states.search_by_user(state, user.id, true);
          break;
        }
        case 1: {
          await states.raw_search(state);
          break;
        }
        case 2: {
          const blooks_map = Object.keys(data.blooks);
          await states.search_for_blook(state, blooks_map);
          break;
        }
        case 3: {
          const user_blooks = Object.keys(user.blooks);
          const missing_blooks = Object.keys(data.blooks).filter(blook => !user_blooks.includes(blook));
          await states.search_for_blook(state, missing_blooks);
          break;
        }
        case 4: {
          await states.search_by_user(state);
          break;
        }
      }
    }
  },
  /**
   * Search for a blook or item in the bazaar.
   * @param state The current state.
   */
  raw_search: async (state: State): Promise<void> => {
    input.set_question('Enter query to search for:');
    input.set_value('');
    const input_res = await input.response_bind(state.terminal);
    if (input_res === '') return;
    const listings = await new v1.bazaar(state.token).search(input_res);
    if (listings.error) return state.notif_section.push_error(listings.reason);
    await states.view_listings(state, listings.bazaar);
  },
  /**
   * Search for a blook in the bazaar.
   * @param state The current state.
   * @param blook_options The list of blooks to choose from.
   */
  search_for_blook: async (state: State, blook_options: string[]): Promise<void> => {
    blook_search.set_choices(blook_options);
    while (true) {
      const blook_index = await blook_search.response_bind(state.terminal);
      if (blook_index === -1) break;
      const blook_name = blook_options[blook_index];
      const listings = await new v1.bazaar(state.token).search(blook_name);
      if (listings.error) {
        state.notif_section.push_error(listings.reason);
        break;
      }
      await states.view_listings(state, listings.bazaar, false, blook_name);
    }
  },
  /**
   * Search for blooks or items that a specific user has listed in the bazaar.
   * @param state The current state.
   * @param user_id The ID of the user to search for.
   * @param user_is_self Whether the user is the same as the authenticated user.
   */
  search_by_user: async (state: State, user_id?: string | number, user_is_self = false): Promise<void> => {
    if (!user_id) {
      input.set_question('Enter the user ID or username:');
      input.set_value('');
      const input_res = await input.response_bind(state.terminal);
      if (input_res === '') return;
      const user_res = await v1.user(state.token, input_res);
      if (user_res.error) return state.notif_section.push_error(user_res.reason);
      user_id = user_res.user.id;
    }
    const listings = await new v1.bazaar(state.token).search(user_id);
    if (listings.error) return state.notif_section.push_error(listings.reason);
    await states.view_listings(state, listings.bazaar, user_is_self);
  },
  /**
   * Prompt the user to select a blook or item.
   * @param state The current state.
   * @param items The list of items to choose from.
   * @param is_self_listed Whether the items are listed by the user and shouldn't be buyable.
   * @param only_blook Explicit blook to filter for.
   */
  view_listings: async (state: State, items: BazaarItem[], is_self_listed = false, only_blook?: string): Promise<void> => {
    while (true) {
      const items_exact = only_blook ? items.filter(item => item.item === only_blook) : items;
      const item_map = items_exact.map(item => `${item.item} - ${item.price.toLocaleString()} tokens `);
      listing_search.set_choices(item_map);
      const listing_index = await listing_search.response_bind(state.terminal);
      if (listing_index === -1 || items_exact.length === 0) return;
      let removed_id: number | void;
      if (is_self_listed) removed_id = await states.listing_options(state, items[listing_index]);
      else removed_id = await states.buy_options(state, items[listing_index]);
      if (removed_id) items = items.filter(item => item.id !== removed_id);
    }
  },
  /**
   * Prompt the user to select an action to perform on a bazaar item, assuming that the item is listed by the same user and cannot be purchased.
   * @param state The current state.
   * @param item The bazaar item to perform an action on.
   * @returns The ID of the item the action was performed on.
   */
  listing_options: async (state: State, item: BazaarItem): Promise<number | void> => {
    delist_select.set_question(`Select an action to perform on ${Color.bold(item.item)} (${Color.bold(item.price.toLocaleString())}):`);
    switch (await delist_select.response_bind(state.terminal)) {
      case -1:
        return;
      case 0: {
        const delist_res = await new v1.bazaar(state.token).delist(item.id);
        if (delist_res.error) return state.notif_section.push_error(delist_res.reason);
        state.notif_section.push_success('Item delisted successfully.');
        return item.id;
      }
    }
  },
  /**
   * Prompt the user to select an action to perform on a bazaar item, assuming that the item is not listed by the same user and can be purchased.
   * @param state The current state.
   * @param item The bazaar item to perform an action on.
   * @returns The ID of the item the action was performed on.
   */
  buy_options: async (state: State, item: BazaarItem): Promise<number | void> => {
    buy_select.set_question(`Select an action to perform on ${Color.bold(item.item)}:`);
    info_text.text = Color.yellow(`Seller: ${item.seller}\nPrice: ${Color.bold(item.price.toLocaleString())} tokens`);
    state.terminal.push(info_text);
    let purchased: number | undefined;
    main: while (true) {
      switch (await buy_select.response_bind(state.terminal)) {
        case -1:
          break main;
        case 0: {
          const seller_res = await v1.user(state.token, item.seller);
          if (seller_res.error) {
            state.notif_section.push_error(seller_res.reason);
            break;
          }
          const seller = seller_res.user as UserForeign;
          info_text.text += Color.green(
            '\n\nSeller: ',
            Color.bold(`[${seller.role}] `, seller.username),
            ' ',
            Color.bright_black(`(${seller.id})`),
            '\nTokens: ',
            Color.bold(seller.tokens.toLocaleString()),
            ' tokens'
          );
          break;
        }
        case 1: {
          const buy_res = await new v1.bazaar(state.token).buy(item.id);
          if (buy_res.error) {
            state.notif_section.push_error(buy_res.reason);
            break;
          }
          state.notif_section.push_success('Blook purchased successfully.');
          state.tokens.remove_tokens(item.price);
          purchased = item.id;
          break main;
        }
      }
    }
    state.terminal.pop(info_text);
    return purchased;
  },
};
