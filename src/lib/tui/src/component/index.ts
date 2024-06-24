import type { Terminal } from "@lib/tui";
import type { TerminalBuffer } from "./Buffer";

export interface Component {
  attached_terminal?: Terminal;
  x: number;
  y: number;
  create_buffer(): TerminalBuffer;
  process_key?(key: string): boolean;
}

import { Text } from "./Text";
export { Text };