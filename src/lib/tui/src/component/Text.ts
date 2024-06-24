import type { Terminal } from '@lib/tui';
import type { Component } from '.';
import { TerminalBuffer } from './Buffer';

export class Text implements Component {
  attached_terminal?: Terminal;
  x: number;
  y: number;
  text: string;
  v_align: -1 | 1 = 1;
  h_align: -1 | 1 = 1;
  v_wrap = true;
  constructor(x: number, y: number, text: string, v_align: -1 | 1 = 1, h_align: -1 | 1 = 1, v_wrap = true) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.v_align = v_align;
    this.h_align = h_align;
    this.v_wrap = v_wrap;
  }
  create_buffer(): TerminalBuffer {
    return new TerminalBuffer(this.x, this.y, this.text, this.v_align, this.h_align, this.v_wrap);
  }
  process_key(key: string): boolean {
    return false;
  }
}
