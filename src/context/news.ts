import { Text } from '@lib/tui';
import type { State } from '@ctx/state';

const text = new Text(0, 0, '', 1, 1, false);

export const states = {
  /**
   * News manager.
   * @param state The current state.
   */
  root: async (state: State): Promise<void> => {},
};
