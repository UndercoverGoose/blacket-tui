import { type Terminal, Text } from '@lib/tui';
import { Select, Notification } from '@component/.';
import leaderboard from '@ctx/leaderboard';
import inventory from '@ctx/inventory';
import market from '@ctx/market';
import statistics from '@ctx/statistics';
import blooks from '@ctx/blooks';

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
    disabled_indexes: [2, 3, 6, 8, 9],
  }
);

/**
 * The main context for navigating the TUI
 * @param terminal Reference to the root terminal
 * @param token The token of the authenticated account
 * @param notif_section The global notification component
 * @param set_tokens A callback that sets the tokens header value
 */
export default async function (
  terminal: Terminal,
  token: string,
  notif_section: Notification,
  set_tokens: (t: number | null, d?: number) => void
): Promise<void> {
  while (true) {
    const _select = await main_select.response_bind(terminal);
    switch (_select) {
      case 0: {
        await statistics(terminal, token, notif_section, set_tokens);
        break;
      }
      case 1: {
        await leaderboard(terminal, token, notif_section);
        break;
      }
      case 4: {
        await market(terminal, token, notif_section, set_tokens);
        break;
      }
      case 5: {
        await blooks(terminal, token, notif_section, set_tokens);
        break;
      }
      case 7: {
        await inventory(terminal, token, notif_section);
        break;
      }
    }
  }
}
