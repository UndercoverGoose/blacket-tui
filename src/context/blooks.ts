import { type Terminal, Text } from '@lib/tui';
import v1 from '@lib/api';
import Color from '@lib/color';
import { Select, Notification } from '@component/.';

const text = new Text(0, 0, '');
const select = new Select('test', []);

/**
 * Blook manager
 * @param terminal Reference to the root terminal
 * @param token The token of the authenticated account
 * @param set_tokens A callback that sets the tokens header value
 */
export default async function (
  terminal: Terminal,
  token: string,
  notif_section: Notification,
  set_tokens: (t: number | null, d?: number) => void
): Promise<void> {
  text.text = Color.yellow('Fetching blooks...');
  terminal.push(text);
  const _data = await v1.data(true);
  const user = await v1.user(token);
  if (user.error) {
    notif_section.push_error(user.reason);
    terminal.pop(text);
    return;
  }
  if (_data.error) {
    notif_section.push_error(_data.reason);
    terminal.pop(text);
    return;
  }
  const data = _data.data;
  const blooks = user.user.blooks;
  function rarity_color(rarity: string): string {
    const rarity_info = data.rarities[rarity];
    if (!rarity_info) return '#ffffff';
    return rarity_info.color;
  }
  main: while (true) {
    terminal.push(select.component);
    break;
  }
  terminal.pop(text, select.component);
}
