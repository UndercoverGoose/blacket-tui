import WebSocket from 'ws';

export class BlacketWebSocket {
  /**
   * Whether the connection is open or not.
   */
  opened: boolean = false;
  /**
   * WebSocket connection to the server.
   */
  wss: WebSocket | null = null;
  /**
   * Event listeners for Blacket and the WebSocket.
   */
  private listeners: { [event: string]: Function[] } = {};
  /**
   * One-time event listeners for Blacket and the WebSocket.
   */
  private once_listeners: { [event: string]: Function[] } = {};
  /**
   * Creates and opens a new WebSocket connection to the Blacket server.
   * @param token Token to use for authentication
   */
  constructor(token?: string) {
    if (token) this.open(token);
  }
  /**
   * Open a connection to the server.
   * @param token Token to use for authentication
   */
  open(token: string) {
    if (this.opened) return this;
    this.wss = new WebSocket(`wss://blacket.org/worker/socket`, {
      origin: 'https://blacket.org',
      host: 'blacket.org',
      headers: {
        cookie: 'token=' + token,
      },
    });
    this.wss.on('open', () => {
      this.opened = true;
      this.handle_event('open', null);
    });
    this.wss.on('closed', e => {
      this.opened = false;
      this.handle_event('closed', e);
    });
    this.wss.on('message', e => {
      this.handle_event('message', e);
    });
    this.wss.on('error', e => {
      this.handle_event('error', e);
    });
    return this;
  }
  /**
   * Handle an event from the WebSocket connection.
   * @param event Event to handle
   * @param data Data to pass to the event
   */
  private handle_event(event: string, data: any) {
    if (this.once_listeners[event]) {
      for (const callback of this.once_listeners[event]) callback(data);
      this.once_listeners[event] = [];
    }
    if (this.listeners[event]) for (const callback of this.listeners[event]) callback(data);
  }
  /**
   * Close the connection
   */
  close() {
    if (this.wss) this.wss.close();
    this.wss = null;
    this.opened = false;
    return this;
  }
  /**
   * Send raw string data to the server
   * @param data Raw string data to send
   */
  send_string(data: string) {
    if (!this.wss) return this;
    this.wss.send(data);
    return this;
  }
  /**
   * Send JSON data to the server
   * @param data JSON data to send
   */
  send_json(data: Object) {
    return this.send_string(JSON.stringify(data));
  }
  /**
   * Add a one-time event listener for Blacket and WebSocket events.
   * @param event Event to listen for
   * @param callback Callback to run when the event is triggered
   */
  once(event: string, callback: Function) {
    this.once_listeners[event] = this.listeners[event] || [];
    this.once_listeners[event].push(callback);
    return this;
  }
  /**
   * Add a one-time awaitable event listener for Blacket and WebSocket events.
   * @param event Event to listen for
   * @returns Promise that resolves when the event is triggered
   */
  async once_promise(event: string): Promise<null | WebSocket.Event | WebSocket.ErrorEvent | WebSocket.CloseEvent | WebSocket.MessageEvent> {
    this.once_listeners[event] = this.listeners[event] || [];
    return new Promise(resolve => {
      this.once_listeners[event].push(resolve);
    });
  }
  /**
   * Add an event listener for Blacket and WebSocket events.
   * @param event Event to listen for
   * @param callback Callback to run when the event is triggered
   */
  all(event: string, callback: Function) {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(callback);
    return this;
  }
}
