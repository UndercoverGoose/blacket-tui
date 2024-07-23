import Color from '@lib/color';
import { Text } from '@lib/tui';
import v1 from '@lib/api';

export default class Tokens {
  component = new Text(-1, -1, '', 1, -1);
  multiplier = 0;
  end_time = 0;
  constructor() {
    this.update_component();
    
    setInterval(() => this.refresh(), 10000);
    this.refresh();
  }
  private async refresh() {
    const res = await v1.data();
    if (res.error) return;
    if (res.data.booster.active) {
      this.multiplier = res.data.booster.multiplier;
      this.end_time = res.data.booster.time * 1000;
    } else {
      this.multiplier = 0;
      this.end_time = 0;
    }
    this.update_component();
  }
  private update_component() {
    this.component.text =
      this.multiplier > 0
        ? Color.cyan('Booster Active: ', Color.bold(this.multiplier + 'x'), ' until ', Color.bold(new Date(this.end_time).toLocaleTimeString()))
        : Color.bright_black('No Booster Active');
    this.component.attached_terminal?.write_buffer();
  }
}
