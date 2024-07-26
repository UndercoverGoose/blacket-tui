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

const select = new Select('Select an Authorization Method:', ['[0] Load Previous ', '[1] Add via Username/Password ', '[2] Add via Token ', '[3] Set Proxy ']);
const search = new Searchable('Select an Account:', []);
const username = new Input('Enter Username:', {
  inline_header: true,
  placeholder: 'username',
});
const password = new Input('Enter Password:', {
  inline_header: true,
  placeholder: 'password',
  mutate: (s: string) => '*'.repeat(s.length),
});
password.component.y = 1;
const up_text = new Text(0, 3, '');
const token = new Input('Enter Token:', {
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
      select.set_disabled_indexes([Object.keys(Store).length === 0 ? 0 : -1]);
      const _select = await select.response_bind(state.terminal);
      switch (_select) {
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
      const _select2 = await search.response_bind(state.terminal);
      if (_select2 === -1) return null;
      const account = Store[account_map[_select2][0]];
      switch (account.type) {
        case 'credential': {
          state.notif_section.push(Color.white(`Logging in to ${Color.green(account.username)} with credentials...`));
          const res = await v1.login(account.username, account.password);
          if (res.error) {
            state.notif_section.push_error(`Failed to validate credentials: ${res.reason}`, true);
            break;
          }
          const _token = res.token;
          state.notif_section.push_success('Logged in successfully.', true);
          if (!values.proxy && typeof account.proxy === 'number' && account.proxy >= 0) values.proxy = ProxyStore[account.proxy];
          return _token;
        }
        case 'token': {
          state.notif_section.push(Color.white(`Logging in to ${Color.green(account.username)} with token...`));
          const res = await v1.auth_status(account.token);
          if (res.error) {
            state.notif_section.push_error(`Failed to validate token: ${res.reason}`, true);
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
    state.terminal.push(username.component, password.component, up_text);
    up_text.text = '';
    function set_text(text: string, append = false) {
      if (append) up_text.text += '\n' + text;
      else up_text.text = text;
      state.terminal.write_buffer();
    }
    while (true) {
      username.set_value('');
      password.set_value('');
      const _username = await username.response();
      if (_username === '') break;
      const _password = await password.response();
      if (_password === '') break;
      set_text(Color.white('Testing credentials...'));
      const res = await v1.login(_username, _password);
      if (res.error) {
        set_text(Color.red(`Failed to validate: ${res.reason}`), true);
        continue;
      }
      const _token = res.token;
      set_text(Color.white('Fetching user id...'));

      const res2 = await v1.user(_token);
      if (res2.error) {
        set_text(Color.red(`Failed to fetch user id: ${res2.reason}`), true);
        continue;
      }
      Store[res2.user.id] = {
        type: 'credential',
        username: res2.user.username,
        password: _password,
      };
      state.notif_section.push_success(`Saved credentials for ${Color.italic(res2.user.username)}`);
      break;
    }
    state.terminal.pop(username.component, password.component, up_text);
    return;
  },
  /**
   * Prompts the user to add an account via token.
   * @param state The current state.
   */
  add_via_token: async (state: State): Promise<void> => {
    while (true) {
      token.set_value('');
      const _token = await token.response_bind(state.terminal);
      if (_token === '') break;
      const res = await v1.auth_status(_token);
      if (res.error) {
        state.notif_section.push_error(res.reason);
        continue;
      }
      if (!res.authed) {
        state.notif_section.push_error('Token is invalid.');
        continue;
      }
      const user = await v1.user(_token);
      if (user.error) {
        state.notif_section.push_error(user.reason);
        continue;
      }
      if (user.is_foreign) throw new Error('User is not allowed to be `is_foreign`');
      Store[user.user.id] = {
        type: 'token',
        username: user.user.username,
        token: _token,
      };
      state.notif_section.push_success(`Saved credentials for ${Color.italic(user.user.username)}`);
      break;
    }
  },
};
