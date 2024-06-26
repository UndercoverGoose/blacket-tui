import { type Terminal, Text } from '@lib/tui';
import v1 from '@lib/api';
import Color from '@lib/color';
import { Notification } from '@component/.';

const text = new Text(0, 0, '', 1, 1, false);

/**
 * The news context for viewing news
 * @param terminal Reference to the root terminal
 * @param token The token of the authenticated account
 * @param notif_section The global notification component
 */
export default async function (terminal: Terminal, token: string, notif_section: Notification): Promise<void> {
  return;
  //! create scrollview component
}
