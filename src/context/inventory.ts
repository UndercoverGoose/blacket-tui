import { type Terminal, Text } from '@lib/tui';
import v1 from '@lib/api';
import Color from '@lib/color';
import Select from '../component/select';

const text = new Text(0, 0, '');
const select = new Select('Select an item to view:', []);
const select2 = new Select('Select an action to perform:', ['[0] Use Item', '[1] List Item']);
const select3 = new Select('', ['[0] Back'], {
  header_func: s => s,
});

export default async function (terminal: Terminal, token: string): Promise<void> {
  main_refetch: while (true) {
    text.text = Color.yellow('Fetching inventory...');
    terminal.push(text);
    const res = await v1.user(token);
    if (res.error) {
      text.text += Color.red(`\nFailed to fetch inventory: ${res.reason}`);
      terminal.write_buffer();
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
          if (res.error) {
            select3.set_question(Color.red(Color.underline('Failed to use item:\n'), res.reason));
            terminal.push(select3.component);
            await select3.response();
            terminal.pop(select3.component);
            continue main;
          }
          select3.set_question(Color.green(Color.underline('Successfully used item!\n'), res.message));
          terminal.push(select3.component);
          await select3.response();
          terminal.pop(select3.component);
          continue main;
        }
      }
    }
  }
  terminal.pop(text, select.component, select3.component);
}
