import type { State } from '@ctx/state';
import v1 from '@lib/api';
import { Select, Input } from '@component/.';
import { Store } from '@ctx/auth';
import Color from '@lib/color';
import { parse_hex_ansi } from '@lib/color/src/util';

const root_select = new Select(
  'Select an action:',
  ['-> Change Username ', '-> Change Password ', '-> Toggle OTP/2FA ', '-> Trade Requests ', '-> Friend Requests ', '-> Set Name Color '],
  {
    disabled_indexes: [2],
  }
);
const username_input = new Input('Enter a new username:', {
  inline_header: true,
});
const password_input = new Input('', {
  mutate: (v: string) => '*'.repeat(v.length),
});
const trade_request_select = new Select('Select who can send trade requests:', ['-> On (Any) ', '-> Friends ', '-> Off ']);
const friend_request_select = new Select('Select who can send friend requests:', ['-> On (Any) ', '-> Mutual (Friends of Friends) ', '-> Off ']);
let _mutate_username = '';
const hex_input = new Input('Enter a hex color code:', {
  mutate: (v: string) => {
    try {
      parse_hex_ansi(v);
    } catch {
      return Color.reset(`${v} = Invalid Hex Color`);
    }
    return Color.reset(v, ' = ', Color.hex(v, Color.inverse('     ')), ' = ', Color.hex(v, _mutate_username));
  },
});

export const states = {
  /**
   * Settings context.
   * @param state The current state.
   */
  root: async (state: State): Promise<void> => {
    if (!state.user_header.user) return;

    if (state.user_header.user.role === 'Common') root_select.set_disabled_indexes([2, 5]);
    else root_select.set_disabled_indexes([2]);

    while (true) {
      switch (await root_select.response_bind(state.terminal)) {
        case -1: {
          return;
        }
        case 0: {
          await states.change_username(state);
          break;
        }
        case 1: {
          await states.change_password(state);
          break;
        }
        case 3: {
          await states.edit_trade_requests(state);
          break;
        }
        case 4: {
          await states.edit_friend_requests(state);
          break;
        }
        case 5: {
          await states.edit_name_color(state);
          break;
        }
      }
    }
  },
  /**
   * Change the username of the current user.
   * @param state The current state.
   */
  change_username: async (state: State): Promise<void> => {
    if (!state.user_header.user) return;

    const new_username = await username_input.response_bind(state.terminal);
    if (new_username === '') return;
    password_input.set_question('Enter your password:');
    const password = await password_input.response_bind(state.terminal);
    password_input.set_value('');
    if (password === '') return;

    const new_token_res = await v1.login('' + state.user_header.user.id, password);
    if (new_token_res.error) {
      state.notif_section.push_error('Failed to authenticate with the provided password.');
      return;
    }

    const settings = new v1.settings(new_token_res.token);
    const res = await settings.change_username(new_username, password);
    if (res.error) {
      state.notif_section.push_error(res.reason);
      return;
    }
    state.notif_section.push_success('Username updated successfully.');
    if (state.user_header.user) {
      state.user_header.user.username = new_username;
      state.user_header.refresh_display();
    }
    username_input.set_value('');
    password_input.set_value('');
  },
  /**
   * Change the password of the current user.
   * @param state The current state.
   */
  change_password: async (state: State): Promise<void> => {
    if (!state.user_header.user) return;

    password_input.set_question('Enter your old password:');
    const old_password = await password_input.response_bind(state.terminal);
    password_input.set_value('');
    if (old_password === '') return;

    password_input.set_question('Enter your new password:');
    const new_password = await password_input.response_bind(state.terminal);
    password_input.set_value('');
    if (new_password === '') return;

    const id = state.user_header.user.id.toString();
    const new_token_res = await v1.login(id, old_password);
    if (new_token_res.error) {
      state.notif_section.push_error('Failed to authenticate with the provided old password.');
      return;
    }

    const settings = new v1.settings(new_token_res.token);
    const res = await settings.change_password(old_password, new_password);
    if (res.error) {
      state.notif_section.push_error(res.reason);
      return;
    }
    state.notif_section.push_success('Password updated successfully.');
    if (Store[id].type === 'token') {
      Store[id] = {
        type: 'credential',
        username: state.user_header.user.username,
        password: new_password,
        token: state.token,
      };
      return;
    }
    Store[id].password = new_password;
  },
  /**
   * Edit the trade requests settings of the current user.
   * @param state The current state.
   */
  edit_trade_requests: async (state: State): Promise<void> => {
    if (!state.user_header.user) return;

    const current_state = state.user_header.user.settings.requests;
    trade_request_select.set_question(`Select who can send trade requests: (Currently set to: ${Color.bold(current_state)})`);
    const new_state_idx = await trade_request_select.response_bind(state.terminal);
    if (new_state_idx === -1) return;
    const new_state = ['on', 'friends', 'off'][new_state_idx] as 'on' | 'friends' | 'off';

    const settings = new v1.settings(state.token);
    const res = await settings.set_trade_requests(new_state);
    if (res.error) {
      state.notif_section.push_error(res.reason);
      return;
    }
    state.notif_section.push_success('Trade requests updated successfully.');
    state.user_header.user.settings.requests = new_state;
  },
  /**
   * Edit the friend requests settings of the current user.
   * @param state The current state.
   */
  edit_friend_requests: async (state: State): Promise<void> => {
    if (!state.user_header.user) return;

    const current_state = state.user_header.user.settings.friends;
    friend_request_select.set_question(`Select who can send friend requests: (Currently set to: ${Color.bold(current_state)})`);
    const new_state_idx = await friend_request_select.response_bind(state.terminal);
    if (new_state_idx === -1) return;
    const new_state = ['on', 'mutual', 'off'][new_state_idx] as 'on' | 'mutual' | 'off';

    const settings = new v1.settings(state.token);
    const res = await settings.set_friend_requests(new_state);
    if (res.error) {
      state.notif_section.push_error(res.reason);
      return;
    }
    state.notif_section.push_success('Friend requests updated successfully.');
    state.user_header.user.settings.friends = new_state;
  },
  /**
   * Edit the name color of the current user.
   * @param state The current state.
   */
  edit_name_color: async (state: State): Promise<void> => {
    if (!state.user_header.user) return;

    _mutate_username = state.user_header.user.username;
    const hex = await hex_input.response_bind(state.terminal);
    if (hex === '') return;

    const settings = new v1.settings(state.token);
    const res = await settings.set_name_color(hex);
    if (res.error) {
      state.notif_section.push_error(res.reason);
      return;
    }
    state.notif_section.push_success('Name color updated successfully.');
    state.user_header.user.color = hex;
    state.user_header.refresh_display();
  },
};
