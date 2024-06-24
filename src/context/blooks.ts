import { type Terminal, Text } from '@lib/tui';
import v1 from '@lib/api';
import Color from '@lib/color';
import { Select } from '@component/.';

const text = new Text(0, 0, '');
const select = new Select('test', []);

export default async function (terminal: Terminal, token: string, set_tokens: (t: number | null, d?: number) => void): Promise<void> {
  text.text = Color.yellow('Fetching blooks...');
  terminal.push(text);
  const _data = await v1.data(true);
  const user = await v1.user(token);
  if (user.error) {
    text.text += Color.red(`\nFailed to fetch user blooks: ${user.reason}`);
    terminal.write_buffer();
    return;
  }
  if (_data.error) {
    text.text += Color.red(`\nFailed to fetch blook info: ${_data.reason}`);
    terminal.write_buffer();
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
  }
  terminal.pop(text, select.component);
}
