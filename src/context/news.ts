import { type Terminal, Text } from '@lib/tui';
import v1 from '@lib/api';
import Color from '@lib/color';

const text = new Text(0, 0, '', 1, 1, false);

/**
 * The news context for viewing news
 * @param terminal Reference to the root terminal
 * @param token The token of the authenticated account
 */
export default async function (terminal: Terminal, token: string): Promise<void> {
  return;
  //! create scrollview component
}
