import BaseNetSocket from './base-net-socket';

/**
 * NetSocket implementation using the Chrome app API (chrome.socket)
 */
export default class ChromeNetSocket extends BaseNetSocket {
  constructor(options) {
    super(options);

    this.socketId;
    switch (this.protocol) {
      case "tcp":
        chrome.sockets.tcp.create({}, this.oncreate.bind(this));
        break;
      case "udp":

        break;
      default:
        // TODO: Error
        console.log("Invalid NetSocket protocol provided!");
    }
  }
  connect(host, port) {
    switch (this.protocol) {
      case "tcp":
        chrome.sockets.tcp.connect(this.socketId, host, port, this.onconnect.bind(this));
        break;
      case "udp":
        this.host = host;
        this.port = port;
        this.notify('connect', true);
      default:
        // TODO: Error
    }
  }
  send(data) {
    switch (this.protocol) {
      case "tcp":
        chrome.sockets.tcp.send(this.socketId, data, this.onsend.bind(this));
        break;
      case "udp":
        chrome.sockets.udp.send(this.socketId, data, this.host, this.port, this.onsend.bind(this));
        break;
      default:
        // TODO: Error
    }
  }
  disconnect() {
    if (this.socketId) {
      chrome.sockets.tcp.disconnect(this.socketId, this.ondisconnect.bind(this));
    }
    else {
      // TODO: Error
    }
  }
  close() {
    chrome.sockets.tcp.close(this.socketId, this.onclose.bind(this));
  }
  oncreate(createInfo) {
    this.socketId = createInfo.socketId;
    if (this.socketId > 0) {
      chrome.sockets.tcp.onReceive.addListener(this.onreceive.bind(this));
      chrome.sockets.tcp.onReceiveError.addListener(this.onreceiveerror.bind(this));
      this.notify('create', true);
    }
    else {
      this.notify('create', false);
    }
  }
  onconnect(result) {
    if (result >= 0) {
      this.notify('connect', true);
    }
    else {
      this.notify('connect', false);
    }
  }
  onreceive(info) {
    this.notify('receive', info.data);
  }
  onreceiveerror(info) {
    this.notify('error', "Chrome result code: " + info.resultCode);
    chrome.sockets.tcp.getInfo(this.socketId, function (socketInfo) {
      if (socketInfo.connected === false) {
        this.notify('disconnect');
      }
    }.bind(this));
  }
  onsend(sendInfo) {
    if (sendInfo.resultCode >= 0) {
      this.notify('send', true);
    }
    else {
      this.notify('send', false);
    }
  }
  ondisconnect() {
    this.notify('disconnect');
  }
  onclose() {
    this.notify('close');
  }
}
