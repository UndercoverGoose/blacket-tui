import type { Component } from './src/component';
import { BufferWrapper } from './src/component/BufferWrapper';
import { handle_key } from './src/KeyHandler';

/**
 * Global wrapper for the terminal.
 */
export class Terminal extends BufferWrapper {
  constructor() {
    super();
    this.hide_cursor();
    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    process.stdin.resume();
    process.stdin.on('data', (text: string) => this.key_handler(text));
    process.stdout.on('resize', () => {
      process.stdout.write('\x1b[2J');
      this.write_buffer();
    });
    this.write_buffer();
  }

  show_cursor() {
    process.stdout.write('\x1b[?25h');
  }
  hide_cursor() {
    process.stdout.write('\x1b[?25l');
  }
  cursor_to(x: number, y: number) {
    process.stdout.write(`\x1b[${y};${x}H`);
  }

  private key_handler(text: string) {
    const key = handle_key(text);
    if (key === 'meta:quit') {
      this.show_cursor();
      process.exit(0);
    }
    for (let i = this.stack.length - 1; i >= 0; i--) {
      if (this.stack[i].process_key?.(key)) break;
    }
  }

  push(...component: Component[]): void {
    super.push(...component);
    for (const comp of component) comp.attached_terminal = this;
    this.write_buffer();
  }
  pop(...component: Component[]): Component[] | undefined {
    const popped = super.pop(...component);
    for (const comp of component) delete comp.attached_terminal;
    this.write_buffer();
    return popped;
  }
  write_buffer() {
    const buffer = super.create_buffer();
    let buffer_string = '\x1b[H';
    for (const char of buffer.next_char()) {
      buffer_string += char;
    }
    process.stdout.write(buffer_string);
  }
}

export { Text } from './src/component';
