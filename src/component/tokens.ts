import Color from '@lib/color';
import { Text } from '@lib/tui';

export default class Tokens {
  component = new Text(-1, -2, '', -1, -1, false);
  private tokens: number;
  /**
   * Creates a tokens component. Only one instance should be created, otherwise they will overlap when rendering.
   * @param tokens The number of tokens to render.
   */
  constructor(tokens: number) {
    this.tokens = tokens;
    this.update_component();
  }
  /**
   * Set the number of tokens to render.
   * @param tokens The number of tokens to render.
   */
  set_tokens(tokens: number) {
    this.tokens = tokens;
    this.update_component();
  }
  /**
   * Add tokens to the current number of tokens.
   * @param tokens The number of tokens to add.
   */
  add_tokens(tokens: number) {
    this.tokens += tokens;
    this.update_component();
  }
  /**
   * Remove tokens from the current number of tokens.
   * @param tokens The number of tokens to remove.
   */
  remove_tokens(tokens: number) {
    this.tokens = Math.max(0, this.tokens - tokens);
    this.update_component();
  }
  /**
   * Get the current number of tokens.
   */
  get_tokens(): number {
    return this.tokens;
  }
  /**
   * Update the component's text component and trigger a redraw.
   */
  private update_component() {
    this.component.text = Color.yellow(this.tokens.toLocaleString() + ' tokens');
    this.component.attached_terminal?.write_buffer();
  }
}
