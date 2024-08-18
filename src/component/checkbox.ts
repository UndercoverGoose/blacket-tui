import Color from '@lib/color';
import { Terminal, Text } from '@lib/tui';

type Options = {
  /**
   * The default selected index.
   */
  selected_index?: number;
  /**
   * The default checked indexes.
   */
  checked_indexes?: number[];
  /**
   * The default search value.
   */
  search_value?: string;
  /**
   * The default placeholder value.
   */
  placeholder?: string;
  /**
   * The function to filter the choices by.
   */
  filter_func?: (s: string, v: string) => boolean;
  /**
   * The function to mutate the matched values before rendering.
   */
  mutate?: (s: string) => string;
};

export default class {
  component = new Text(0, 0, '', 1, 1, false);
  private question: string;
  private all_choices: string[];
  private visible_choices_indexes: number[];
  private selected_index: number;
  private checked_indexes: number[];
  private search_value: string;
  private placeholder: string;
  private filter_func?: (s: string, v: string) => boolean;
  private resolve_func?: (s: number[]) => void;
  mutate_func: (s: string) => string;
  /**
   * Creates a new Searchable select component.
   * @param question The question to ask or header to display.
   * @param choices The options to choose from.
   * @param options Additional customization options.
   */
  constructor(question: string, choices: string[], options?: Options) {
    this.question = question;
    this.all_choices = choices;
    this.visible_choices_indexes = choices.map((_, i) => i);
    this.selected_index = options?.selected_index ?? 0;
    this.checked_indexes = options?.checked_indexes ?? [];
    this.search_value = options?.search_value ?? '';
    this.placeholder = options?.placeholder ?? 'Search...';
    this.filter_func = options?.filter_func;
    this.mutate_func = options?.mutate || (s => s);

    this.component.process_key = (key: string) => {
      if (!this.resolve_func) return false;
      switch (key) {
        case 'arrow:up': {
          this.move_up();
          return true;
        }
        case 'arrow:down': {
          this.move_down();
          return true;
        }
        case 'key:enter': {
          if (this.visible_choices_indexes.length === 0) this.selected_index = -1;
          this.resolve_func?.(this.checked_indexes);
          this.resolve_func = undefined;
          return true;
        }
        case 'meta:tab': {
          this.toggle_index_check(this.selected_index);
          return true;
        }
        case 'meta:escape': {
          this.resolve_func?.([]);
          this.resolve_func = undefined;
          return true;
        }
        case 'key:backspace': {
          this.search_value = this.search_value.slice(0, -1);
          this.run_filter();
          this.update_component();
          return true;
        }
        default: {
          if (key.startsWith('char')) {
            this.search_value += key.slice(5);
            this.run_filter();
            return true;
          } else return false;
        }
      }
    };

    this.update_component();
  }
  set_choices(choices: string[]) {
    this.all_choices = choices;
    this.visible_choices_indexes = choices.map((_, i) => i);
    this.selected_index = 0;
    this.search_value = '';
    this.update_component();
  }
  private move_up() {
    const pseudo_index = this.get_pseduo_index();
    this.selected_index = this.visible_choices_indexes[(pseudo_index - 1 + this.visible_choices_indexes.length) % this.visible_choices_indexes.length];
    this.update_component();
  }
  private move_down() {
    const pseudo_index = this.get_pseduo_index();
    this.selected_index = this.visible_choices_indexes[(pseudo_index + 1) % this.visible_choices_indexes.length];
    this.update_component();
  }
  private get_pseduo_index(): number {
    const pseudo_index = this.visible_choices_indexes.indexOf(this.selected_index);
    if (pseudo_index === -1) {
      this.selected_index = this.visible_choices_indexes[0];
      return -1;
    }
    return pseudo_index;
  }
  private toggle_index_check(index: number) {
    if (this.checked_indexes.includes(index)) {
      this.checked_indexes = this.checked_indexes.filter(i => i !== index);
    } else {
      this.checked_indexes.push(index);
    }
    this.update_component();
  }
  private run_filter() {
    const new_choices = this.all_choices
      .map((choice, index) => [choice, index] as const)
      .filter(([choice, _]) => {
        if (this.filter_func) return this.filter_func(choice, this.search_value);
        return choice.toLowerCase().includes(this.search_value.toLowerCase());
      });
    this.visible_choices_indexes = new_choices.map(([_, index]) => index);
    if (!this.visible_choices_indexes.includes(this.selected_index)) {
      this.move_down();
    }
    this.update_component();
  }
  /**
   * Wait for the user to respond to the question. Returns the index of the selected option, or `-1` if the user cancels with escape.
   */
  async response(): Promise<number[]> {
    this.update_component();
    return new Promise(resolve => {
      this.resolve_func = resolve;
    });
  }
  /**
   * Wait for the user to respond to the question. Returns the index of the selected option, or `-1` if the user cancels with escape. This method automatically binds the component to the terminal and removes it afterwards.
   */
  async response_bind(terminal: Terminal): Promise<number[]> {
    terminal.push(this.component);
    const res = await this.response();
    terminal.pop(this.component);
    return res;
  }
  /**
   * Update the component's text component and trigger a redraw.
   */
  private update_component() {
    this.component.text = Color.join(
      Color.green(Color.underline(this.question + '\n')),
      this.search_value ? Color.yellow(this.search_value) : Color.bright_black(this.placeholder),
      '\n',
      this.all_choices
        .map((choice, index) => [choice, index] as const)
        .filter((_, index) => this.visible_choices_indexes.includes(index))
        .map(([choice, index]) => {
          choice = (this.checked_indexes.includes(index) ? '✔ ' : '  ') + choice;
          if (index === this.selected_index) return Color.inverse(Color.green(this.mutate_func(choice)));
          return Color.green(this.mutate_func(choice));
        })
        .join('\n')
    );
  }
}
