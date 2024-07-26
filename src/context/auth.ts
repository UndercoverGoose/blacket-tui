import Color from '@lib/color';
import { Text } from '@lib/tui';
import { Select, Input, Searchable } from '@component/.';
import { Dynamic } from '@lib/dynamic';
import v1 from '@lib/api';
import { Store as ProxyStore, states as proxy_context } from '@ctx/proxy';
import { values } from '@lib/api/src/v1';
import type { State } from '@ctx/state';

type Store = {
  [key: string]: { username: string; proxy?: number } & (
    | {
        type: 'credential';
        password: string;
      }
    | {
        type: 'token';
        token: string;
      }
  );
};
const Store: Store = await new Dynamic<Store>('auth.json', {}).setup();

const root_select = new Select('Select an Authorization Method:', [
  '[0] Load Previous ',
  '[1] Add via Username/Password ',
  '[2] Add via Token ',
  '[3] Set Proxy ',
]);
const search = new Searchable('Select an Account:', []);
const username_input = new Input('Enter Username:', {
  inline_header: true,
  placeholder: 'username',
});
const password_input = new Input('Enter Password:', {
  inline_header: true,
  placeholder: 'password',
  mutate: (s: string) => '*'.repeat(s.length),
});
password_input.component.y = 1;
const result_text = new Text(0, 3, '');
const token_input = new Input('Enter Token:', {
  inline_header: true,
  placeholder: 'token',
});

export const states = {
  /**
   * Authentication manager.
   * @param state The current state.
   * @returns The token of the authenticated account.
   */
  root: async (state: State): Promise<string> => {
    let token: string | null = null;
    while (!token) {
      root_select.set_disabled_indexes([Object.keys(Store).length === 0 ? 0 : -1]);
      switch (await root_select.response_bind(state.terminal)) {
        case 0: {
          token = await states.load_previous(state);
          break;
        }
        case 1: {
          await states.add_via_pass(state);
          break;
        }
        case 2: {
          await states.add_via_token(state);
          break;
        }
        case 3: {
          await proxy_context.root(state);
          break;
        }
      }
    }
    return token;
  },
  /**
   * Prompts the user to select a previously saved account.
   * @param state The current state.
   * @returns The token of the selected account or null.
   */
  load_previous: async (state: State): Promise<string | null> => {
    const account_map = Object.entries(Store).map(([k, v]) => [k, v.username]);
    const account_names = account_map.map(([id, name], idx) => `[${idx}] ${name} - ${id} `);
    search.set_choices(account_names);
    while (true) {
      const account_index = await search.response_bind(state.terminal);
      if (account_index === -1) return null;
      const account = Store[account_map[account_index][0]];
      switch (account.type) {
        case 'credential': {
          state.notif_section.push(Color.white(`Logging in to ${Color.green(account.username)} with credentials...`));
          const login_res = await v1.login(account.username, account.password);
          if (login_res.error) {
            state.notif_section.push_error(`Failed to validate credentials: ${login_res.reason}`, true);
            break;
          }
          const token = login_res.token;
          state.notif_section.push_success('Logged in successfully.', true);
          if (!values.proxy && typeof account.proxy === 'number' && account.proxy >= 0) values.proxy = ProxyStore[account.proxy];
          return token;
        }
        case 'token': {
          state.notif_section.push(Color.white(`Logging in to ${Color.green(account.username)} with token...`));
          const status_res = await v1.auth_status(account.token);
          if (status_res.error) {
            state.notif_section.push_error(`Failed to validate token: ${status_res.reason}`, true);
            break;
          }
          if (!values.proxy && typeof account.proxy === 'number' && account.proxy >= 0) values.proxy = ProxyStore[account.proxy];
          return account.token;
        }
      }
    }
  },
  /**
   * Prompts the user to add an account via username and password.
   * @param state The current state.
   */
  add_via_pass: async (state: State): Promise<void> => {
    state.terminal.push(username_input.component, password_input.component, result_text);
    result_text.text = '';
    function set_text(text: string, append = false) {
      if (append) result_text.text += '\n' + text;
      else result_text.text = text;
    }
    while (true) {
      username_input.set_value('');
      password_input.set_value('');
      const username_res = await username_input.response();
      if (username_res === '') break;
      const password_res = await password_input.response();
      if (password_res === '') break;
      set_text(Color.white('Testing credentials...'));
      const res = await v1.login(username_res, password_res);
      if (res.error) {
        set_text(Color.red(`Failed to validate: ${res.reason}`), true);
        continue;
      }
      const token = res.token;
      set_text(Color.white('Fetching user id...'));

      const user_res = await v1.user(token);
      if (user_res.error) {
        set_text(Color.red(`Failed to fetch user id: ${user_res.reason}`), true);
        continue;
      }
      Store[user_res.user.id] = {
        type: 'credential',
        username: user_res.user.username,
        password: password_res,
      };
      state.notif_section.push_success(`Saved credentials for ${Color.italic(user_res.user.username)}`);
      break;
    }
    state.terminal.pop(username_input.component, password_input.component, result_text);
    return;
  },
  /**
   * Prompts the user to add an account via token.
   * @param state The current state.
   */
  add_via_token: async (state: State): Promise<void> => {
    while (true) {
      token_input.set_value('');
      const token = await token_input.response_bind(state.terminal);
      if (token === '') break;
      const status_res = await v1.auth_status(token);
      if (status_res.error) {
        state.notif_section.push_error(status_res.reason);
        continue;
      }
      if (!status_res.authed) {
        state.notif_section.push_error('Token is invalid.');
        continue;
      }
      const user_res = await v1.user(token);
      if (user_res.error) {
        state.notif_section.push_error(user_res.reason);
        continue;
      }
      if (user_res.is_foreign) throw new Error('User is not allowed to be `is_foreign`');
      Store[user_res.user.id] = {
        type: 'token',
        username: user_res.user.username,
        token: token,
      };
      state.notif_section.push_success(`Saved credentials for ${Color.italic(user_res.user.username)}`);
      break;
    }
  },
};
