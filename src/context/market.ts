import { type Terminal, Text } from '@lib/tui';
import v1 from '@lib/api';
import Color from '@lib/color';
import { Select, Notification, Searchable } from '@component/.';

const text = new Text(0, 0, '');
const select = new Select('Select a page to view:', ['[0] Packs ', '[1] Items & Weekly Shop ']);
const select2 = new Searchable('Select a pack to view:', []);
select2.component.v_wrap = false;
const select3 = new Select('Select an option to perform:', ['[0] View Blooks ', '[1] Purchase Pack ', '[2] Purchase Pack in Bulk ']);
const select4 = new Select('Blooks:', []);
const select5 = new Select('Items:', []);
const select6 = new Select('', ['[0] Stop '], {
  header_func: s => s,
});
const select7 = new Select('', ['[0] No ', '[1] Yes ']);

/**
 * The market context for viewing and purchasing packs
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
  text.text = Color.yellow('Fetching market...');
  terminal.push(text);
  const _data = await v1.data(true);
  if (_data.error) {
    notif_section.push_error(_data.reason);
    terminal.pop(text);
    return;
  }
  const data = _data.data;
  function rarity_color(rarity: string): string {
    const rarity_info = data.rarities[rarity];
    if (!rarity_info) return '#ffffff';
    return rarity_info.color;
  }
  const all_blooks = data.blooks;
  const packs = data.packs;
  const items = {
    'Clan Shield': { price: 100000, glow: false },
    'Fragment Grenade (Item)': { price: 100000, glow: false },
    'Stealth Disguise Kit (Item)': { price: 250000, glow: false },
    ...data.weekly_shop,
  };

  text.text = '';
  main: while (true) {
    const _select = await select.response_bind(terminal);
    switch (_select) {
      case -1: {
        break main;
      }
      case 0: {
        const packs_map = Object.entries(packs);
        select2.set_choices(packs_map.map(([k, v]) => `${k} - ${v.price} tokens `));
        pack: while (true) {
          const _select2 = await select2.response_bind(terminal);
          if (_select2 === -1) continue main;
          const [pack_name, pack_info] = packs_map[_select2];
          select3.set_question(`Select an option to perform on ${Color.bold(pack_name + ' - ' + pack_info.price + ' tokens')}:`);
          while (true) {
            select3.set_selected_index(0);
            const _select3 = await select3.response_bind(terminal);
            if (_select3 === -1) continue pack;
            switch (_select3) {
              case 0: {
                const blooks = pack_info.blooks.map(blook => {
                  const blook_info = all_blooks[blook as keyof typeof all_blooks];
                  if (!blook_info) return `[${Color.hex('#ffffff', 'Unknown')}] ${blook}`;
                  const hex = rarity_color(blook_info.rarity);
                  return `[${Color.hex(hex, blook_info.rarity)}] ${Color.hex(hex, blook)} - ${Color.hex(hex, blook_info.chance + '%')}`;
                });
                select4.set_options([...blooks, '[0] Back ']);
                select4.set_disabled_indexes(blooks.map((_, idx) => idx));
                select4.set_selected_index(blooks.length);
                await select4.response_bind(terminal);
                break;
              }
              case 1: {
                text.text = Color.yellow(`Purchasing ${Color.bold(pack_name)} pack...`);
                terminal.write_buffer();
                const res = await v1.open(token, pack_name);
                text.text = '';
                if (res.error) {
                  notif_section.push_error(res.reason);
                  break;
                }
                set_tokens(null, pack_info.price);
                const blook_info = all_blooks[res.blook];
                if (!blook_info) notif_section.push_success(`Received ${res.blook}`);
                else notif_section.push_success(Color.hex(rarity_color(blook_info.rarity), res.blook, ` (${blook_info.chance}%)`));
                break;
              }
              case 2: {
                let opened = 0;
                let tokens_spent = 0;
                let last_blook = '';
                let run = true;
                const results: { [key: string]: number } = {};
                terminal.push(select6.component);
                select6.response().then(_select6 => {
                  run = false;
                });
                while (run) {
                  const res = await v1.open(token, pack_name);
                  if (res.error) {
                    notif_section.push_error(res.reason);
                    continue;
                  }

                  const blook_info = all_blooks[res.blook];
                  if (!blook_info) notif_section.push_success(`Received ${res.blook}`);
                  else notif_section.push_success(Color.hex(rarity_color(blook_info.rarity), res.blook, ` (${blook_info.chance}%)`));

                  opened++;
                  tokens_spent += pack_info.price;
                  set_tokens(null, pack_info.price);
                  results[res.blook] = (results[res.blook] ?? 0) + 1;
                  last_blook = res.blook;
                  const value = Object.entries(results)
                    .map(([blook_name, count]) => {
                      return all_blooks[blook_name].price * count;
                    })
                    .reduce((a, b) => a + b, 0);
                  select6.set_question(
                    Color.join(
                      Color.green(Color.underline('Opening pack'), ': ', Color.bold(pack_name)),
                      '\n',
                      Color.yellow(
                        Color.underline('Opened'),
                        ': ',
                        Color.bold(opened.toLocaleString()),
                        '\n',
                        Color.underline('Tokens spent'),
                        ': ',
                        Color.bold(tokens_spent.toLocaleString()),
                        '\n',
                        Color.underline('Instant value'),
                        ': ',
                        Color.bold(value.toLocaleString()),
                        ' ',
                        value >= tokens_spent
                          ? Color.green(`(+${(value - tokens_spent).toLocaleString()})`)
                          : Color.red(`(-${(tokens_spent - value).toLocaleString()})`),
                        '\nUnlocks:\n'
                      ),
                      Object.entries(results)
                        .map(([blook, count]) => [blook, count, all_blooks[blook]] as const)
                        .sort((a, b) => {
                          return a[2].chance - b[2].chance;
                        })
                        .map(([blook, count, blook_info]) => {
                          const hex = rarity_color(blook_info?.rarity);
                          const text = `[${Color.hex(hex, blook_info?.rarity)}] ${Color.hex(hex, blook)} - ${Color.green(count + 'x')}`;
                          if (last_blook === blook) return Color.bold(text);
                          return text;
                        })
                        .join('\n')
                    )
                  );
                  terminal.write_buffer();
                }
                terminal.pop(select6.component);
                break;
              }
            }
          }
        }
      }
      case 1: {
        const items_map = Object.entries(items);
        select5.set_options(items_map.map(([k, v], idx) => `[${idx}] ${k} - ${v.price.toLocaleString()} tokens `));
        shop: while (true) {
          const _select5 = await select5.response_bind(terminal);
          if (_select5 === -1) break shop;
          const [item_name, item_info] = items_map[_select5];
          select7.set_question(`Are you sure you want to purchase ${Color.bold(item_name)} for ${Color.bold(item_info.price.toLocaleString())} tokens?`);
          select7.set_selected_index(0);
          const _select7 = await select7.response_bind(terminal);
          switch (_select7) {
            case -1:
            case 0: {
              continue shop;
            }
            case 1: {
              const _buy = await v1.buy(token, item_name);
              if (_buy.error) notif_section.push_error(_buy.reason);
              else notif_section.push_success(_buy.message);
            }
          }
        }
      }
    }
  }
  terminal.pop(text, select.component);
}
