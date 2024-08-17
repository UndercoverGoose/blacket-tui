import Color from '@lib/color';
import { Terminal, Text } from '@lib/tui';
import { Searchable, Select, Input, Checkbox } from '.';

export type Property = {
  /**
   * Whether the property cannot be changed.
   */
  static?: boolean;
  /**
   * The display name of the property.
   */
  display?: string;
  /**
   * The description of the property.
   */
  description?: string;
} & (
  | {
      type: 'string';
      default?: string;
      required?: boolean;
    }
  | {
      type: 'number';
      default?: number;
      min?: number;
      max?: number;
      allow_float?: boolean;
    }
  | {
      type: 'boolean';
      default?: boolean;
    }
  | {
      type: 'select';
      default?: string | number;
      choices: (string | number)[];
      required?: boolean;
    }
  | {
      type: 'array';
      default?: (string | number)[];
      choices: (string | number)[];
    }
  | {
      type: 'object';
      props: {
        [key: string]: Property;
      };
    }
);

export type Schema = Property;

export default class<T extends Object> {
  component = new Text(0, 0, '');
  /**
   * The object to configure. Modifications outside of the configure component are not recommended. If the object is modified, make sure the user is not currently editing a property, and refresh the display.
   */
  source_object: T;
  /**
   * The schema to configure the object with. Modifications during runtime are not recommended. If the schema is modified, make sure the user is not currently editing a property, and refresh the display.
   */
  source_schema: Schema;
  /**
   * The resolved value that indicates if the user cancelled or confirmed the configuration.
   * @returns `true` if the user confirmed the configuration, `false` if the user cancelled the configuration.
   */
  private resolve_func?: (c: boolean) => void;
  private selected_row = 0;
  private key_path: string[] = [];
  /**
   * Creates a new configure component.
   * @param source_object The object to configure.
   * @param source_schema The schema to configure the object with.
   */
  constructor(source_object: T, source_schema: Schema) {
    this.source_object = source_object;
    this.source_schema = source_schema;
    this.component.process_key = (key: string) => {
      if (!this.resolve_func) return false;
      switch (key) {
        case 'arrow:up': {
          this.nav_up();
          return true;
        }
        case 'arrow:down': {
          this.nav_down();
          return true;
        }
        case 'key:enter': {
          this.nav_in();
          return true;
        }
        case 'meta:escape': {
          if (this.key_path.length === 0) this.resolve_func(false);
          else this.nav_out();
          return true;
        }
        default:
          return false;
      }
    };
    this.update_component();
  }
  private resolve_object_path(): [Object, string | null] {
    if (this.key_path.length === 0) return [this.source_object, null];
    let obj = this.source_object;
    for (const key of this.key_path) {
      const temp = obj[key as keyof Object];
      if (temp === undefined) throw new Error(`Invalid key path navigating Source: ${this.key_path.join('.')}`);
      if (typeof temp !== 'object' || Array.isArray(temp)) {
        return [obj, key];
      }
      obj = temp;
    }
    return [obj, null];
  }
  private resolve_schema_path(): Schema {
    if (this.key_path.length === 0) return this.source_schema;
    let obj = this.source_schema;
    for (const key of this.key_path) {
      if (obj.type !== 'object') {
        return obj;
      }
      const temp = obj.props[key];
      if (temp === undefined) throw new Error(`Invalid key path navigating Schema: ${this.key_path.join('.')}`);
      obj = temp;
    }
    return obj;
  }
  private update_object_by_path(value: any) {
    const [obj, key] = this.resolve_object_path();
    if (!key) throw new Error(`Invalid key path updating property: ${this.key_path.join('.')}`);
    obj[key as keyof Object] = value;
  }
  private nav_down() {
    this.selected_row++;
    this.update_component();
  }
  private nav_up() {
    this.selected_row--;
    this.update_component();
  }
  private async nav_in(key?: string) {
    if (!key) this.update_component(await this.update_component());
    else {
      this.key_path.push(key);
      this.selected_row = 0;
      this.update_component();
    }
    return 2;
  }
  private nav_out() {
    this.key_path.pop();
    this.selected_row = 0;
    this.update_component();
  }
  /**
   * Wait for the user to finish configuring the object. Returns `true` if the user confirmed the configuration, `false` if the user cancelled the configuration.
   */
  async response(): Promise<boolean> {
    return new Promise(resolve => {
      this.resolve_func = resolve;
    });
  }
  /**
   * Wait for the user to finish configuring the object. Returns `true` if the user confirmed the configuration, `false` if the user cancelled the configuration.  This method automatically binds the component to the terminal and removes it afterwards.
   */
  async response_bind(terminal: Terminal): Promise<boolean> {
    terminal.push(this.component);
    const res = await this.response();
    terminal.pop(this.component);
    return res;
  }
  private async update_component(row_in?: number): Promise<number> {
    let rows: string[] = [];

    const [obj, key] = this.resolve_object_path();
    const schema = this.resolve_schema_path();

    if (key && schema.type === 'object') throw new Error(`Schema conflicts with source: ${this.key_path.join('.')}`);

    if (!key) {
      if (schema.type !== 'object') throw new Error(`Schema conflicts with source: ${this.key_path.join('.')}`);
      rows.push(Color.underline('Select a property to edit:'));
      if (this.key_path.length > 0) {
        if (rows.push(`<- ${Color.green('Back')}`) === row_in) {
          this.nav_out();
          return 2;
        }
      } else {
        if (rows.push(`<- ${Color.green('Confirm Configuration')}`) === row_in) {
          this.resolve_func?.(true);
          return 2;
        }
      }
      const props = schema.props;
      for (const key in props) {
        const prop = props[key];
        const value = obj[key as keyof Object] as any;
        const type = prop.type;
        const display: string = Color.white(prop.display || key);
        const description: string = prop.description || '';

        let row: string = '';
        switch (type) {
          case 'string': {
            row = (value as string) ? Color.yellow(value as string) : prop.required ? Color.red('*missing*') : '';
            break;
          }
          case 'number': {
            row = `-> ${display} = ${Color.yellow((value as number).toString())}`;
            break;
          }
          case 'boolean': {
            const tr = (value as boolean) ? Color.green('true') : Color.red('false');
            row = `-> ${display} = ${tr}`;
            break;
          }
          case 'object': {
            row = `-> ${display} = ${Color.blue('{ ... }')}`;
            break;
          }
          case 'select': {
            const v = (value as string) ? Color.yellow(value as string) : prop.required ? Color.red('*missing*') : '';
            row = `-> ${display} = ${v}`;
            break;
          }
          case 'array': {
            row = `-> ${display} = ${Color.blue('[ ... ]')}`;
            break;
          }
          default: {
            row = `-> ${display} - ${type}`;
          }
        }
        if (rows.push(row) === row_in) {
          return this.nav_in(key);
        }
      }
    } else {
      this.component.text = '';
      const path = `'${Color.yellow(this.key_path.join('.'))}'`;
      switch (schema.type) {
        case 'string': {
          const input = new Input(`Enter new value for ${path}:`, {});
          const res = await input.response_bind(this.component.attached_terminal!);
          if (res !== '') this.update_object_by_path(res);
          this.nav_out();
          return 2;
        }
        case 'number': {
          const min = schema.min ?? -Infinity;
          const max = schema.max ?? Infinity;
          const can_float = schema.allow_float ?? false;
          const is_valid = (s: string) => {
            const num = Number(s.replaceAll(',', ''));
            return !(isNaN(num) || (!can_float && num.toString().includes('.')) || num < min || num > max);
          };
          const input = new Input(`Enter new value for ${path}:`, {
            inline_header: false,
            placeholder: obj[key as keyof Object].toString(),
            header_func: (s: string) => Color.reset(Color.green(s)),
            is_valid,
            mutate: (s: string) => {
              const s_num = Number(s.replaceAll(',', ''));
              if (is_valid(s)) return Color.reset(Color.green(Color.underline(s), ' = ', s_num.toLocaleString()));
              return Color.reset(Color.red(s));
            },
          });
          const res = await input.response_bind(this.component.attached_terminal!);
          if (res !== '' && input.is_valid(res)) {
            const num = Number(res.replaceAll(',', ''));
            this.update_object_by_path(num);
          }
          this.nav_out();
          return 2;
        }
        case 'boolean': {
          const select = new Select(`Select new value for ${path}:`, ['-> true ', '-> false ']);
          const res_idx = await select.response_bind(this.component.attached_terminal!);
          if (res_idx !== -1) this.update_object_by_path(res_idx === 0);
          this.nav_out();
          return 2;
        }
        case 'object': {
          throw new Error(`Cannot edit object type: ${this.key_path.join('.')}`);
        }
        case 'select': {
          const search = new Searchable(
            `Select new value for ${path}:`,
            schema.choices.map((c: string | number) => c.toString())
          );
          const res_idx = await search.response_bind(this.component.attached_terminal!);
          if (res_idx !== -1) {
            this.update_object_by_path(schema.choices[res_idx]);
          }
          this.nav_out();
          return 2;
        }
        case 'array': {
          const checked = (obj[key as keyof Object] as any as number[]).map(v => schema.choices.indexOf(v));
          const checkbox = new Checkbox(
            `Select new values for ${path}:`,
            schema.choices.map((c: string | number) => c.toString() + ' '),
            {
              checked_indexes: checked,
            }
          );
          const res_idxes = await checkbox.response_bind(this.component.attached_terminal!);
          if (res_idxes.length > 0) {
            this.update_object_by_path(res_idxes.map(i => schema.choices[i]));
          }
          this.nav_out();
          return 2;
        }
      }
    }

    const selected_row = this.selected_row < 0 ? rows.length + this.selected_row - 1 : this.selected_row % (rows.length - 1);
    rows[selected_row + 1] = Color.bold(Color.underline(rows[selected_row + 1]));
    this.selected_row = selected_row;

    this.component.text = Color.green(rows.join('\n'));

    return selected_row + 2;
  }
}
