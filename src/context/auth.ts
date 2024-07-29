import Color from '@lib/color';
import { Text } from '@lib/tui';
import { Select, Input, Searchable } from '@component/.';
import { Dynamic } from '@lib/dynamic';
import v1 from '@lib/api';
import { Store as ProxyStore, states as proxy_context } from '@ctx/proxy';
import { values } from '@lib/api/src/v1';
import type { State } from '@ctx/state';
import { states as scripts } from '@ctx/scripts';

type Store = {
  [key: string]: { username: string; proxy?: number } & (
    | {
        type: 'credential';
        password: string;
        token?: string;
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
  '[3] Create Account ',
  '[4] Set Proxy ',
  '[5] Execute Script ',
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
const discord_input = new Input('Enter Discord Username (optional):', {
  inline_header: true,
  placeholder: 'username',
});
const age_input = new Input('Enter Age:', {
  inline_header: true,
  placeholder: '##',
  is_valid: (s: string) => {
    const age = Number(s);
    return !(isNaN(age) || age.toString().includes('.') || age < 13 || age > 25);
  },
  valid_func: s => Color.green(s),
  invalid_func: s => Color.red(s),
});
age_input.component.y = 1;
const reason_input = new Input('Enter Reason:', {
  placeholder: '...',
});
reason_input.component.y = 2;
const code_input = new Input('Enter Code:', {
  inline_header: true,
  placeholder: '######',
  is_valid: (s: string) => /^[0-9]{6}$/.test(s),
  valid_func: s => Color.green(s),
  invalid_func: s => Color.red(s),
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
          await states.create_account(state);
          break;
        }
        case 4: {
          await proxy_context.root(state);
          break;
        }
        case 5: {
          await scripts.root(state);
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

          loginskip: if (account.token) {
            const status_res = await v1.auth_status(account.token);
            if (status_res.error) break loginskip;
            if (!status_res.authed) break loginskip;
            state.notif_section.push_success('Previous token is still valid.', true);
            return account.token;
          }

          let login_res = await v1.login(account.username, account.password);
          if (login_res.error && login_res.reason === 'You must specify a code.') {
            code_input.set_value('');
            const code_res = await code_input.response_bind(state.terminal);
            login_res = await v1.login(account.username, account.password, code_res);
          }
          if (login_res.error) {
            state.notif_section.push_error(`Failed to validate credentials: ${login_res.reason}`, true);
            break;
          }
          const token = login_res.token;
          state.notif_section.push_success('Logged in successfully.', true);
          if (!values.proxy && typeof account.proxy === 'number' && account.proxy >= 0) values.proxy = ProxyStore[account.proxy];

          let account_id = account_map[account_index][0];
          idfix: if (account_id.startsWith('pending')) {
            const user_res = await v1.user(token);
            if (user_res.error) break idfix;
            const new_data = { ...Store[account_id] };
            Store[user_res.user.id] = new_data;
            delete Store[account_id];
            account_id = user_res.user.id.toString();
          }

          Store[account_id].token = token;

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
      let login_res = await v1.login(username_res, password_res);
      if (login_res.error && login_res.reason === 'You must specify a code.') {
        set_text('');
        state.terminal.pop(username_input.component, password_input.component);
        code_input.set_value('');
        const code_res = await code_input.response_bind(state.terminal);
        set_text(Color.white('Testing credentials...'));
        state.terminal.push(username_input.component, password_input.component);
        login_res = await v1.login(username_res, password_res, code_res);
      }
      if (login_res.error) {
        set_text(Color.red(`Failed to validate: ${login_res.reason}`), true);
        continue;
      }
      const token = login_res.token;
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
  /**
   * Prompts the user to create an account.
   * @param state The current state.
   */
  create_account: async (state: State): Promise<void> => {
    username_input.set_value('');
    password_input.set_value('');
    discord_input.set_value('');
    age_input.set_value('');
    reason_input.set_value('');
    outer: while (true) {
      state.terminal.pop(discord_input.component, age_input.component, reason_input.component);
      state.terminal.push(username_input.component, password_input.component);
      const username_res = await username_input.response();
      if (username_res === '') break;
      const password_res = await password_input.response();
      if (password_res === '') break;
      state.terminal.pop(username_input.component, password_input.component);
      while (true) {
        state.terminal.push(discord_input.component, age_input.component, reason_input.component);
        const discord_res = await discord_input.response();
        if (discord_res === '') break;
        const age_res = await (async () => {
          while (true) {
            const res = await age_input.response();
            if (res === '') return '';
            if (!age_input.is_valid(res)) {
              state.notif_section.push_error('Invalid age.');
              continue;
            }
            return res;
          }
        })();
        if (age_res === '') continue;
        const reason_res = await reason_input.response();
        if (reason_res === '') continue;

        const register_res = await v1.register(username_res, password_res, discord_res, age_res, reason_res);
        if (register_res.error) {
          state.notif_section.push_error(register_res.reason);
          continue;
        }
        state.notif_section.push_success('Account creation request sent.');
        const pending_count =
          Object.keys(Store)
            .filter(id => id.startsWith('pending'))
            .map(v => Number(v.split('-')[1]))
            .reduce((a, b) => Math.max(a, b), 0) + 1;
        Store[`pending-${pending_count}`] = {
          type: 'credential',
          username: username_res,
          password: password_res,
        };
        state.notif_section.push_success('Account saved as pending.');
        break outer;
      }
    }
    state.terminal.pop(username_input.component, password_input.component);
    state.terminal.pop(discord_input.component, age_input.component, reason_input.component);
  },
};
