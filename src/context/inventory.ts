import { type Terminal, Text } from '@lib/tui';
import v1 from '@lib/api';
import Color from '@lib/color';
import { Select, Notification, Tokens } from '@component/.';

const text = new Text(0, 0, '');
const select = new Select('Select an item to view:', []);
const select2 = new Select('Select an action to perform:', ['[0] Use Item ', '[1] List Item ']);

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
      }
    }
  }
  terminal.pop(text, select.component);
}
