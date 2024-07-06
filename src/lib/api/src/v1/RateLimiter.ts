export class RateLimiter {
  private limit: number;
  private random: boolean;
  private random_range: number;
  private last_trigger = 0;
  constructor(limit_ms: number, variable = false, variable_range_ms = 0) {
    this.limit = limit_ms;
    this.random = variable;
    this.random_range = variable_range_ms;
  }
  async wait(): Promise<void> {
    if (Date.now() - this.last_trigger < this.limit) {
      const ttf = this.limit - (Date.now() - this.last_trigger);
      await new Promise(r => setTimeout(r, ttf + this.get_delay()));
    }
    return;
  }
  hit(): void {
    this.last_trigger = Date.now();
  }
  private get_delay(): number {
    if (!this.random) return 0;
    return Math.floor(Math.random() * this.random_range);
  }
}
