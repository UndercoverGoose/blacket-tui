import Color from '@lib/color';
import { type Terminal } from '@lib/tui';
import { Select, Input, Notification, Searchable } from '@component/.';
import { Dynamic } from '@lib/dynamic';
import { values, fetch } from '@lib/api/src/v1';

const Store: string[] = await new Dynamic<string[]>('proxy.json', []).setup();

const select = new Select('Select an action to perform:', ['[0] Load Previous ', '[1] Add Proxy ']);
const search = new Searchable('Select a Proxy:', []);
const input = new Input('Enter Proxy URL:', {});

export default async function (terminal: Terminal, notif_section: Notification): Promise<void> {
  while (true) {
    select.set_disabled_indexes([Store.length === 0 ? 0 : -1]);
    const _select = await select.response_bind(terminal);
    switch (_select) {
      case -1: {
        return;
      }
      case 0: {
        search.set_choices(Store);
        const _search = await search.response_bind(terminal);
        if (_search === -1) continue;
        values.proxy = Store[_search];
        const res = await fetch('https://icanhazip.com');
        const ip = await res.text();
        notif_section.push(Color.green('Proxy set. IP set to: ', Color.bold(ip)));
        break;
      }
      case 1: {
        const proxy_url = await input.response_bind(terminal);
        if (proxy_url !== '') {
          Store.push(proxy_url);
          notif_section.push(Color.green('Proxy added.'));
        }
        break;
      }
    }
  }
}
