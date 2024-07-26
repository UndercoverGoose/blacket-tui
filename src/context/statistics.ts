import { Text } from '@lib/tui';
import v1 from '@lib/api';
import Color from '@lib/color';
import { Select, Input, Searchable } from '@component/.';
import { can_claim, claim_in_formatted } from '@util/claim';
import type { UserForeign } from '@lib/api/src/v1/user';
import type { User as UserFriend } from '@lib/api/src/v1/friends';
import type { Data } from '@lib/api/src/v1/data';
import type { State } from '@ctx/state';

const text = new Text(0, 0, '');
const text2 = new Text(0, 6, '');
const select_choices = ['[0] View Stats ', '[1] Trade Player ', '[2] Manage Friends ', '[3] Claim Daily Reward '];
const select = new Select('Select an action to perform:', select_choices, {
  disabled_indexes: [1, 4],
});
const input = new Input('Enter the username or ID of the player:', {
  placeholder: 'Username or ID',
});
const friends_select = new Searchable('Select a friend for more options:', []);
const select2 = new Select('Select an action to perform:', ['[0] View Stats ', '[1] Send Trade Request ', '[2] Unfriend ', '[3] Block '], {
  disabled_indexes: [1, 2, 3],
  header_func: s => s,
});

let cached_data: Data | null = null;

function set_text_2(user: UserForeign) {
  text2.text = Color.green(
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
    select_choices[4] = `${'\n'.repeat(10)}[4] View Clan `;
  } else {
    delete select_choices[4];
  }
  select.set_options(select_choices);
}

export const states = {
  /**
   * The root state for the statistics context.
   * @param state The current state.
   */
  root: async (state: State): Promise<void> => {
    text.text = Color.yellow('Fetching statistics...');
    state.terminal.push(text);
    const res = await v1.user(state.token);
    if (!cached_data) {
      const _data = await v1.data(true);
      if (_data.error) {
        state.notif_section.push_error(_data.reason);
        state.terminal.pop(text);
        return;
      }
      cached_data = _data.data;
    }
    if (res.error) {
      state.notif_section.push_error(res.reason);
      state.terminal.pop(text);
      return;
    }
    if (res.is_foreign) throw new Error('User is not allowed to be `is_foreign`');
    text.text = '';
    const user = res.user;
    set_text_2(user);
    if (can_claim(new Date(+user.claimed * 1000))) select.set_disabled_indexes([1, 4]);
    else {
      select_choices[3] = `[3] Claim Daily Reward (${claim_in_formatted(new Date(+user.claimed * 1000))})`;
      select.set_disabled_indexes([1, 3, 4]);
    }
    while (true) {
      state.terminal.push(text2);
      const _select = await select.response_bind(state.terminal);
      state.terminal.pop(text2);
      switch (_select) {
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
          const res = await v1.claim(state.token);
          if (res.error) state.notif_section.push(Color.red('Daily reward: ', res.reason));
          else {
            state.notif_section.push(Color.green('Claimed ', Color.bold(res.tokens.toLocaleString()), ' tokens from daily reward.'));
            state.tokens.add_tokens(res.tokens);
            select.set_disabled_indexes([1, 3, 4]);
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
    input.set_value('');
    const _input = user_id ?? (await input.response_bind(state.terminal));
    if (_input === '') return;
    const res = await v1.user(state.token, _input);
    if (res.error) {
      state.notif_section.push_error(res.reason);
      return;
    }
    set_text_2(res.user);
    state.terminal.write_buffer();
  },
  /**
   * Select a friend to perform an action on.
   * @param state The current state.
   * @returns The friend user object.
   */
  select_friend: async (state: State): Promise<UserFriend | void> => {
    const friends = await v1.friends(state.token);
    if (friends.error) return state.notif_section.push_error(friends.reason);
    const friends_map = friends.friends.map(f => f.username);
    friends_select.mutate_func = (friend_name: string) => {
      const friend = friends.friends.find(f => f.username === friend_name)!;
      return Color.hex(friend.color, '[', friend.role, '] ', friend.username);
    };
    friends_select.set_choices(friends_map);
    const _select = await friends_select.response_bind(state.terminal);
    if (_select === -1) return;
    const selected_friend = friends.friends[_select];
    return selected_friend;
  },
  /**
   * Perform an action on a friend.
   * @param state The current state.
   * @param selected_friend The selected friend to perform an action on.
   */
  friend_actions: async (state: State, selected_friend: UserFriend): Promise<void> => {
    select2.set_question(
      Color.join(
        Color.green(Color.underline('Select an action to perform on'), ' '),
        Color.hex(selected_friend.color, '[', selected_friend.role, '] ', selected_friend.username)
      )
    );
    main: while (true) {
      const _select2 = await select2.response_bind(state.terminal);
      switch (_select2) {
        case -1: {
          break main;
        }
        case 0: {
          const res2 = await v1.user(state.token, selected_friend.id);
          if (res2.error) {
            state.notif_section.push_error(res2.reason);
            break;
          }
          set_text_2(res2.user);
          break main;
        }
      }
    }
  },
};
