export class TerminalBuffer {
  x: number;
  y: number;
  v_align: -1 | 1 = 1;
  h_align: -1 | 1 = 1;
  v_wrap = true;
  private buffer: string | string[];
  constructor(x: number, y: number, buffer?: string | string[], v_align: -1 | 1 = 1, h_align: -1 | 1 = 1, v_wrap = true) {
    this.x = x;
    this.y = y;
    this.buffer = buffer || '';
    this.v_align = v_align;
    this.h_align = h_align;
    this.v_wrap = v_wrap;
    if (h_align === -1) {
      if (typeof this.buffer !== 'string') throw new Error('Horizontal alignment is not supported for multiline buffers.');
      const new_buffer: string[] = [];
      for (const char of this.next_char()) {
        new_buffer.unshift(char);
      }
      this.buffer = new_buffer.join('').split('\n').reverse().join('\n');
    }
  }
  *next_char(): Generator<string> {
    let local_buffer = '';
    for (let i = 0; i < this.buffer.length; i++) {
      const char = this.buffer[i];
      if (char === '\x1b') {
        local_buffer += char;
        continue;
      }
      if (local_buffer.startsWith('\x1b') && !local_buffer.endsWith('m')) {
        local_buffer += char;
        continue;
      }
      const has_reset = this.buffer.slice(i + 1, i + 5) === '\x1b[0m';
      if (has_reset) {
        i += 4;
        yield local_buffer + char + '\x1b[0m';
      } else yield local_buffer + char;
      local_buffer = '';
    }
  }
}
