import type { Component } from '.';
import { TerminalBuffer } from './Buffer';

class Index {
  private readonly ix;
  x;
  y;
  private col_size;
  private row_size;
  private v_wrap = true;
  constructor(x: number, y: number, col_size: number, row_size: number, v_wrap = true) {
    this.x = x < 0 ? col_size + x : x;
    this.ix = this.x;
    this.y = y < 0 ? row_size + y : y;
    this.col_size = col_size;
    this.row_size = row_size;
    this.v_wrap = v_wrap;
  }
  get linear(): number {
    return this.x + this.y * this.col_size;
  }
  left() {
    this.x--;
    if (this.x < 0) this.up();
  }
  right() {
    this.x++;
    if (this.x >= this.col_size) this.down();
  }
  move_horizontal(direction: -1 | 1) {
    switch (direction) {
      case -1:
        this.left();
        break;
      case 1:
        this.right();
        break;
    }
  }
  up() {
    this.x = this.ix;
    this.y--;
    if (this.y < 0 && this.v_wrap) this.y = 0;
  }
  down() {
    this.x = this.ix;
    this.y++;
    if (this.y >= this.row_size && this.v_wrap) this.y--;
  }
  move_vertical(direction: -1 | 1) {
    switch (direction) {
      case -1:
        this.up();
        break;
      case 1:
        this.down();
        break;
    }
  }
}

/**
 * A component wrapper that builds a combined buffer.
 */
export class BufferWrapper implements Component {
  /**
   * The width of the buffer.
   */
  private width?: number;
  /**
   * The height of the buffer.
   */
  private height?: number;
  constructor(width?: number, height?: number) {
    this.width = width;
    this.height = height;
  }
  /**
   * The x position of the buffer.
   */
  x: number = 0;
  /**
   * The y position of the buffer.
   */
  y: number = 0;
  /**
   * The stack of components to render.
   */
  protected stack: Component[] = [];
  /**
   * Pushes a component to the stack.
   */
  push(...component: Component[]): void {
    this.stack.push(...component);
  }
  /**
   * Pops a component from the stack.
   */
  pop(...component: Component[]): Component[] | undefined {
    this.stack = this.stack.filter(c => !component.includes(c));
    return component;
  }
  /**
   * Creates a buffer from the stack.
   */
  create_buffer(): TerminalBuffer {
    const buffers: TerminalBuffer[] = this.stack.map(component => component.create_buffer());
    let new_buffer = this.create_empty_buffer();
    for (const buffer of buffers) {
      const index = new Index(buffer.x, buffer.y, this.columns, this.rows, buffer.v_wrap);
      for (const char of buffer.next_char()) {
        if (buffer.v_wrap && index.linear >= new_buffer.length) throw new Error('Buffer Overflow');
        if (char.endsWith('\n')) {
          index.move_vertical(buffer.v_align);
          continue;
        }
        if (index.linear < 0 || index.linear >= new_buffer.length) break;
        new_buffer[index.linear] = char.replaceAll('\n', '');
        index.move_horizontal(buffer.h_align);
      }
    }
    return new TerminalBuffer(0, 0, new_buffer);
  }
  /**
   * Creates an empty buffer.
   */
  private create_empty_buffer(): string[] {
    return Array.from({ length: this.columns * this.rows }).fill(' ') as string[];
  }
  /**
   * Returns the number of columns in the buffer (default: terminal columns).
   */
  get columns(): number {
    return this.width ?? process.stdout.columns;
  }
  /**
   * Returns the number of rows in the buffer (default: terminal rows).
   */
  get rows(): number {
    return this.height ?? process.stdout.rows;
  }
}
