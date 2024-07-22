import { type Terminal, Text } from '@lib/tui';
import v1 from '@lib/api';
import Color from '@lib/color';
import { Input, Notification, Searchable, Select, Tokens } from '@component/.';
import type { User } from '@lib/api/src/v1/user';

type BlookList = (keyof User['blooks'])[];

const text = new Text(0, 0, '');
const select = new Select(
  'Select an option:',
  [
    '[0] View All Obtained Blooks ',
    '[1] View Obtained by Pack ',
    '[2] View Missing Blooks ',
    '[3] View Missing by Pack ',
    '[4] View All Blooks ',
    '[5] Sell All Blooks ',
  ],
  {
    disabled_indexes: [5],
  }
);
const select2 = new Searchable('Select a pack:', []);
const search = new Searchable('Select a blook:', []);
const select3 = new Select('', ['[0] List Blook ', '[1] Sell Blook ']);
let _input_mutate_multi = 1;
const input = new Input('Enter the amount to sell:', {
  default_value: '1',
  valid_func: Color.green,
  invalid_func: Color.red,
  mutate: (v: string) =>
    ` ${v} ` + Color.reset(Color.bright_black(' = ', Color.yellow((Number(v.replaceAll(',', '')) * _input_mutate_multi).toLocaleString(), ' tokens'), ' ')),
});
const text2 = new Text(0, 4, '');

/**
 * Blook manager
 * @param terminal Reference to the root terminal
 * @param token The token of the authenticated account
 * @param notif_section The global notification component
 * @param tokens The global tokens component
 */
