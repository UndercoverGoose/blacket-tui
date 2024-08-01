import Color from '@lib/color';
import { Text } from '@lib/tui';
import type { User } from '@lib/api/src/v1/user';

export default class Tokens {
  component = new Text(-1, 1, '', 1, -1);
  user: User | null = null;
  constructor() {
    this.update_component();
  }
  set_user(user: User) {
    this.user = user;
    this.update_component();
  }
  private update_component() {
    if (!this.user) return (this.component.text = '');
    this.component.text = Color.join(
      Color.hex(this.user.color, this.user.username),
      ' ',
      this.user.clan ? Color.hex(this.user.clan.color, `[${this.user.clan.name}]`) : ''
    );
  }
}
