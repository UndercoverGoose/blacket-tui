import { type Terminal, Text } from '@lib/tui';
import v1 from '@lib/api';
import Color from '@lib/color';

const text = new Text(0, 0, '', 1, 1, false);

export default async function (terminal: Terminal, token: string): Promise<void> {
  text.text = Color.yellow('Fetching leaderboard...');
  terminal.push(text);
  const lb = await v1.leaderboard(token);
  if (lb.error) {
    text.text += Color.red(`\nFailed to fetch leaderboard: ${lb.reason}`);
    terminal.write_buffer();
    return;
  }
  text.text = Color.join(
    Color.green(Color.bold('Token Leaderboard\n')),
    lb.tokens.map((t, idx) => Color.green(`${idx + 1}. `, Color.hex(t.color, t.username), ' - ', Color.green(t.tokens.toLocaleString(), ' tokens'))).join('\n'),
    '\n',
    Color.green(
      `${lb.me.tokens.position.tokens}. `,
      Color.hex(lb.me.exp.color, lb.me.exp.username),
      ' - ',
      Color.green(lb.me.tokens.tokens.toLocaleString(), ' tokens')
    ),
    '\n\n',
    Color.green(Color.bold('Experience Leaderboard\n')),
    lb.exp
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
      `${lb.me.exp.position.exp}. `,
      Color.hex(lb.me.exp.color, lb.me.exp.username),
      ' - ',
      Color.green(lb.me.exp.exp.toLocaleString(), ` exp [Level ${Color.bold(lb.me.exp.level.toLocaleString())}]`)
    )
  );
  terminal.write_buffer();
  return await new Promise(r => {
    text.process_key = (key: string) => {
      if (key === 'meta:escape') {
        r();
        terminal.pop(text);
        return true;
      }
      return false;
    };
  });
}
