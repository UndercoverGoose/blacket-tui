function* next_char(buffer: string): Generator<string> {
  let local_buffer = '';
  for (let i = 0; i < buffer.length; i++) {
    const char = buffer[i];
    if (char === '\x1b') {
      local_buffer += char;
      continue;
    }
    if (local_buffer.startsWith('\x1b') && !local_buffer.endsWith('m')) {
      local_buffer += char;
      continue;
    }
    const has_reset = buffer.slice(i + 1, i + 5) === '\x1b[0m';
    if (has_reset) {
      i += 4;
      yield local_buffer + char + '\x1b[0m';
    } else yield local_buffer + char;
    local_buffer = '';
  }
}

/**
 * Applies ANSI color codes to a string.
 * @param code The ANSI color code.
 * @param strs The strings to apply the color code to.
 * @returns The colored string.
 */
export function ac(code: number | string, ...strs: (string | string[])[]): string {
  code = typeof code === 'number' ? `\x1b[${code}m` : code;
  const str = strs.flat().join('');
  const new_str: string[] = [];

  for (const char of next_char(str)) {
    if (char.includes('\n')) {
      new_str.push(char);
      continue;
    }
    const suffix = char.endsWith('\x1b[0m') ? '' : '\x1b[0m';
    new_str.push(code + char + suffix);
  }

  return new_str.join('');
}

/**
 * Parses a hex color to an ANSI color code.
 * @param hex The hex color to parse. May be prefixed by `#`. Must be full length.
 * @returns The ANSI color code.
 */
export function parse_hex_ansi(hex: string): string {
  if(hex.startsWith('#')) hex = hex.slice(1);
  if (hex.length !== 6) throw new Error('Invalid Hex Color.');
  return hex
    .match(/.{1,2}/g)!
    .map(h => parseInt(h, 16).toString())
    .join(';');
}
