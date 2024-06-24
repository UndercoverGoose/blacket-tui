import Color from '@lib/color';
import { type Terminal, Text } from '@lib/tui';
import Select from '../component/select';
import { Dynamic } from '@lib/dynamic';
import Input from '../component/input';
import v1 from '@lib/api';

type Store = {
  [key: string]: { username: string } & (
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

const select = new Select('Select an Authorization Method:', ['[0] Load Previous ', '[1] Add via Username/Password ', '[2] Add via Token ']);
const select2 = new Select('Select an Account:', []);
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
 * @returns The token of the authenticated account
 */
export default async function (terminal: Terminal): Promise<string> {
  main: while (true) {
    terminal.push(select.component);
    select.set_disabled_indexes([Object.keys(Store).length === 0 ? 0 : -1]);
    const _select = await select.response();
    terminal.pop(select.component);
    switch (_select) {
      case 0: {
        const account_map = Object.entries(Store).map(([k, v]) => [k, v.username]);
        const account_names = account_map.map(([id, name], idx) => `[${idx}] ${name} - ${id} `);
        select2.set_options(account_names);
        terminal.push(lo_text, select2.component);
        function set_text(text: string, new_line = false) {
          if (new_line) lo_text.text += '\n' + text;
          else lo_text.text = text;
          terminal.write_buffer();
        }
        auth: while (true) {
          const _select2 = await select2.response();
          terminal.pop(select2.component);
          if (_select2 === -1) continue main;
          const account = Store[account_map[_select2][0]];
          switch (account.type) {
            case 'credential': {
              set_text(Color.white(`Logging in to ${Color.green(account.username)} with credentials...`));
              const res = await v1.login(account.username, account.password);
              if (res.error) {
                set_text(Color.red(`Failed to validate credentials: ${res.reason}`), true);
                break auth;
              }
              const _token = res.token;
              set_text(Color.green('Logged in successfully.'), true);
              terminal.pop(lo_text);
              return _token;
            }
            case 'token': {
              set_text(Color.white(`Logging in to ${Color.green(account.username)} with token...`));
              const state = await v1.auth_status(account.token);
              if (state.error) {
                set_text(Color.red(`Failed to validate token: ${state.reason}`), true);
                break auth;
              }
              break;
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
          set_text(Color.green('Credential saved.'), true);
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
          const _token = await token.response(); //! add validation to component
          if (_token === '') break;
          const res = await v1.auth_status(_token);
          if (res.error) continue;
          if (!res.authed) continue;
          const user = await v1.user(_token);
          if (user.error || user.is_foreign) continue;
          Store[user.user.id] = {
            type: 'token',
            username: user.user.username,
            token: _token,
          };
        }
        terminal.pop(token.component);
        break;
      }
    }
  }
}
