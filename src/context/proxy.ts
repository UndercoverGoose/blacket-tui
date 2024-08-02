import Color from '@lib/color';
import { Select, Input, Searchable } from '@component/.';
import { Dynamic } from '@lib/dynamic';
import { values, fetch } from '@lib/api/src/v1';
import type { State } from '@ctx/state';

export const Store: string[] = await new Dynamic<string[]>('proxy.json', []).setup();

const root_select = new Select('Select an action to perform:', ['-> Load Previous ', '-> Add Proxy ', '-> Remove Proxy ']);
const proxy_search = new Searchable('Select a Proxy:', []);
const proxy_input = new Input('Enter Proxy URL:', {});

export const states = {
  root: async (state: State): Promise<void> => {
    while (true) {
      root_select.set_disabled_indexes([Store.length === 0 ? 0 : -1]);
      switch (await root_select.response_bind(state.terminal)) {
        case -1:
          return;
        case 0: {
          await states.select(state);
          break;
        }
        case 1: {
          await states.add(state);
          break;
        }
        case 2: {
          await states.remove(state);
          break;
        }
      }
    }
  },
  select: async (state: State): Promise<void> => {
    proxy_search.set_choices(Store);
    const proxy_index = await proxy_search.response_bind(state.terminal);
    if (proxy_index === -1) return;
    values.proxy = Store[proxy_index];
    const res = await fetch('https://icanhazip.com');
    const ip = await res.text();
    state.notif_section.push(Color.green('Proxy set. IP set to: ', Color.bold(ip)));
  },
  add: async (state: State): Promise<void> => {
    const proxy_url = await proxy_input.response_bind(state.terminal);
    if (proxy_url === '') return;
    Store.push(proxy_url);
    state.notif_section.push(Color.green('Proxy added.'));
  },
  remove: async (state: State): Promise<void> => {
    proxy_search.set_choices(Store);
    const proxy_index = await proxy_search.response_bind(state.terminal);
    if (proxy_index === -1) return;
    Store.splice(proxy_index, 1);
    state.notif_section.push(Color.green('Proxy removed.'));
  },
};
