import { type Terminal, Text } from '@lib/tui';
import v1 from '@lib/api';
import Color from '@lib/color';
import { Select, Notification } from '@component/.';

const text = new Text(0, 0, '');
const select = new Select('Select an item to view:', []);
const select2 = new Select('Select an action to perform:', ['[0] Use Item', '[1] List Item']);

/**
 * Inventory manager
 * @param terminal Reference to the root terminal
 * @param token The token of the authenticated account
 */
export default async function (terminal: Terminal, token: string, notif_section: Notification): Promise<void> {
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
      select.set_options(options.map(([k, v], idx) => `[${idx}] ${k} x${v} `));
      terminal.push(select.component);
      const _select = await select.response();
      terminal.pop(select.component);
      if (_select === -1) break main_refetch;
      const item = options[_select][0];
      select2.set_question(`Select an action to perform on ${Color.bold(item)}:`);
      terminal.push(select2.component);
      const _select2 = await select2.response();
      terminal.pop(select2.component);
      switch (_select2) {
        case -1:
          continue main;
        case 0: {
          text.text = Color.yellow('Using item...');
          terminal.write_buffer();
          const res = await v1.use(token, item);
          text.text = '';
          if(res.error) notif_section.push_error(res.reason);
          else notif_section.push_success(res.message);
          continue main;
        }
      }
    }
  }
  terminal.pop(text, select.component);
}
