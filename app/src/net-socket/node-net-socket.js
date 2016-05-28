import BaseNetSocket from './base-net-socket';

/**
 * NetSocket implementation using Node's net module
 */
export default class NodeNetSocket extends BaseNetSocket {
  constructor(options) {
    super(options);
    this.net = global.require('net');
    this.socket;

    // Just send the oncreate event now, since there is no such action here
    this.notify('create', true);
  }
  connect(host, port) {
    switch (this.protocol) {
      case "tcp":
        this.socket = this.net.connect({host: host, port: port}, this.onconnect.bind(this));
        this.socket.on('data', this.ondata.bind(this));
        this.socket.on('end', this.onend.bind(this));
        this.socket.on('error', this.onerror.bind(this));
        this.socket.on('close', this.onclose.bind(this));
        break;
      default:
        console.log("Not implemented");
    }
  }
  send(data) {
    // Convert to Node.js Buffer object
    //var view = new Uint8Array(data);
    //var buffer = new Buffer(view);

    var input;
    if (typeof data === 'string') {
      this.socket.write(data);
      return;
    } else if (data instanceof ArrayBuffer) {
      let view = new Uint8Array(data);
      let buf = Buffer.from(view);

      // Pass as binary string because having issues passing as Buffer
      this.socket.write(buf.toString('binary'), 'binary');
      return;
    } else {
      throw new TypeError("NetSocket can only send string or ArrayBuffer");
    }
  }
  disconnect() {
    this.socket.end();
  }
  close() {
    this.socket.destroy();
  }
  onconnect() {
    this.notify('connect', true);
  }
  ondata(data) {
    // Convert from Node.js Buffer object
    var ab = new ArrayBuffer(data.length);
    var view = new Uint8Array(ab);
    view.set(data);
    this.notify('receive', ab);
  }
  onend() {
    this.notify('disconnect');
  }
  onerror(error) {
    this.notify('error', "Node socket error (" + error.name + "): " + error.message);
  }
  onclose(hadError) {
    if (hadError === true) {
      this.notify('error', "Node socket closed due to a transmission error");
    }
    this.notify('close');
  }
}
