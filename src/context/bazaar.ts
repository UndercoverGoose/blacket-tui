import { type Terminal, Text } from '@lib/tui';
import v1 from '@lib/api';
import Color from '@lib/color';
import { Input, Notification, Searchable, Select, Tokens } from '@component/.';
import type { User, UserForeign } from '@lib/api/src/v1/user';
import type { BazaarItem } from '@lib/api/src/v1/bazaar';

const select = new Select('Select an option:', ['[0] View Listings ', '[1] Search for Blook ', '[2] Search for Missing Blook ', '[3] Search by User ']);
const search = new Searchable('Select an item:', []);
const blook_search = new Searchable('Select a blook:', []);
const input = new Input('', {});
const select2 = new Select('Select an action to perform:', ['[0] Request Seller ', '[1] Buy ']);
const info_text = new Text(0, 5, '');
const select3 = new Select('Select an action to perform:', ['[0] Delist ']);

/**
 * Bazaar context
 * @param terminal Reference to the root terminal
 * @param token The token of the authenticated account
 * @param notif_section The global notification component
 * @param tokens The global tokens component
 */
export default async function (terminal: Terminal, token: string, notif_section: Notification, tokens: Tokens): Promise<void> {
  const _user = await v1.user(token, '', true);
  const _data = await v1.data(true);
  if (_user.error) return notif_section.push_error(_user.reason);
  if (_data.error) return notif_section.push_error(_data.reason);
  if (_user.is_foreign) throw new Error('User is not allowed to be `is_foreign`');
  let user = _user.user;
  const data = _data.data;
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
  async function render_bazaar_items(items: BazaarItem[], only_blook?: string): Promise<BazaarItem | null> {
    const items_exact = only_blook ? items.filter(item => item.item === only_blook) : items;
    const item_map = items_exact.map(item => `${item.item} - ${item.price.toLocaleString()} tokens `);
    search.set_choices(item_map);
    const _search = await search.response_bind(terminal);
    if (_search === -1 || items_exact.length === 0) return null;
    return items[_search];
  }
  async function render_buy_item(item: BazaarItem): Promise<void> {
    select2.set_question(`Select an action to perform on ${Color.bold(item.item)}:`);
    info_text.text = Color.yellow(`Seller: ${item.seller}\nPrice: ${Color.bold(item.price.toLocaleString())} tokens`);
    terminal.push(info_text);
    main: while (true) {
      const _select2 = await select2.response_bind(terminal);
      switch (_select2) {
        case -1: {
          break main;
        }
        case 0: {
          const _seller = await v1.user(token, item.seller);
          if (_seller.error) {
            notif_section.push_error(_seller.reason);
            break;
          }
          const seller = _seller.user as UserForeign;
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
          const purchase = await v1.bazaar_buy(token, item.id);
          if (purchase.error) {
            notif_section.push_error(purchase.reason);
            break;
          }
          notif_section.push_success('Blook purchased successfully.');
          tokens.remove_tokens(item.price);
          break main;
        }
      }
    }
    terminal.pop(info_text);
  }
  main: while (true) {
    const _select = await select.response_bind(terminal);
    switch (_select) {
      case -1:
        break main;
      case 0: {
        const listings = await v1.bazaar(token, user.id);
        if (listings.error) {
          notif_section.push_error(listings.reason);
          break;
        }
        const selected_item = await render_bazaar_items(listings.bazaar);
        if (selected_item) {
          select3.set_question(`Select an action to perform on ${Color.bold(selected_item.item)}:`);
          info_text.text = Color.yellow(`Seller: ${selected_item.seller}\nPrice: ${Color.bold(selected_item.price.toLocaleString())} tokens`);
          terminal.push(info_text);
          const _select3 = await select3.response_bind(terminal);
          terminal.pop(info_text);
          switch (_select3) {
            case -1: {
              break;
            }
            case 0: {
              const delist = await v1.bazaar_remove(token, selected_item.id);
              if (delist.error) {
                notif_section.push_error(delist.reason);
                break;
              }
              notif_section.push_success('Item delisted successfully.');
              break;
            }
          }
        }
        break;
      }
      case 1: {
        const blooks_map = Object.keys(data.blooks);
        blook_search.set_choices(blooks_map);
        const blook_index = await blook_search.response_bind(terminal);
        if (blook_index === -1) break;
        const blook_name = blooks_map[blook_index];
        const selected_blook = data.blooks[blook_name];
        const listings = await v1.bazaar(token, blook_name);
        if (listings.error) {
          notif_section.push_error(listings.reason);
          break;
        }
        const selected_item = await render_bazaar_items(listings.bazaar, blook_name);
        if (selected_item) await render_buy_item(selected_item);
        break;
      }
      case 2: {
        sub: while (true) {
          const _user = await v1.user(token);
          if (_user.error) {
            notif_section.push_error(_user.reason);
            break sub;
          }
          user = _user.user as User;
          const user_blooks = Object.keys(user.blooks);
          const missing_blooks = Object.keys(data.blooks).filter(blook => !user_blooks.includes(blook));
          blook_search.set_choices(missing_blooks);
          const blook_index = await blook_search.response_bind(terminal);
          if (blook_index === -1) break sub;
          const blook_name = missing_blooks[blook_index];
          const selected_blook = data.blooks[blook_name];
          const listings = await v1.bazaar(token, blook_name);
          if (listings.error) {
            notif_section.push_error(listings.reason);
            continue sub;
          }
          const selected_item = await render_bazaar_items(listings.bazaar, blook_name);
          if (selected_item) await render_buy_item(selected_item);
        }
        break;
      }
      case 3: {
        input.set_question('Enter the user ID or username:');
        input.set_value('');
        const _input = await input.response_bind(terminal);
        if (_input === '') break;
        const _user = await v1.user(token, _input);
        if (_user.error) {
          notif_section.push_error(_user.reason);
          break;
        }
        const id = _user.user.id;
        const listings = await v1.bazaar(token, id);
        if (listings.error) {
          notif_section.push_error(listings.reason);
          break;
        }
        const selected_item = await render_bazaar_items(listings.bazaar);
        if (selected_item) await render_buy_item(selected_item);
        break;
      }
    }
  }
}
