import { type Terminal, Text } from '@lib/tui';
import v1 from '@lib/api';
import Color from '@lib/color';
import { Select } from '@component/.';

const text = new Text(0, 0, '');
const select = new Select('Select a page to view:', ['[0] Packs ', '[1] Weekly Shop ']);
const select2 = new Select('Select a pack to view:', []);
select2.component.v_wrap = false;
const select3 = new Select('Select an option to perform:', ['[0] View Blooks ', '[1] Purchase Pack ', '[2] Purchase Pack in Bulk ']);
const select4 = new Select('Blooks:', []);
const select5 = new Select('', ['[0] Back '], {
  header_func: s => s,
});
const select6 = new Select('', ['[0] Stop '], {
  header_func: s => s,
});

export default async function (terminal: Terminal, token: string, set_tokens: (t: number | null, d?: number) => void): Promise<void> {
  text.text = Color.yellow('Fetching market...');
  terminal.push(text);
  const _data = await v1.data(true);
  if (_data.error) {
    text.text += Color.red(`\nFailed to fetch market: ${_data.reason}`);
    terminal.write_buffer();
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
  const items = data.weekly_shop;
  text.text = '';
  main: while (true) {
    terminal.push(select.component);
    const _select = await select.response();
    terminal.pop(select.component);
    switch (_select) {
      case -1: {
        break main;
      }
      case 0: {
        const packs_map = Object.entries(packs);
        select2.set_options(packs_map.map(([k, v], idx) => `[${idx}] ${k} - ${v.price} tokens `));
        pack: while (true) {
          terminal.push(select2.component);
          const _select2 = await select2.response();
          terminal.pop(select2.component);
          if (_select2 === -1) continue main;
          const [pack_name, pack_info] = packs_map[_select2];
          select3.set_question(`Select an option to perform on ${Color.bold(pack_name + ' - ' + pack_info.price + ' tokens')}:`);
          while (true) {
            select3.set_selected_index(0);
            terminal.push(select3.component);
            const _select3 = await select3.response();
            terminal.pop(select3.component);
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
                terminal.push(select4.component);
                await select4.response();
                terminal.pop(select4.component);
                break;
              }
              case 1: {
                text.text = Color.yellow(`Purchasing ${Color.bold(pack_name)} pack...`);
                terminal.write_buffer();
                const res = await v1.open(token, pack_name);
                text.text = '';
                if (res.error) {
                  select5.set_question(Color.red(Color.underline('Failed to purchase pack:\n'), res.reason));
                  terminal.push(select5.component);
                  await select5.response();
                  terminal.pop(select5.component);
                  break;
                }
                set_tokens(null, pack_info.price);
                const blook_info = all_blooks[res.blook];
                if (!blook_info) select5.set_question(Color.green(Color.underline(`Received`), ': ', Color.white(res.blook)));
                else
                  select5.set_question(
                    Color.green(
                      Color.underline('Received'),
                      ': ',
                      Color.join(Color.hex(rarity_color(blook_info.rarity), res.blook, ` (${blook_info.chance}%)`))
                    )
                  );
                terminal.push(select5.component);
                await select5.response();
                terminal.pop(select5.component);
                break;
              }
              case 2: {
                let opened = 0;
                let tokens_spent = 0;
                let last_blook = '';
                let run = true;
                const results: { [key: string]: number } = {};
                terminal.push(select6.component);
                await new Promise(async r => {
                  select6.response().then(_select6 => {
                    run = false;
                    return r(0);
                  });
                  auto_open: while (run) {
                    const res = await v1.open(token, pack_name);
                    if (res.error) continue;
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
                });
                terminal.pop(select6.component);
                break;
              }
            }
          }
        }
      }
      case 1: {
      }
    }
  }
  terminal.pop(text, select.component);
}
