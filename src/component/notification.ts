import Color from '@lib/color';
import { Text } from '@lib/tui';

export default class Notification {
  private limit: number;
  private duration: number;
  component: Text;
  messages: [string, number][] = [];
  /**
   * Creates a notification component. Only one instance should be created, otherwise they will overlap when rendering.
   * @param limit The maximum number of messages to display at once.
   * @param duration The duration in milliseconds to display each message for.
   */
  constructor(limit = 10, duration = 10000) {
    this.component = new Text(-2, -1, '', -1, -1, false);
    this.limit = limit;
    this.duration = duration;
  }
  /**
   * Push a message to the notification stack.
   * @param message The raw message to render.
   * @param ignore_stacking Whether to ignore stacking with the previous message.
   * @param custom_duration_ms The duration in milliseconds to display the message for.
   */
  push(message: string, ignore_stacking = false, custom_duration_ms?: number) {
    setTimeout(() => this.pop(), custom_duration_ms ?? this.duration);
    if (!ignore_stacking && this.messages.length > 0 && this.messages.at(-1)![0] === message) this.messages.at(-1)![1]++;
    else this.messages.push([message, 1]);
    this.update_component();
  }
  /**
   * Build and push an error message to the notification stack.
   * @param error The error message to render.
   * @param ignore_stacking Whether to ignore stacking with the previous message.
   * @param custom_duration_ms The duration in milliseconds to display the message for.
   */
  push_error(error: string, ignore_stacking = false, custom_duration_ms?: number) {
    this.push(Color.red(Color.bold('Error:'), ' ', error), ignore_stacking, custom_duration_ms);
  }
  /**
   * Build and push a success message to the notification stack.
   * @param message The success message to render.
   * @param ignore_stacking Whether to ignore stacking with the previous message.
   * @param custom_duration_ms The duration in milliseconds to display the message for.
   */
  push_success(message: string, ignore_stacking = false, custom_duration_ms?: number) {
    this.push(Color.green(Color.bold('Success:'), ' ', message), ignore_stacking, custom_duration_ms);
  }
  /**
   * Pop the oldest message from the notification stack. This method is called automatically after the duration of the message has expired. Calling from outside is not recommended.
   */
  private pop() {
    const message = this.messages.shift();
    if (!message) return;
    if (message[1] > 1) {
      this.messages.unshift([message[0], message[1] - 1]);
    }
    this.update_component();
  }
  /**
   * Update the component with the current messages.
   */
  private update_component() {
    this.component.text = this.messages
      .slice(-this.limit)
      .reverse()
      .map(([message, count]) => `${message}${count > 1 ? Color.bright_black(` [${count}x]`) : ''}`)
      .join('\n');
    this.component.attached_terminal?.write_buffer();
  }
}
