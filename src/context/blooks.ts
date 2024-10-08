import { Text } from '@lib/tui';
import v1 from '@lib/api';
import Color from '@lib/color';
import { Input, Searchable, Select } from '@component/.';
import type { User } from '@lib/api/src/v1/user';
import type { State } from '@ctx/state';
import type { Data } from '@lib/api/src/v1/data';

type BlookList = (keyof User['blooks'])[];

const root_text = new Text(0, 0, '');
const root_select = new Select(
  'Select an option:',
  [
    '-> View All Obtained Blooks ',
    '-> View Obtained by Pack ',
    '-> View Missing Blooks ',
    '-> View Missing by Pack ',
    '-> View All Blooks ',
    '-> Sell All Blooks ',
  ],
  {
    disabled_indexes: [5],
  }
);
const pack_select = new Searchable('Select a pack:', []);
const blook_search = new Searchable('Select a blook:', []);
const action_select = new Select('', ['-> List Blook ', '-> Sell Blook ']);
let mm_input = 1;
const input = new Input('Enter the amount to sell:', {
  default_value: '1',
  valid_func: Color.green,
  invalid_func: Color.red,
  mutate: (v: string) =>
    ` ${v} ` + Color.reset(Color.bright_black(' = ', Color.yellow((Number(v.replaceAll(',', '')) * mm_input).toLocaleString(), ' tokens'), ' ')),
});
const stat_text = new Text(0, 4, '');

