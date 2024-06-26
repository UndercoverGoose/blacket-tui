import { type Terminal, Text } from '@lib/tui';
import { Select, Notification, Tokens } from '@component/.';
import leaderboard from '@ctx/leaderboard';
import inventory from '@ctx/inventory';
import market from '@ctx/market';
import statistics from '@ctx/statistics';
import blooks from '@ctx/blooks';
import bazaar from '@ctx/bazaar';

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
export default async function (terminal: Terminal, token: string, notif_section: Notification, tokens: Tokens): Promise<void> {
  while (true) {
    const _select = await main_select.response_bind(terminal);
    switch (_select) {
      case 0: {
        await statistics(terminal, token, notif_section, tokens);
        break;
      }
      case 1: {
        await leaderboard(terminal, token, notif_section);
        break;
      }
      case 4: {
        await market(terminal, token, notif_section, tokens);
        break;
      }
      case 5: {
        await blooks(terminal, token, notif_section, tokens);
        break;
      }
      case 6: {
        await bazaar(terminal, token, notif_section, tokens);
        break;
      }
      case 7: {
        await inventory(terminal, token, notif_section, tokens);
        break;
      }
    }
  }
}
