import { type Terminal, Text } from '@lib/tui';
import v1 from '@lib/api';
import Color from '@lib/color';
import { Select, Input } from '@component/.';
import { can_claim, claim_in_formatted } from '@util/claim';
import type { UserForeign } from '@lib/api/src/v1/user';
import type { Data } from '@lib/api/src/v1/data';

const text = new Text(0, 0, '');
const text2 = new Text(0, 6, '');
const select_choices = ['[0] View Stats ', '[1] Trade Player ', '[2] Manage Friends', '[3] Claim Daily Reward '];
const select = new Select('Select an action to perform:', select_choices, {
  disabled_indexes: [1, 4],
});
const input = new Input('Enter the username or ID of the player:', {
  placeholder: 'Username or ID',
});

let cached_data: Data | null = null;

function set_text_2(user: UserForeign) {
  text2.text = Color.green(
    Color.underline('User'),
    ': ',
    Color.hex(user.color, user.username),
    !user.clan ? '' : Color.hex(user.clan.color, ' [' + user.clan.name + ']'),
    ` #${user.id}\n`,
    Color.underline('Joined'),
    `: ${new Date(user.created * 1000).toDateString()}\n`,
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
    select_choices[4] = `${'\n'.repeat(9)}[4] View Clan `;
  } else {
    delete select_choices[4];
  }
  select.set_options(select_choices);
}

/**
 * The statistics context
 * @param terminal Reference to the root terminal
 * @param token The token of the authenticated account
 * @param set_token A callback that sets the tokens header value
 */
export default async function (terminal: Terminal, token: string, set_tokens: (t: number | null, d?: number) => void): Promise<void> {
  text.text = Color.yellow('Fetching statistics...');
  terminal.push(text);
  const res = await v1.user(token);
  if (!cached_data) {
    const _data = await v1.data(true);
    if (_data.error) return;
    cached_data = _data.data;
  }
  if (res.error) {
    text.text += Color.red(`\nFailed to fetch statistics: ${res.reason}`);
    terminal.write_buffer();
    return;
  }
  if (res.is_foreign) throw new Error('User is not allowed to be `is_foreign`');
  text.text = '';
  const user = res.user;

  set_text_2(user);
  terminal.push(text2);

  if (can_claim(new Date(+user.claimed * 1000))) select.set_disabled_indexes([1, 4]);
  else {
    select_choices[3] = `[3] Claim Daily Reward (${claim_in_formatted(new Date(+user.claimed * 1000))})`;
    select.set_disabled_indexes([1, 3, 4]);
  }

  main: while (true) {
    terminal.push(select.component);
    const _select = await select.response();
    terminal.pop(select.component);
    switch (_select) {
      case -1: {
        break main;
      }
      case 0: {
        input.set_value('');
        terminal.push(input.component);
        const _input = await input.response();
        terminal.pop(input.component);
        if (_input === '') break;
        const res2 = await v1.user(token, _input);
        if (res2.error) break;
        set_text_2(res2.user);
        terminal.write_buffer();
        break;
      }
      case 1: {
        break;
      }
      case 2: {
        break;
      }
    }
  }
  terminal.pop(text, text2, select.component);
}
