import { Terminal, Text } from '@lib/tui';
import Color from '@lib/color';
import { states as auth_context } from '@ctx/auth';
import main_context from '@ctx/main';
import { Notification, Tokens, Booster, User } from '@component/.';
import v1 from '@lib/api';
import { type State } from '@ctx/state';

const VERSION = '0.8.0';

const terminal = new Terminal();
const version_header = new Text(-1, 0, Color.bright_black(`[blacket-tui ~ v${VERSION}]`), 1, -1);
const user_header = new User();
const notif_section = new Notification();
const tokens_header = new Tokens(0);
const booster_header = new Booster();

tokens_header.component.text = '';
terminal.push(version_header, user_header.component, tokens_header.component, notif_section.component, booster_header.component);

const state: State = {
  terminal,
  user_header,
  notif_section,
  tokens: tokens_header,
  booster: booster_header,
  token: '',
};

state.token = await auth_context.root(state);
const user_res = await v1.user(state.token);
if (user_res.error) throw new Error('Failed to authenticate: ' + user_res.reason);
if (user_res.is_foreign) throw new Error('User is not allowed to be `is_foreign`');
const user = user_res.user;
user_header.set_user(user);
tokens_header.set_tokens(user.tokens);

await main_context(state);
