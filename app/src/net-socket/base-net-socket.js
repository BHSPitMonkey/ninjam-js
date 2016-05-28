/**
 * Base class for socket implementation wrappers
 */
export default class BaseNetSocket {
  constructor(options) {
    this.protocol = options.protocol || "tcp";
    this.callbacks = {
      create: options['onCreate'],
      connect: options['onConnect'],
      receive: options['onReceive'],
      error: options['onError'],
      send: options['onSend'],
      disconnect: options['onDisconnect'],
      close: options['onClose'],
    };
  }
  notify(event, args) {
    if (this.callbacks[event]) {
      this.callbacks[event](args);
    }
  }
}
