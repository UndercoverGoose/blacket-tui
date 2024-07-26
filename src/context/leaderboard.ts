import { Text } from '@lib/tui';
import v1 from '@lib/api';
import Color from '@lib/color';
import type { State } from '@ctx/state';

const root_text = new Text(0, 0, '', 1, 1, false);

export const states = {
  /**
   * The leaderboard context for viewing the leaderboard.
   * @param state The current state.
   */
  root: async (state: State): Promise<void> => {
    root_text.text = Color.yellow('Fetching leaderboard...');
    state.terminal.push(root_text);
    const lb_res = await v1.leaderboard(state.token);
    if (lb_res.error) {
      state.terminal.pop(root_text);
      return state.notif_section.push_error(lb_res.reason);
    }
    root_text.text = Color.join(
      Color.green(Color.bold('Token Leaderboard\n')),
      lb_res.tokens
        .map((t, idx) => Color.green(`${idx + 1}. `, Color.hex(t.color, t.username), ' - ', Color.green(t.tokens.toLocaleString(), ' tokens')))
        .join('\n'),
      '\n',
      Color.green(
        `${lb_res.me.tokens.position.tokens}. `,
        Color.hex(lb_res.me.exp.color, lb_res.me.exp.username),
        ' - ',
        Color.green(lb_res.me.tokens.tokens.toLocaleString(), ' tokens')
      ),
      '\n\n',
      Color.green(Color.bold('Experience Leaderboard\n')),
      lb_res.exp
        .map((t, idx) =>
          Color.green(
            `${idx + 1}. `,
            Color.hex(t.color, t.username),
            ' - ',
            Color.green(t.exp.toLocaleString(), ` exp [Level ${Color.bold(t.level.toLocaleString())}]`)
          )
        )
        .join('\n'),
      '\n',
      Color.green(
        `${lb_res.me.exp.position.exp}. `,
        Color.hex(lb_res.me.exp.color, lb_res.me.exp.username),
        ' - ',
        Color.green(lb_res.me.exp.exp.toLocaleString(), ` exp [Level ${Color.bold(lb_res.me.exp.level.toLocaleString())}]`)
      )
    );
    state.terminal.write_buffer();
    return await new Promise(r => {
      root_text.process_key = (key: string) => {
        if (key === 'meta:escape') {
          r();
          state.terminal.pop(root_text);
          return true;
        }
        return false;
      };
    });
  },
};
