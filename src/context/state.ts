import type { Booster, Notification, Tokens } from '@component/.';
import type { Terminal } from '@lib/tui';

export type State = {
  terminal: Terminal;
  token: string;
  notif_section: Notification;
  tokens: Tokens;
  booster: Booster;
};
