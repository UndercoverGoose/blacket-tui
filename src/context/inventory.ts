import { type Terminal, Text } from '@lib/tui';
import v1 from '@lib/api';
import Color from '@lib/color';
import { Select, Notification, Tokens, Input } from '@component/.';

const text = new Text(0, 0, '');
const select = new Select('Select an item to view:', []);
const select2 = new Select('Select an action to perform:', ['[0] Use Item ', '[1] List Item ']);
const input = new Input('Enter the price to list at:', {
  mutate: (v: string) => ` ${v} ` + Color.reset(Color.bright_black(' = '), Color.yellow(Number(v.replaceAll(',', '')).toLocaleString(), ' tokens')),
});

/**
 * Inventory manager
 * @param terminal Reference to the root terminal
 * @param token The token of the authenticated account
 * @param notif_section The global notification component
 * @param tokens The global tokens component
 */
export default async function (terminal: Terminal, token: string, notif_section: Notification, tokens: Tokens): Promise<void> {
  main_refetch: while (true) {
    text.text = Color.yellow('Fetching inventory...');
    terminal.push(text);
    const res = await v1.user(token);
    if (res.error) {
      notif_section.push_error(res.reason);
      break;
    }
    if (res.is_foreign) throw new Error('User is not allowed to be `is_foreign`');
    text.text = '';
    const inventory = res.user.inventory;
    const inventory_mapped: { [key: string]: number } = {};
    for (const item of inventory) {
      inventory_mapped[item] = (inventory_mapped[item] ?? 0) + 1;
    }
    main: while (true) {
      const options = Object.entries(inventory_mapped);
      if (inventory.length > 0) {
        select.set_options(options.map(([k, v], idx) => `[${idx}] ${k} x${v} `));
        select.set_disabled_indexes([]);
      } else {
        select.set_options([Color.bright_black('No items in inventory.')]);
        select.set_disabled_indexes([0]);
      }
      const _select = await select.response_bind(terminal);
      if (_select === -1) break main_refetch;
      const item = options[_select][0];
      select2.set_question(`Select an action to perform on ${Color.bold(item)}:`);
      const _select2 = await select2.response_bind(terminal);
      switch (_select2) {
        case -1:
          continue main;
        case 0: {
          text.text = Color.yellow('Using item...');
          terminal.write_buffer();
          const res = await v1.use(token, item);
          text.text = '';
          if (res.error) notif_section.push_error(res.reason);
          else notif_section.push_success(res.message);
          continue main;
        }
        case 1: {
          input.set_question(`Enter the price to sell ${Color.bold(item)} at:`);
          input.set_value('');
          input.is_valid = (amount: string) => {
            const num = Number(amount.replaceAll(',', ''));
            return !(isNaN(num) || num.toString().includes('.') || num <= 0 || num >= 1e9);
          };
          const amount = await input.response_bind(terminal);
          if (amount === '') break;
          const tokens = Number(amount.replaceAll(',', ''));
          if (!input.is_valid(amount) || isNaN(tokens)) {
            notif_section.push_error('Invalid amount of tokens entered.');
            break;
          }
          text.text = Color.yellow('Listing item...');
          terminal.write_buffer();
          const res = await v1.list(token, item, tokens);
          text.text = '';
          if (res.error) notif_section.push_error(res.reason);
          else notif_section.push_success(`Successfully listed ${Color.bold(item)} for ${Color.bold('' + tokens)} tokens.`);
          inventory_mapped[item] -= 1;
          continue main;
        }
      }
    }
  }
  terminal.pop(text, select.component);
}