export default async function (terminal: Terminal, token: string, notif_section: Notification, tokens: Tokens): Promise<void> {
  text.text = Color.yellow('Fetching blooks...');
  terminal.push(text);
  const _data = await v1.data(true);
  const user = await v1.user(token);
  terminal.pop(text);
  if (user.error) return notif_section.push_error(user.reason);
  if (_data.error) return notif_section.push_error(_data.reason);
  const data = _data.data;
  const all_blooks = data.blooks;

  const _pack_blooks = Object.values(data.packs)
    .map(pack => pack.blooks)
    .flat();
  data.packs['Miscellaneous'] = {
    price: -1,
    color1: '#ffffff',
    color2: '#ffffff',
    image: '',
    blooks: Object.keys(all_blooks).filter(k => !_pack_blooks.includes(k)),
    hidden: true,
  };

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
  async function render_blooks(_blooks: BlookList) {
    const mapped = _blooks.map(blook_name => {
      return blook_name;
    });
    search.set_choices(mapped);
    main: while (true) {
      const selected_blook = await search.response_bind(terminal);
      if (selected_blook === -1) break main;
      const blook_name = mapped[selected_blook];
      if(!blooks[blook_name] || blooks[blook_name] === 0) continue;
      select3.set_question(`Select an option to perform on ${Color.bold(blook_name)}:`);
      sub: while (true) {
        if (blooks[blook_name] === 0) break;
        const _select3 = await select3.response_bind(terminal);
        switch (_select3) {
          case -1: {
            break sub;
          }
          case 0: {
            _input_mutate_multi = 1;
            input.set_question(`Enter the price to sell ${Color.bold(blook_name)} at:`);
            input.set_value('');
            input.is_valid = (amount: string) => {
              const num = Number(amount.replaceAll(',', ''));
              return !(isNaN(num) || num.toString().includes('.') || num <= 0 || num >= 1e9);
            };
            text2.text = Color.join(
              Color.yellow(`This blook can be instant sold for ${Color.bold('' + all_blooks[blook_name].price)} tokens.\n`),
              Color.yellow(`You currently have ${Color.bold('' + blooks[blook_name])} of this blook.`)
            );
            v1.bazaar(token, blook_name).then(res => {
              if (res.error) return notif_section.push_error(res.reason);
              const cheapest = res.bazaar.filter(b => b.item === blook_name)[0];
              if (!cheapest) text2.text += Color.yellow('\nNo listing found on the bazaar.');
              else text2.text += Color.yellow(`\nCheapest listing on the bazaar: ${Color.bold('' + cheapest.price)} tokens.`);
              terminal.write_buffer();
            });
            terminal.push(text2);
            const amount = await input.response_bind(terminal);
            terminal.pop(text2);
            if (amount === '') break;
            const tokens = Number(amount.replaceAll(',', ''));
            if (!input.is_valid(amount) || isNaN(tokens)) {
              notif_section.push_error('Invalid amount of tokens entered.');
              break;
            }
            const list = await v1.list(token, blook_name, tokens);
            if (list.error) {
              notif_section.push_error(list.reason);
              break;
            }
            notif_section.push_success(`Successfully listed ${Color.bold(blook_name)} for ${Color.bold('' + tokens)} tokens.`);
            blooks[blook_name] -= 1;
            break;
          }
          case 1: {
            _input_mutate_multi = all_blooks[blook_name].price;
            input.set_question(`Enter the amount of ${Color.bold(blook_name)} to sell:`);
            input.set_value('');
            input.is_valid = (amount: string) => {
              const num = Number(amount.replaceAll(',', ''));
              return !(isNaN(num) || num.toString().includes('.') || num <= 0 || num > blooks[blook_name]);
            };
            text2.text = Color.join(
              Color.yellow(`This blook can be instant sold for ${Color.bold('' + all_blooks[blook_name].price)} tokens.\n`),
              Color.yellow(`You currently have ${Color.bold('' + blooks[blook_name])} of this blook.`)
            );
            terminal.push(text2);
            const amount = await input.response_bind(terminal);
            terminal.pop(text2);
            if (amount === '') break;
            const quantity = Number(amount.replaceAll(',', ''));
            if (!input.is_valid(amount) || isNaN(quantity)) {
              notif_section.push_error('Invalid amount of blooks entered.');
              break;
            }
            const sell = await v1.sell(token, blook_name, quantity);
            if (sell.error) {
              notif_section.push_error(sell.reason);
              break;
            }
            notif_section.push_success(
              `Successfully sold ${Color.bold('' + quantity)} ${Color.bold(blook_name)} for ${Color.bold('' + quantity * all_blooks[blook_name].price)} tokens.`
            );
            tokens.add_tokens(quantity * all_blooks[blook_name].price);
            blooks[blook_name] -= quantity;
          }
        }
      }
    }
    // text2
    // input
  }
  main: while (true) {
    const _select = await select.response_bind(terminal);
    switch (_select) {
      case -1: {
        break main;
      }
      case 0: {
        await render_blooks(Object.keys(blooks));
        break;
      }
      case 1: {
        const packs = Object.keys(data.packs);
        select2.set_choices(packs);
        const _select2 = await select2.response_bind(terminal);
        if (_select2 === -1) continue main;
        const pack_name = packs[_select2];
        const pack_blooks = data.packs[pack_name].blooks;
        const obtained = pack_blooks.filter(blook_name => blooks[blook_name]);
        await render_blooks(obtained);
        break;
      }
      case 2: {
        const missing = Object.keys(all_blooks).filter(blook_name => !blooks[blook_name]);
        await render_blooks(missing);
        break;
      }
      case 3: {
        const packs = Object.keys(data.packs);
        select2.set_choices(packs);
        terminal.push(select2.component);
        const _select2 = await select2.response();
        terminal.pop(select2.component);
        if (_select2 === -1) continue main;
        const pack_name = packs[_select2];
        const pack_blooks = data.packs[pack_name].blooks;
        const missing = pack_blooks.filter(blook_name => !blooks[blook_name]);
        await render_blooks(missing);
        break;
      }
      case 4: {
        await render_blooks(Object.keys(all_blooks));
        break;
      }
      case 5: {
        for (const [blook, quantity] of Object.entries(blooks)) {
          if (quantity === 0) continue;
          const sell = await v1.sell(token, blook, quantity);
          if (sell.error) {
            notif_section.push_error(sell.reason);
            break;
          }
          notif_section.push_success(
            `Successfully sold ${Color.bold(quantity + 'x')} ${Color.bold(blook)} for ${Color.bold('' + quantity * all_blooks[blook].price)} tokens.`
          );
          tokens.add_tokens(quantity * all_blooks[blook].price);
        }
        break;
      }
    }
  }
  terminal.pop(text, select.component);
}
