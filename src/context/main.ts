import { type Terminal, Text } from '@lib/tui';
import Select from '../component/select';
import leaderboard from './leaderboard';
import inventory from './inventory';
import market from './market';

const main_select = new Select(
  'Select a page to view:',
  ['[0] Statistics ', '[1] Leaderboard ', '[2] Chat ', '[3] Clan ', '[4] Market ', '[5] Blooks ', '[6] Bazaar ', '[7] Inventory ', '[8] Settings ', '[9] News '],
  {
    disabled_indexes: [0, 2, 3, 5, 6, 8, 9],
  }
);

/**
 * The main context for navigating the TUI
 * @param terminal Reference to the root terminal
 * @param token The token of the authenticated account
 * @param set_tokens A callback that sets the tokens header value
 */
export default async function (terminal: Terminal, token: string, set_tokens: (t: number | null, d?: number) => void): Promise<void> {
  while (true) {
    terminal.push(main_select.component);
    const _select = await main_select.response();
    terminal.pop(main_select.component);
    switch (_select) {
      case 1: {
        await leaderboard(terminal, token);
        break;
      }
      case 4: {
        await market(terminal, token, set_tokens);
        break;
      }
      case 7: {
        await inventory(terminal, token);
        break;
      }
    }
  }
}
