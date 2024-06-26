import Color from '@lib/color';
import { Text } from '@lib/tui';

type Sts = (s: string) => string;

type Options = {
  /**
   * Whether to display the header inline with the input.
   */
  inline_header?: boolean;
  /**
   * The default value of the input.
   */
  default_value?: string;
  /**
   * The placeholder text to display when the input is empty.
   */
  placeholder?: string;
  /**
   * The function to style the header.
   */
  header_func?: Sts;
  /**
   * The function to style the input if it is valid.
   */
  valid_func?: Sts;
  /**
   * The function to style the input if it is invalid.
   */
  invalid_func?: Sts;
  /**
   * The function to style the placeholder text.
   */
  placeholder_func?: Sts;
  /**
   * The function that takes the current value and returns a mutated version to be rendered. This is useful for password inputs where each character should be changed visually.
   */
  mutate?: Sts;
  /**
   * The function that determines the validity of the input.
   */
  is_valid?: (s: string) => boolean;
};

export default class Input {
  component = new Text(0, 0, '');
  private header: string;
  private value: string;
  private placeholder: string;
  private inline_header: boolean;
  private header_func: Sts;
  private valid_func: Sts;
  private invalid_func: Sts;
  private placeholder_func: Sts;
  private mutate: Sts;
  is_valid: (s: string) => boolean;
  private resolve_func?: (s: string) => void;
  /**
   * Creates a new Input component.
   * @param question The question to ask or header to display.
   * @param options Additional customization options.
   */
  constructor(question: string, options: Options) {
    this.header = question;
    this.value = options.default_value ?? '';
    this.placeholder = options.placeholder ?? '';
    this.inline_header = options.inline_header ?? false;
    this.header_func = options.header_func ?? ((s: string) => Color.green(Color.underline(s)));
    this.valid_func = options.valid_func ?? ((s: string) => Color.white(s));
    this.invalid_func = options.invalid_func ?? ((s: string) => Color.white(s));
    this.placeholder_func = options.placeholder_func ?? ((s: string) => Color.bright_black(s));
    this.mutate = options.mutate ?? ((s: string) => s);
    this.is_valid = options.is_valid ?? (() => true);

    this.component.process_key = (key: string) => {
      if (!this.resolve_func) return false;
      switch (key) {
        case 'key:backspace': {
          this.set_value(this.value.slice(0, -1));
          return true;
        }
        case 'key:enter': {
          this.resolve_func?.(this.value);
          this.resolve_func = undefined;
          this.update_component();
          return true;
        }
        case 'meta:escape': {
          this.resolve_func?.('');
          this.resolve_func = undefined;
          this.update_component();
          return true;
        }
        default: {
          if (key.startsWith('char')) {
            this.set_value(this.value + key.slice(5));
            return true;
          }
          return false;
        }
      }
    };

    this.update_component();
  }
  /**
   * Update the question/header of the component.
   * @param question The new question to ask or header to display.
   */
  set_question(question: string) {
    this.header = question;
    this.update_component();
  }
  /**
   * Update the value of the component.
   * @param value The new value to set. This value is still affected by the `mutate` option.
   */
  set_value(value: string) {
    this.value = value;
    this.update_component();
  }
  /**
   * Wait for the user to respond to the question. Returns the internal value of the input or `''` if the user pressed escape.
   */
  async response(): Promise<string> {
    return new Promise(resolve => {
      this.resolve_func = resolve;
      this.update_component();
    });
  }
  /**
   * Update the component's text component and trigger a redraw.
   */
  private update_component() {
    const default_func = this.resolve_func ? Color.inverse : Color.join;
    const is_valid = this.is_valid(this.value);
    const validity_func = is_valid ? this.valid_func : this.invalid_func;
    this.component.text = default_func(
      Color.underline(this.header_func(this.header)),
      this.inline_header ? ' ' : '\n',
      this.value === '' ? this.placeholder_func(this.placeholder) : validity_func(this.mutate(this.value))
    );
    this.component.attached_terminal?.write_buffer();
  }
}
