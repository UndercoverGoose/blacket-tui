import Color from '@lib/color';
import { type Terminal, Text } from '@lib/tui';
import { Select, Input, Notification, Searchable } from '@component/.';
import { Dynamic } from '@lib/dynamic';
import v1 from '@lib/api';
import proxy_context, { Store as ProxyStore } from '@ctx/proxy';
import { values } from '@lib/api/src/v1';

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
const lo_text = new Text(0, 0, '');
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

/**
 * Authentication manager
 * @param terminal Reference to the root terminal
 * @param notif_section The global notification component
 * @returns The token of the authenticated account
 */
export default async function (terminal: Terminal, notif_section: Notification): Promise<string> {
  main: while (true) {
    terminal.push(select.component);
    select.set_disabled_indexes([Object.keys(Store).length === 0 ? 0 : -1]);
    const _select = await select.response();
    terminal.pop(select.component);
    switch (_select) {
      case 0: {
        const account_map = Object.entries(Store).map(([k, v]) => [k, v.username]);
        const account_names = account_map.map(([id, name], idx) => `[${idx}] ${name} - ${id} `);
        search.set_choices(account_names);
        terminal.push(lo_text);
        function set_text(text: string, new_line = false) {
          if (new_line) lo_text.text += '\n' + text;
          else lo_text.text = text;
          terminal.write_buffer();
        }
        auth2: while (true) {
          const _select2 = await search.response_bind(terminal);
          if (_select2 === -1) continue main;
          const account = Store[account_map[_select2][0]];
          switch (account.type) {
            case 'credential': {
              set_text(Color.white(`Logging in to ${Color.green(account.username)} with credentials...`));
              const res = await v1.login(account.username, account.password);
              if (res.error) {
                set_text(Color.red(`Failed to validate credentials: ${res.reason}`), true);
                break auth2;
              }
              const _token = res.token;
              set_text(Color.green('Logged in successfully.'), true);
              terminal.pop(lo_text);
              if (!values.proxy && typeof account.proxy === 'number' && account.proxy >= 0) values.proxy = ProxyStore[account.proxy];
              return _token;
            }
            case 'token': {
              set_text(Color.white(`Logging in to ${Color.green(account.username)} with token...`));
              const state = await v1.auth_status(account.token);
              if (state.error) {
                set_text(Color.red(`Failed to validate token: ${state.reason}`), true);
                break auth2;
              }
              terminal.pop(lo_text);
              if (!values.proxy && typeof account.proxy === 'number' && account.proxy >= 0) values.proxy = ProxyStore[account.proxy];
              return account.token;
            }
          }
        }
        terminal.pop(lo_text);
        break;
      }
      case 1: {
        terminal.push(username.component, password.component, up_text);
        up_text.text = '';
        function set_text(text: string, append = false) {
          if (append) up_text.text += '\n' + text;
          else up_text.text = text;
          terminal.write_buffer();
        }
        auth: while (true) {
          username.set_value('');
          password.set_value('');
          const _username = await username.response();
          if (_username === '') break auth;
          const _password = await password.response();
          if (_password === '') break auth;
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
          notif_section.push_success(`Saved credentials for ${Color.italic(res2.user.username)}`);
          break;
        }
        terminal.pop(username.component, password.component, up_text);
        break;
      }
      case 2: {
        terminal.push(token.component);
        let success = false;
        while (!success) {
          token.set_value('');
          const _token = await token.response();
          if (_token === '') break;
          const res = await v1.auth_status(_token);
          if (res.error) {
            notif_section.push_error(res.reason);
            continue;
          }
          if (!res.authed) {
            notif_section.push_error('Token is invalid.');
            continue;
          }
          const user = await v1.user(_token);
          if (user.error) {
            notif_section.push_error(user.reason);
            continue;
          }
          if (user.is_foreign) throw new Error('User is not allowed to be `is_foreign`');
          Store[user.user.id] = {
            type: 'token',
            username: user.user.username,
            token: _token,
          };
          notif_section.push_success(`Saved credentials for ${Color.italic(user.user.username)}`);
        }
        terminal.pop(token.component, up_text);
        break;
      }
      case 3: {
        await proxy_context(terminal, notif_section);
        break;
      }
    }
  }
}
