import v1 from '@lib/api';
import Color from '@lib/color';
import { Select, Input } from '@component/.';
import { can_claim, claim_in_formatted } from '@util/claim';
import type { User, UserForeign } from '@lib/api/src/v1/user';
import type { State } from '@ctx/state';

const root_select_options = ['-> View Another Player ', '-> Manage Friends ', '-> Claim Daily Reward '];
const root_select = new Select('Select an action to perform:', root_select_options, {
  disabled_indexes: [3],
});
const user_input = new Input('Enter the username or id of the player you want to view:', {});
const foreign_select_options = ['-> Send Trade ', '-> View Blooks ', '-> View Clan '];
const foreign_select = new Select('Select an action to perform:', foreign_select_options, {
  disabled_indexes: [0, 3],
});

export const states = {
  /**
   * Root state for the statistics section. This fetches and displays the authenticated user's statistics.
   * @param state The current state object.
   */
  root: async (state: State): Promise<void> => {
    const user_res = await v1.user(state.token);
    if (user_res.error) state.notif_section.push_error(user_res.reason);
    const text = user_res.error ? Color.red('An error occurred.') : await states.generate_stat_text(user_res.user);
    if (!user_res.error) {
      const date = new Date(+(user_res.user as User).claimed * 1000);
      if (can_claim(date)) {
        root_select_options[2] = '-> Claim Daily Reward ';
        root_select.set_disabled_indexes([3]);
      } else {
        root_select_options[2] = `-> Claim Daily Reward (in ${claim_in_formatted(date)})`;
        root_select.set_disabled_indexes([2, 3]);
      }
    } else {
      root_select_options[2] = '-> Claim Daily Reward ';
      root_select.set_disabled_indexes([2, 3]);
    }
    root_select_options[3] = text;
    while (true) {
      switch (await root_select.response_bind(state.terminal)) {
        case -1: {
          return;
        }
        case 0: {
          await states.search_foreign(state);
          break;
        }
        case 1: {
          break;
        }
        case 2: {
          const worked = await states.claim_reward(state);
          if (worked) return await states.root(state);
          break;
        }
      }
    }
  },
  /**
   * Generates a formatted string of a user's statistics.
   * @param user The user object to generate the statistics for.
   * @returns A formatted string of the user's statistics.
   */
  generate_stat_text: async (user: UserForeign): Promise<string> => {
    const data = await v1.data();
    if (data.error) return Color.red('An error occurred.');
    const unlocks = Object.keys(user.blooks).length;
    const max_unlocks = Object.keys(data.data.blooks).length;
    return [
      Color.join(
        Color.reset(Color.bold('[', user.role, '] ')),
        Color.hex(user.color, user.username),
        !user.clan ? ' ' : Color.hex(user.clan.color, ' [', user.clan.name, '] '),
        Color.bright_black('#', user.id.toString())
      ),
      Color.green(Color.bold('Badges: '), user.badges.join(', ')),
      Color.green(Color.bold('Mutual Friends: '), Color.yellow(user.friends.length.toString())),
      Color.green(Color.bold('Joined: '), new Date(user.created * 1000).toLocaleString()),
      Color.green(Color.bold('Last Seen: '), new Date(user.modified * 1000).toLocaleString()),
      Color.bold(Color.green('Tokens: '), Color.yellow(user.tokens.toLocaleString())),
      Color.bold(Color.green('Experience: '), Color.yellow(user.exp.toLocaleString())),
      Color.green(
        Color.bold('Unlocks: ', Color.yellow(unlocks.toString())),
        '/',
        Color.yellow(max_unlocks.toString()),
        ' ',
        ((unlocks / max_unlocks) * 100).toFixed(1),
        '%'
      ),
      Color.bold(Color.green('Packs Opened: '), Color.yellow(user.misc.opened.toLocaleString())),
      Color.bold(Color.green('Messages Sent: '), Color.yellow(user.misc.messages.toLocaleString())),
    ].join('\n');
  },
  /**
   * Claims the daily reward for the authenticated user.
   * @param state The current state object.
   * @returns Whether the claim was successful.
   */
  claim_reward: async (state: State): Promise<boolean> => {
    const claim_res = await v1.claim(state.token);
    if (claim_res.error) {
      state.notif_section.push_error(claim_res.reason);
      return false;
    }
    state.notif_section.push_success(`Received ${Color.bold(claim_res.tokens.toLocaleString())} tokens.`);
    state.tokens.add_tokens(claim_res.tokens);
    return true;
  },
  /**
   * Prompts to search for another user and then views their stats.
   * @param state The current state object.
   */
  search_foreign: async (state: State): Promise<void> => {
    user_input.set_value('');
    const input_res = await user_input.response_bind(state.terminal);
    if (input_res === '') return;
    await states.view_foreign(state, input_res);
  },
  /**
   * Views the statistics of a foreign user.
   * @param state The current state object.
   * @param user The name or id of a user to view the statistics of.
   */
  view_foreign: async (state: State, user: string | number): Promise<void> => {
    const user_res = await v1.user(state.token, user);
    if (user_res.error) {
      state.notif_section.push_error(user_res.reason);
      return;
    }
    const text = await states.generate_stat_text(user_res.user);
    foreign_select_options[3] = text;
    while (true) {
      switch (await foreign_select.response_bind(state.terminal)) {
        case -1: {
          return;
        }
      }
    }
  },
};
