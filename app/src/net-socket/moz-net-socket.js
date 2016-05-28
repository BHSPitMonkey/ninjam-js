import BaseNetSocket from './base-net-socket';

/**
 * NetSocket implementation using the Firefox's mozTCPSocket
 */
export default class MozNetSocket extends BaseNetSocket {
  constructor(options) {
    super(options);

    this.socket;

    // Just send the oncreate event now, since there is no such action here
    this.notify('create', true);
  }
  connect(host, port) {
    switch (this.protocol) {
      case "tcp":
        this.socket = navigator.mozTCPSocket.open(host, port, {binaryType:"arraybuffer"});
        this.socket.onopen = this.onopen.bind(this);
        this.socket.ondata = this.ondata.bind(this);
        this.socket.onerror = this.onerror.bind(this);
        this.socket.onclose = this.onclose.bind(this);
        break;
      default:
        console.log("Not implemented");
    }
  }
  send(data) {
    if (this.socket) {
      this.socket.send(data);
    }
    else {
      // TODO: Error
    }
  }
  disconnect() {
    // TODO!
  }
  close() {
    if (this.socket) {
      this.socket.close();
    }
    else {
      // TODO: Error
    }
  }
  onopen(event) {
    this.notify('connect', true);
  }
  ondata(event) {
    this.notify('receive', event.data);
  }
  onerror(event) {
    this.notify('error', "MozTCPSocket error message: " + event.data);
  }
  onclose() {
    this.notify('close');
  }
}
