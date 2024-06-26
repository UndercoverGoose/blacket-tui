import { Terminal, Text } from '@lib/tui';
import Color from '@lib/color';
import auth_context from '@ctx/auth';
import main_context from '@ctx/main';
import { Notification, Tokens } from '@component/.';
import v1 from '@lib/api';

const VERSION = '0.6.2-beta1';

const terminal = new Terminal();
const version_header = new Text(-1, 0, Color.bright_magenta(`[blacket-tui ~ v${VERSION}]`), 1, -1);
const username_header = new Text(-1, 1, Color.blink_slow(Color.cyan('Awaiting Authorization')), 1, -1);
const notif_section = new Notification();
const tokens_header = new Tokens(0);
const booster_header = new Text(-1, -1, Color.bright_black('No Booster Active'), 1, -1);

terminal.push(version_header, username_header, tokens_header.component, notif_section.component, booster_header);

const token = await auth_context(terminal, notif_section);
const _user = await v1.user(token);
if (_user.error) {
  username_header.text = Color.red(`Authorization Failed\n${_user.reason}`);
  terminal.write_buffer();
  process.exit();
}
if (_user.is_foreign) throw new Error('User is not allowed to be `is_foreign`');
const user = _user.user;
username_header.text = Color.join(Color.hex(user.color, user.username, ' '), user.clan ? Color.hex(user.clan.color, `[${user.clan.name}]`) : '');
tokens_header.set_tokens(user.tokens);
terminal.write_buffer();

setInterval(async () => {
  const res = await v1.data();
  if (res.error) return;
  if (res.data.booster.active) {
    const b = res.data.booster;
    booster_header.text = Color.cyan('Booster Active: ', Color.bold(b.multiplier + 'x'), ' until ', Color.bold(new Date(b.time * 1000).toLocaleTimeString()));
  } else booster_header.text = Color.bright_black('No Booster Active');
  terminal.write_buffer();
}, 10000);

await main_context(terminal, token, notif_section, tokens_header);
