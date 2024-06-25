import { type Terminal, Text } from '@lib/tui';
import v1 from '@lib/api';
import Color from '@lib/color';
import { Notification, Searchable, Select } from '@component/.';
import type { User } from '@lib/api/src/v1/user';

type BlookList = (keyof User['blooks'])[];

const text = new Text(0, 0, '');
const select = new Select(
  'Select an option:',
  ['[0] View All Obtained Blooks ', '[1] View Obtained by Pack ', '[2] View Missing Blooks ', '[3] View Missing by Pack ', '[4] View All Blooks '],
  {
    disabled_indexes: [1, 3, 4],
  }
);
const search = new Searchable('Select a blook:', []);

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
  terminal.pop(text);
  if (user.error) return notif_section.push_error(user.reason);
  if (_data.error) return notif_section.push_error(_data.reason);
  const data = _data.data;
  const all_blooks = data.blooks;
  const blooks = user.user.blooks;

  search.mutate_func = (blook_name: string) => {
    const blook = all_blooks[blook_name];
    const count = blooks[blook_name] ?? 0;
    if (!blook) return blook_name + ` ${count}x`;
    const hex = rarity_color(blook.rarity);
    return Color.hex(hex, '[', blook.rarity, '] ', blook_name, ` ${count}x `);
  };

  function rarity_color(rarity: string): string {
    const rarity_info = data.rarities[rarity];
    if (!rarity_info) return '#ffffff';
    return rarity_info.color;
  }
  async function render_blooks(blooks: BlookList) {
    const mapped = blooks.map(blook_name => {
      return blook_name;
    });
    search.set_choices(mapped);
    terminal.push(search.component);
    await search.response();
    terminal.pop(search.component);
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
        // View All Obtained Blooks
        await render_blooks(Object.keys(blooks));
        break;
      }
      case 1: {
        // View Obtained by Pack
        break;
      }
      case 2: {
        const missing = Object.keys(all_blooks).filter(blook_name => !blooks[blook_name]);
        await render_blooks(missing);
        // View Missing Blooks
        break;
      }
      case 3: {
        // View Missing by Pack
        break;
      }
      case 4: {
        // View All Blooks
        break;
      }
    }
  }
  terminal.pop(text, select.component);
}
