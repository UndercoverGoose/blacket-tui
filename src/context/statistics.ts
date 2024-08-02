import { Text } from '@lib/tui';
import v1 from '@lib/api';
import Color from '@lib/color';
import { Select, Input, Searchable } from '@component/.';
import { can_claim, claim_in_formatted } from '@util/claim';
import type { UserForeign } from '@lib/api/src/v1/user';
import type { User as UserFriend } from '@lib/api/src/v1/friends';
import type { Data } from '@lib/api/src/v1/data';
import type { State } from '@ctx/state';

const status_text = new Text(0, 0, '');
const stat_text = new Text(0, 6, '');
const root_select_choices = ['-> View Stats ', '-> Trade Player ', '-> Manage Friends ', '-> Claim Daily Reward '];
const root_select = new Select('Select an action to perform:', root_select_choices, {
  disabled_indexes: [1, 4],
});
const user_input = new Input('Enter the username or ID of the player:', {
  placeholder: 'Username or ID',
});
const friend_search = new Searchable('Select a friend for more options:', []);
const friend_select = new Select('Select an action to perform:', ['-> View Stats ', '-> Send Trade Request ', '-> Unfriend ', '-> Block '], {
  disabled_indexes: [1, 2, 3],
  header_func: s => s,
});

let cached_data: Data | null = null;

function set_stat_text(user: UserForeign) {
  stat_text.text = Color.green(
    Color.underline('User'),
    ': ',
    Color.hex(user.color, user.username),
    !user.clan ? '' : Color.hex(user.clan.color, ' [' + user.clan.name + ']'),
    Color.bright_black(` #${user.id}\n`),
    Color.underline('Joined'),
    `: ${new Date(user.created * 1000).toLocaleString()}\n`,
    Color.underline('Last Seen'),
    `: ${new Date(user.modified * 1000).toLocaleString()}\n`,
    Color.underline('Tokens'),
    ': ',
    Color.bold(Color.yellow(user.tokens.toLocaleString())),
    '\n',
    Color.underline('Experience'),
    ': ',
    Color.bold(Color.yellow(user.exp.toLocaleString())),
    '\n',
    Color.underline('Unlocks'),
    ': ',
    Color.bold(Color.yellow(Object.keys(user.blooks).length.toString())) + `/` + Color.yellow(Object.keys(cached_data?.blooks ?? {}).length.toString()),
    '\n',
    Color.underline('Packs Opened'),
    ': ',
    Color.bold(Color.yellow(user.misc.opened.toLocaleString())),
    '\n',
    Color.underline('Messages Sent'),
    ': ',
    Color.bold(Color.yellow(user.misc.messages.toLocaleString())),
    '\n'
  );
  if (user.clan) {
    root_select_choices[4] = `${'\n'.repeat(10)}[4] View Clan `;
  } else {
    delete root_select_choices[4];
  }
  root_select.set_options(root_select_choices);
}

export const states = {
  /**
   * The root state for the statistics context.
   * @param state The current state.
   */
  root: async (state: State): Promise<void> => {
    status_text.text = Color.yellow('Fetching statistics...');
    state.terminal.push(status_text);
    const user_res = await v1.user(state.token);
    if (!cached_data) {
      const data_res = await v1.data(true);
      if (data_res.error) {
        state.notif_section.push_error(data_res.reason);
        state.terminal.pop(status_text);
        return;
      }
      cached_data = data_res.data;
    }
    if (user_res.error) {
      state.notif_section.push_error(user_res.reason);
      state.terminal.pop(status_text);
      return;
    }
    if (user_res.is_foreign) throw new Error('User is not allowed to be `is_foreign`');
    status_text.text = '';
    const user = user_res.user;
    set_stat_text(user);
    if (can_claim(new Date(+user.claimed * 1000))) root_select.set_disabled_indexes([1, 4]);
    else {
      root_select_choices[3] = `[3] Claim Daily Reward (${claim_in_formatted(new Date(+user.claimed * 1000))})`;
      root_select.set_disabled_indexes([1, 3, 4]);
    }
    while (true) {
      state.terminal.push(stat_text);
      const root_select_index = await root_select.response_bind(state.terminal);
      state.terminal.pop(stat_text);
      switch (root_select_index) {
        case -1:
          return;
        case 0: {
          await states.set_visible_stats(state);
          break;
        }
        case 1: {
          break;
        }
        case 2: {
          const friend = await states.select_friend(state);
          if (!friend) break;
          await states.friend_actions(state, friend);
          break;
        }
        case 3: {
          const claim_res = await v1.claim(state.token);
          if (claim_res.error) state.notif_section.push(Color.red('Daily reward: ', claim_res.reason));
          else {
            state.notif_section.push(Color.green('Claimed ', Color.bold(claim_res.tokens.toLocaleString()), ' tokens from daily reward.'));
            state.tokens.add_tokens(claim_res.tokens);
            root_select.set_disabled_indexes([1, 3, 4]);
          }
          break;
        }
        case 4: {
          break;
        }
      }
    }
  },
  /**
   * Set the visible statistics to a specific user.
   * @param state The current state.
   * @param user_id The user ID to set the statistics to.
   */
  set_visible_stats: async (state: State, user_id?: string | number): Promise<void> => {
    user_input.set_value('');
    const user = user_id ?? (await user_input.response_bind(state.terminal));
    if (user === '') return;
    const user_res = await v1.user(state.token, user);
    if (user_res.error) {
      state.notif_section.push_error(user_res.reason);
      return;
    }
    set_stat_text(user_res.user);
  },
  /**
   * Select a friend to perform an action on.
   * @param state The current state.
   * @returns The friend user object.
   */
  select_friend: async (state: State): Promise<UserFriend | void> => {
    const friends_res = await v1.friends(state.token);
    if (friends_res.error) return state.notif_section.push_error(friends_res.reason);
    const friends_map = friends_res.friends.map(f => f.username);
    friend_search.mutate_func = (friend_name: string) => {
      const friend = friends_res.friends.find(f => f.username === friend_name)!;
      return Color.hex(friend.color, '[', friend.role, '] ', friend.username);
    };
    friend_search.set_choices(friends_map);
    const friend_index = await friend_search.response_bind(state.terminal);
    if (friend_index === -1) return;
    const selected_friend = friends_res.friends[friend_index];
    return selected_friend;
  },
  /**
   * Perform an action on a friend.
   * @param state The current state.
   * @param selected_friend The selected friend to perform an action on.
   */
  friend_actions: async (state: State, selected_friend: UserFriend): Promise<void> => {
    friend_select.set_question(
      Color.join(
        Color.green(Color.underline('Select an action to perform on'), ' '),
        Color.hex(selected_friend.color, '[', selected_friend.role, '] ', selected_friend.username)
      )
    );
    main: while (true) {
      switch (await friend_select.response_bind(state.terminal)) {
        case -1: {
          break main;
        }
        case 0: {
          const user_res = await v1.user(state.token, selected_friend.id);
          if (user_res.error) {
            state.notif_section.push_error(user_res.reason);
            break;
          }
          set_stat_text(user_res.user);
          break main;
        }
      }
    }
  },
};
