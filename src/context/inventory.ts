import { Text } from '@lib/tui';
import v1 from '@lib/api';
import Color from '@lib/color';
import { Select, Input } from '@component/.';
import type { State } from '@ctx/state';

const status_text = new Text(0, 0, '');
const item_select = new Select('Select an item to view:', []);
const action_select = new Select('Select an action to perform:', ['[0] Use Item ', '[1] List Item ']);
const list_input = new Input('Enter the price to list at:', {
  mutate: (v: string) => ` ${v} ` + Color.reset(Color.bright_black(' = '), Color.yellow(Number(v.replaceAll(',', '')).toLocaleString(), ' tokens')),
});

export const states = {
  /**
   * Inventory manager.
   * @param state The current state.
   */
  root: async (state: State): Promise<void> => {
    status_text.text = Color.yellow('Fetching inventory...');
    state.terminal.push(status_text);
    const user_res = await v1.user(state.token);
    if (user_res.error) {
      state.notif_section.push_error(user_res.reason);
      state.terminal.pop(status_text);
      return;
    }
    if (user_res.is_foreign) throw new Error('User is not allowed to be `is_foreign`');
    status_text.text = '';
    while (true) {
      const inventory = user_res.user.inventory;
      const inventory_mapped: Record<string, number> = {};
      for (const item of inventory) inventory_mapped[item] = (inventory_mapped[item] ?? 0) + 1;
      const options = Object.entries(inventory_mapped);
      if (inventory.length > 0) {
        item_select.set_options(options.map(([k, v], idx) => `[${idx}] ${k} x${v} `));
        item_select.set_disabled_indexes([]);
      } else {
        item_select.set_options([Color.bright_black('No items in inventory.')]);
        item_select.set_disabled_indexes([0]);
      }
      const item_index = await item_select.response_bind(state.terminal);
      if (item_index === -1) {
        state.terminal.pop(status_text);
        return;
      }
      const item_name = options[item_index][0];
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
    action_select.set_question(`Select an action to perform on ${Color.bold(item_name)}:`);
    switch (await action_select.response_bind(state.terminal)) {
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
    status_text.text = Color.yellow('Using item...');
    state.terminal.push(status_text);
    const use_res = await v1.use(state.token, item_name);
    status_text.text = '';
    state.terminal.pop(status_text);
    if (use_res.error) state.notif_section.push_error(use_res.reason);
    else {
      state.notif_section.push_success(use_res.message);
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
    list_input.set_question(`Enter the price to sell ${Color.bold(item_name)} at:`);
    list_input.set_value('');
    list_input.is_valid = (amount: string) => {
      const num = Number(amount.replaceAll(',', ''));
      return !(isNaN(num) || num.toString().includes('.') || num <= 0 || num >= 1e9);
    };
    const amount = await list_input.response_bind(state.terminal);
    if (amount === '') return false;
    const tokens = Number(amount.replaceAll(',', ''));
    if (!list_input.is_valid(amount) || isNaN(tokens)) {
      state.notif_section.push_error('Invalid amount of tokens entered.');
      return false;
    }
    status_text.text = Color.yellow('Listing item...');
    state.terminal.push(status_text);
    const list_res = await v1.list(state.token, item_name, tokens);
    status_text.text = '';
    state.terminal.pop(status_text);
    if (list_res.error) state.notif_section.push_error(list_res.reason);
    else {
      state.notif_section.push_success(`Successfully listed ${Color.bold(item_name)} for ${Color.bold('' + tokens)} tokens.`);
      return true;
    }
    return false;
  },
};