export const states = {
  /**
   * Blook manager.
   * @param state The current state.
   */
  root: async (state: State): Promise<void> => {
    root_text.text = Color.yellow('Fetching blooks...');
    state.terminal.push(root_text);
    const data_res = await v1.data(true);
    const user_res = await v1.user(state.token);
    state.terminal.pop(root_text);
    if (user_res.error) return state.notif_section.push_error(user_res.reason);
    if (data_res.error) return state.notif_section.push_error(data_res.reason);
    const data = data_res.data;
    const all_blooks = data.blooks;
    const obtainable_blooks = Object.values(data.packs)
      .map(pack => pack.blooks)
      .flat();
    data.packs['Miscellaneous'] = {
      price: -1,
      color1: '#ffffff',
      color2: '#ffffff',
      image: '',
      blooks: Object.keys(all_blooks).filter(k => !obtainable_blooks.includes(k)),
      hidden: true,
    };
    function rarity_color(rarity: string): string {
      const rarity_info = data.rarities[rarity];
      if (!rarity_info) return '#ffffff';
      return rarity_info.color;
    }
    blook_search.mutate_func = (blook_name: string) => {
      const blook = all_blooks[blook_name];
      const count = user_res.user.blooks[blook_name] ?? 0;
      if (!blook) return blook_name + ` ${count}x`;
      const hex = rarity_color(blook.rarity);
      return Color.hex(hex, '[', blook.rarity, '] ', blook_name, ` ${count}x `);
    };
    while (true) {
      switch (await root_select.response_bind(state.terminal)) {
        case -1:
          return;
        case 0: {
          await states.render_blooks(state, Object.keys(user_res.user.blooks), user_res.user as User, all_blooks);
          break;
        }
        case 1: {
          const packs = Object.keys(data.packs);
          while (true) {
            const pack_name = await states.render_packs(state, packs);
            if (!pack_name) break;
            const pack_blooks = data.packs[pack_name].blooks;
            const obtained = pack_blooks.filter(blook_name => user_res.user.blooks[blook_name]);
            await states.render_blooks(state, obtained, user_res.user as User, all_blooks);
          }
          break;
        }
        case 2: {
          const missing_blooks = Object.keys(all_blooks).filter(blook_name => !user_res.user.blooks[blook_name]);
          await states.render_blooks(state, missing_blooks, user_res.user as User, all_blooks);
          break;
        }
        case 3: {
          const missing_blooks = Object.keys(all_blooks).filter(blook_name => !user_res.user.blooks[blook_name]);
          const missing_packs = Object.keys(data.packs).filter(pack_name => {
            const pack_blooks = data.packs[pack_name].blooks;
            return pack_blooks.some(blook_name => missing_blooks.includes(blook_name));
          });
          while (true) {
            const pack_name = await states.render_packs(state, missing_packs);
            if (!pack_name) break;
            const pack_blooks = data.packs[pack_name].blooks;
            const missing = pack_blooks.filter(blook_name => missing_blooks.includes(blook_name));
            await states.render_blooks(state, missing, user_res.user as User, all_blooks);
          }
          break;
        }
        case 4: {
          await states.render_blooks(state, Object.keys(all_blooks), user_res.user as User, all_blooks);
          break;
        }
      }
    }
  },
  /**
   * Render a list of blooks.
   * @param state The current state.
   * @param blooks The blooks to render.
   * @param user The user object. Passed through for additional information when performing actions.
   * @param raw_blooks The raw blooks object. Passed through for additional information when performing actions.
   */
  render_blooks: async (state: State, blooks: BlookList, user?: User, raw_blooks?: Data['blooks']): Promise<void> => {
    blook_search.set_choices(blooks);
    while (true) {
      const selected_blook = await blook_search.response_bind(state.terminal);
      if (selected_blook === -1) break;
      const blook_name = blooks[selected_blook];
      await states.select_action(state, blook_name, user, raw_blooks);
    }
  },
  /**
   * Render a list of packs.
   * @param state The current state.
   * @param packs The packs to render.
   * @returns The selected pack name.
   */
  render_packs: async (state: State, packs: string[]): Promise<string | void> => {
    pack_select.mutate_func = (pack_name: string) => {
      return ` ${pack_name} `;
    };
    pack_select.set_choices(packs);
    const pack_index = await pack_select.response_bind(state.terminal);
    if (pack_index === -1) return;
    const pack_name = packs[pack_index];
    return pack_name;
  },
  /**
   * Perform an action on a blook.
   * @param state The current state.
   * @param blook_name The name of the blook.
   * @param user The user object. Passed through for additional information when performing actions.
   * @param blooks The raw blooks object. Passed through for additional information when performing actions.
   */
  select_action: async (state: State, blook_name: string, user?: User, blooks?: Data['blooks']): Promise<void> => {
    action_select.set_question(`Select an option to perform on ${Color.bold(blook_name)}:`);
    while (true) {
      switch (await action_select.response_bind(state.terminal)) {
        case -1:
          return;
        case 0: {
          await states.list_blook(state, blook_name, user, blooks);
          break;
        }
        case 1: {
          await states.sell_blook(state, blook_name, user, blooks);
          break;
        }
      }
    }
  },
  /**
   * List a blook.
   * @param state The current state.
   * @param blook_name The name of the blook.
   * @param user The user object.
   * @param blooks The raw blooks object.
   */
  list_blook: async (state: State, blook_name: string, user?: User, blooks?: Data['blooks']): Promise<void> => {
    if (user && blooks) {
      stat_text.text = Color.join(
        Color.yellow(`This blook can be instant sold for ${Color.bold('' + blooks[blook_name].price)} tokens.\n`),
        Color.yellow(`You currently have ${Color.bold(user.blooks[blook_name].toLocaleString())} of this blook.`)
      );
      state.terminal.push(stat_text);
    }
    let exited = false;
    new v1.bazaar(state.token).search(blook_name).then(res => {
      if (res.error) return state.notif_section.push_error(res.reason);
      if (exited) return;
      const cheapest = res.bazaar.filter(b => b.item === blook_name)[0];
      if (!cheapest) stat_text.text += Color.yellow('\nNo listing found on the bazaar.');
      else stat_text.text += Color.yellow(`\nCheapest listing on the bazaar: ${Color.bold(cheapest.price.toLocaleString())} tokens.`);
    });
    const price = await states.get_input(state, `Enter the price to sell ${Color.bold(blook_name)} at:`, 1e9, 1);
    if (!price) {
      state.terminal.pop(stat_text);
      exited = true;
      return;
    }
    const list_res = await new v1.bazaar(state.token).list(blook_name, price);
    if (list_res.error) {
      state.notif_section.push_error(list_res.reason);
      state.terminal.pop(stat_text);
      exited = true;
      return;
    }
    state.notif_section.push_success(`Successfully listed ${Color.bold(blook_name)} for ${Color.bold(price.toLocaleString())} tokens.`);
    if (user) user.blooks[blook_name] -= 1;
    state.terminal.pop(stat_text);
    exited = true;
  },
  /**
   * Sell a blook.
   * @param state The current state.
   * @param blook_name The name of the blook.
   * @param user The user object.
   * @param blooks The raw blooks object.
   */
  sell_blook: async (state: State, blook_name: string, user?: User, blooks?: Data['blooks']): Promise<void> => {
    if (user && blooks) {
      stat_text.text = Color.join(
        Color.yellow(`This blook can be instant sold for ${Color.bold('' + blooks[blook_name].price)} tokens.\n`),
        Color.yellow(`You currently have ${Color.bold(user.blooks[blook_name].toLocaleString())} of this blook.`)
      );
      state.terminal.push(stat_text);
    }
    new v1.bazaar(state.token).search(blook_name).then(res => {
      if (res.error) return state.notif_section.push_error(res.reason);
      const cheapest = res.bazaar.filter(b => b.item === blook_name)[0];
      if (!cheapest) stat_text.text += Color.yellow('\nNo listing found on the bazaar.');
      else stat_text.text += Color.yellow(`\nCheapest listing on the bazaar: ${Color.bold(cheapest.price.toLocaleString())} tokens.`);
    });
    const quantity = await states.get_input(
      state,
      `Enter the amount of ${Color.bold(blook_name)} to sell:`,
      user?.blooks[blook_name] ?? 1e9,
      blooks?.[blook_name]?.price ?? 0
    );
    if (!quantity) {
      state.terminal.pop(stat_text);
      return;
    }
    const sell_res = await v1.sell(state.token, blook_name, quantity);
    if (sell_res.error) {
      state.notif_section.push_error(sell_res.reason);
      state.terminal.pop(stat_text);
      return;
    }
    const sold_for = quantity * (blooks ? blooks[blook_name].price : 0);
    state.notif_section.push_success(
      `Successfully sold ${Color.bold('' + quantity)} ${Color.bold(blook_name)} for ${Color.bold(sold_for.toLocaleString())} tokens.`
    );
    state.tokens.add_tokens(sold_for);
    if (user) user.blooks[blook_name] -= quantity;
    state.terminal.pop(stat_text);
  },
  /**
   * Get a number input from the user.
   * @param state The current state.
   * @param text The question to ask.
   * @param max The maximum value allowed.
   * @param value_multiplier The value to multiply the input by.
   * @returns The number input by the user.
   */
  get_input: async (state: State, text: string, max = 1e9, value_multiplier = 1): Promise<number | void> => {
    mm_input = value_multiplier;
    input.set_question(text);
    input.set_value('');
    input.is_valid = (amount: string) => {
      const num = Number(amount.replaceAll(',', ''));
      return !(isNaN(num) || num.toString().includes('.') || num <= 0 || num > max);
    };
    while (true) {
      const amount = await input.response_bind(state.terminal);
      if (amount === '') return;
      const value = Number(amount.replaceAll(',', ''));
      if (!input.is_valid(amount) || isNaN(value)) {
        state.notif_section.push_error('Invalid value entered.');
        continue;
      }
      return value;
    }
  },
};
