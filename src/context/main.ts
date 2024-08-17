import { Select } from '@component/.';
import { states as leaderboard } from '@ctx/leaderboard';
import { states as inventory } from '@ctx/inventory';
import { states as market } from '@ctx/market';
import { states as statistics } from '@ctx/statistics';
import { states as blooks } from '@ctx/blooks';
import { states as bazaar } from '@ctx/bazaar';
import { states as scripts } from '@ctx/scripts';
import { states as settings } from '@ctx/settings';
import type { State } from '@ctx/state';

const root_select = new Select(
  'Select a page to view:',
  [
    '-> Statistics ',
    '-> Leaderboard ',
    '-> Chat ',
    '-> Clan ',
    '-> Market ',
    '-> Blooks ',
    '-> Bazaar ',
    '-> Inventory ',
    '-> Settings ',
    '-> News ',
    '-> Scripts ',
  ],
  {
    disabled_indexes: [2, 3, 9],
  }
);

/**
 * The main context for navigating the TUI
 * @param terminal Reference to the root terminal
 * @param token The token of the authenticated account
 * @param notif_section The global notification component
 * @param tokens The global tokens component
 */
export default async function (state: State): Promise<void> {
  while (true) {
    switch (await root_select.response_bind(state.terminal)) {
      case 0: {
        await statistics.root(state);
        break;
      }
      case 1: {
        await leaderboard.root(state);
        break;
      }
      case 4: {
        await market.root(state);
        break;
      }
      case 5: {
        await blooks.root(state);
        break;
      }
      case 6: {
        await bazaar.root(state);
        break;
      }
      case 7: {
        await inventory.root(state);
        break;
      }
      case 8: {
        await settings.root(state);
        break;
      }
      case 10: {
        await scripts.root(state);
        break;
      }
    }
  }
}
