import Color from '@lib/color';
import { Text } from '@lib/tui';

type Options = {
  selected_index?: number;
  disabled_indexes?: number[];
  header_func?: (s: string) => string;
  choice_func?: (s: string) => string;
  selected_func?: (s: string) => string;
  disabled_func?: (s: string) => string;
};

export default class Select {
  component = new Text(0, 0, '');
  private question: string;
  private choices: string[];
  private selected_index: number;
  private disabled_indexes: number[];
  private header_func: (s: string) => string;
  private choice_func: (s: string) => string;
  private selected_func: (s: string) => string;
  private disabled_func: (s: string) => string;
  private resolve_func?: (s: number) => void;
  constructor(question: string, choices: string[], options?: Options) {
    this.question = question;
    this.choices = choices;
    this.selected_index = options?.selected_index ?? 0;
    this.disabled_indexes = options?.disabled_indexes ?? [];
    this.header_func = options?.header_func ?? ((s: string) => Color.green(Color.underline(s)));
    this.choice_func = options?.choice_func ?? ((s: string) => Color.green(s));
    this.selected_func = options?.selected_func ?? ((s: string) => Color.bg_green(Color.black(s)));
    this.disabled_func = options?.disabled_func ?? ((s: string) => Color.bright_black(s));

    this.component.process_key = (key: string) => {
      if (!this.resolve_func) return false;
      switch (key) {
        case 'arrow:up': {
          this.set_selected_index(Math.max(0, this.selected_index - 1), true);
          this.component.attached_terminal?.write_buffer();
          return true;
        }
        case 'arrow:down': {
          this.set_selected_index(Math.min(this.choices.length - 1, this.selected_index + 1));
          this.component.attached_terminal?.write_buffer();
          return true;
        }
        case 'key:enter': {
          this.resolve_func?.(this.selected_index);
          this.resolve_func = undefined;
          return true;
        }
        case 'meta:escape': {
          this.resolve_func?.(-1);
          this.resolve_func = undefined;
          return true;
        }
        default:
          return false;
      }
    };

    this.set_selected_index(this.selected_index);
    this.update_component();
  }
  set_question(question: string) {
    this.question = question;
    this.update_component();
  }
  set_options(options: string[]) {
    this.choices = options;
    this.update_component();
  }
  set_selected_index(selected_index: number, _is_up?: true) {
    this.selected_index = selected_index;
    if (this.disabled_indexes.includes(selected_index)) {
      if (_is_up) this.set_to_next_available_index_reverse();
      else this.set_to_next_available_index();
    }
    this.update_component();
  }
  set_disabled_indexes(disabled_indexes: number[]) {
    this.disabled_indexes = disabled_indexes;
    this.set_to_next_available_index();
    this.update_component();
  }
  private set_to_next_available_index() {
    if (this.disabled_indexes.length === this.choices.length) return;
    let next_index = this.selected_index;
    while (this.disabled_indexes.includes(next_index)) {
      next_index = (next_index + 1) % this.choices.length;
    }
    this.selected_index = next_index;
  }
  private set_to_next_available_index_reverse() {
    if (this.disabled_indexes.length === this.choices.length) return;
    let next_index = this.selected_index;
    while (this.disabled_indexes.includes(next_index)) {
      next_index = (next_index - 1 + this.choices.length) % this.choices.length;
    }
    this.selected_index = next_index;
  }
  async response(): Promise<number> {
    return new Promise(resolve => {
      this.resolve_func = resolve;
    });
  }
  private update_component() {
    this.component.text = Color.join(
      this.header_func(this.question + '\n'),
      ...this.choices.map((choice, index) => {
        if (this.disabled_indexes.includes(index)) return this.disabled_func(choice + '\n');
        if (index === this.selected_index) return this.selected_func(choice + '\n');
        return this.choice_func(choice + '\n');
      })
    );
    this.component.attached_terminal?.write_buffer();
  }
}
