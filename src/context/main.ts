import { type Terminal } from '@lib/tui';
import { Select, Notification, Tokens, Booster } from '@component/.';
import { states as leaderboard } from '@ctx/leaderboard';
import { states as inventory } from '@ctx/inventory';
import market from '@ctx/market';
import { states as statistics } from '@ctx/statistics';
import { states as blooks } from '@ctx/blooks';
import { states as bazaar } from '@ctx/bazaar';

const main_select = new Select(
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
export default async function (terminal: Terminal, token: string, notif_section: Notification, tokens: Tokens, booster: Booster): Promise<void> {
  while (true) {
    const state = {
      terminal,
      token,
      notif_section,
      tokens,
      booster,
    };
    const _select = await main_select.response_bind(terminal);
    switch (_select) {
      case 0: {
        await statistics.root(state);
        break;
      }
      case 1: {
        await leaderboard.root(state);
        break;
      }
      case 4: {
        await market(terminal, token, notif_section, tokens, booster);
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
    }
  }
}
