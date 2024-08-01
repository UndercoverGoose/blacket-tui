import { Select } from '@component/.';
import { states as leaderboard } from '@ctx/leaderboard';
import { states as inventory } from '@ctx/inventory';
import market from '@ctx/market';
import { states as statistics } from '@ctx/statistics';
import { states as blooks } from '@ctx/blooks';
import { states as bazaar } from '@ctx/bazaar';
import { states as scripts } from '@ctx/scripts';
import type { State } from '@ctx/state';

const root_select = new Select(
  'Select a page to view:',
  [
    '[0] Statistics ',
    '[1] Leaderboard ',
    '[2] Chat ',
    '[3] Clan ',
    '[4] Market ',
    '[5] Blooks ',
    '[6] Bazaar ',
    '[7] Inventory ',
    '[8] Settings ',
    '[9] News ',
    '[10] Scripts ',
  ],
  {
    disabled_indexes: [2, 3, 8, 9],
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
        await market(state.terminal, state.token, state.notif_section, state.tokens, state.booster);
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
      case 10: {
        await scripts.root(state);
        break;
      }
    }
  }
}
