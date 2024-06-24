import type { Component } from './src/component';
import { BufferWrapper } from './src/component/BufferWrapper';
import { handleKey } from './src/KeyHandler';

/**
 * Global wrapper for the terminal.
 */
export class Terminal extends BufferWrapper {
  constructor() {
    super();
    this.hideCursor();
    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    process.stdin.resume();
    process.stdin.on('data', (text: string) => this.keyHandler(text));
    process.stdout.on('resize', () => {
      process.stdout.write('\x1b[2J');
      this.write_buffer();
    });
    this.write_buffer();
  }

  showCursor() {
    process.stdout.write('\x1b[?25h');
  }
  hideCursor() {
    process.stdout.write('\x1b[?25l');
  }
  cursorTo(x: number, y: number) {
    process.stdout.write(`\x1b[${y};${x}H`);
  }

  private keyHandler(text: string) {
    const key = handleKey(text);
    if (key === 'meta:quit') {
      this.showCursor();
      process.stdout.write(`\x1b[H\x1b[31mProcess killed by user.\x1b[0m`);
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
