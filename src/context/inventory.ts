import { Text } from '@lib/tui';
import v1 from '@lib/api';
import Color from '@lib/color';
import { Select, Input } from '@component/.';
import type { State } from '@ctx/state';

const text = new Text(0, 0, '');
const select = new Select('Select an item to view:', []);
const select2 = new Select('Select an action to perform:', ['[0] Use Item ', '[1] List Item ']);
const input = new Input('Enter the price to list at:', {
  mutate: (v: string) => ` ${v} ` + Color.reset(Color.bright_black(' = '), Color.yellow(Number(v.replaceAll(',', '')).toLocaleString(), ' tokens')),
});

export const states = {
  /**
   * Inventory manager.
   * @param state The current state.
   */
  root: async (state: State): Promise<void> => {
    text.text = Color.yellow('Fetching inventory...');
    state.terminal.push(text);
    const res = await v1.user(state.token);
    if (res.error) {
      state.notif_section.push_error(res.reason);
      state.terminal.pop(text);
      return;
    }
    if (res.is_foreign) throw new Error('User is not allowed to be `is_foreign`');
    text.text = '';
    const inventory = res.user.inventory;
    const inventory_mapped: Record<string, number> = {};
    for (const item of inventory) inventory_mapped[item] = (inventory_mapped[item] ?? 0) + 1;
    while (true) {
      const options = Object.entries(inventory_mapped);
      if (inventory.length > 0) {
        select.set_options(options.map(([k, v], idx) => `[${idx}] ${k} x${v} `));
        select.set_disabled_indexes([]);
      } else {
        select.set_options([Color.bright_black('No items in inventory.')]);
        select.set_disabled_indexes([0]);
      }
      const _select = await select.response_bind(state.terminal);
      if (_select === -1) {
        state.terminal.pop(text);
        return;
      }
      const item_name = options[_select][0];
      const action_performed = await states.select_item(state, item_name);
      if (action_performed) inventory_mapped[item_name] -= 1;
    }
  },
  /**
   * Prompts the user to select an action to perform on the item.
   * @param state The current state.
   * @param item_name The name of the item.
   * @returns Whether an action (list or sell) was performed or not.
   */
  select_item: async (state: State, item_name: string): Promise<boolean> => {
    select2.set_question(`Select an action to perform on ${Color.bold(item_name)}:`);
    const _select2 = await select2.response_bind(state.terminal);
    switch (_select2) {
      case -1: {
        return false;
      }
      case 0: {
        return await states.use_item(state, item_name);
      }
      case 1: {
        return await states.sell_item(state, item_name);
      }
    }
    return false;
  },
  /**
   * Uses the item.
   * @param state The current state.
   * @param item_name The name of the item.
   * @returns Whether the item was used successfully or not.
   */
  use_item: async (state: State, item_name: string): Promise<boolean> => {
    text.text = Color.yellow('Using item...');
    state.terminal.push(text);
    const res = await v1.use(state.token, item_name);
    text.text = '';
    state.terminal.pop(text);
    if (res.error) state.notif_section.push_error(res.reason);
    else {
      state.notif_section.push_success(res.message);
      return true;
    }
    return false;
  },
  /**
   * Prompts the user to enter the price to sell the item at.
   * @param state The current state.
   * @param item_name The name of the item.
   * @returns Whether the item was listed or not.
   */
  sell_item: async (state: State, item_name: string): Promise<boolean> => {
    input.set_question(`Enter the price to sell ${Color.bold(item_name)} at:`);
    input.set_value('');
    input.is_valid = (amount: string) => {
      const num = Number(amount.replaceAll(',', ''));
      return !(isNaN(num) || num.toString().includes('.') || num <= 0 || num >= 1e9);
    };
    const amount = await input.response_bind(state.terminal);
    if (amount === '') return false;
    const tokens = Number(amount.replaceAll(',', ''));
    if (!input.is_valid(amount) || isNaN(tokens)) {
      state.notif_section.push_error('Invalid amount of tokens entered.');
      return false;
    }
    text.text = Color.yellow('Listing item...');
    state.terminal.push(text);
    const res = await v1.list(state.token, item_name, tokens);
    text.text = '';
    state.terminal.pop(text);
    if (res.error) state.notif_section.push_error(res.reason);
    else {
      state.notif_section.push_success(`Successfully listed ${Color.bold(item_name)} for ${Color.bold('' + tokens)} tokens.`);
      return true;
    }
    return false;
  },
};
