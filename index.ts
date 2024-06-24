import { Terminal, Text } from '@lib/tui';
import Color from '@lib/color';
import auth_context from './src/context/auth';
import main_context from './src/context/main';
import v1 from '@lib/api';

const VERSION = '0.6.0';

const terminal = new Terminal();
const version_header = new Text(-1, 0, Color.bright_magenta(`[blacket-tui ~ v${VERSION}]`), 1, -1);
const username_header = new Text(-1, 1, Color.blink_slow(Color.cyan('Awaiting Authorization')), 1, -1);
const tokens_header = new Text(-1, 2, '', 1, -1);
terminal.push(version_header, username_header, tokens_header);

const token = await auth_context(terminal);
const _user = await v1.user(token);
if (_user.error) {
  username_header.text = Color.red(`Authorization Failed\n${_user.reason}`);
  terminal.write_buffer();
  process.exit();
}
if (_user.is_foreign) throw new Error('User is not allowed to be `is_foreign`');
const user = _user.user;
username_header.text = Color.join(Color.hex(user.color, user.username, ' '), user.clan ? Color.hex(user.clan.color, `[${user.clan.name}]`) : '');
tokens_header.text = Color.yellow(`${user.tokens.toLocaleString()} tokens`);
terminal.write_buffer();

let loc_tokens = user.tokens;
await main_context(terminal, token, (t: number | null, d?: number) => {
  if (t) loc_tokens = t;
  if (d) loc_tokens -= d;
  tokens_header.text = Color.yellow(loc_tokens.toLocaleString() + ' tokens');
  terminal.write_buffer();
});
