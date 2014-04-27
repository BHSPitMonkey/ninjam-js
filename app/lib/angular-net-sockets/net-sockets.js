/*
 * @project angular-net-sockets
 * @version 0.1
 * @author Stephen Eisenhauer <bhs2007@gmail.com>
 * @license MIT
*/

'use strict';

angular.module('stepheneisenhauer.netsockets', []).
  /**
   * The factory you should use in your application code. Returns the
   * appropriate implementation for your platform.
   */
  factory('NetSocket', ['NodeNetSocket', 'ChromeNetSocket', 'MozNetSocket', function (NodeNetSocket, ChromeNetSocket, MozNetSocket) {
    if (typeof require !== 'undefined' && require('net')) {
      return NodeNetSocket;
    }
    else if (typeof chrome !== 'undefined' && chrome.sockets) {
      return ChromeNetSocket;
    }
    else if (navigator.mozTCPSocket) {
      return MozNetSocket;
    }
    else {
      // Raise some kind of error
    }
  }]).
  /**
   * The base class for all of the platform-specific NetSocket implementations.
   * Defines a constructor that is shared among all of the subclasses as-is.
   * Should not be used directly.
   */
  factory('BaseNetSocket', function() {
    /**
     * The constructor used by all implementations of this base class.
     * Sets up all options and callbacks given via the "options" parameter.
     * @constructor
     * @param {object} options
     */
    var BaseNetSocket = function(options) {
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
    };
    BaseNetSocket.prototype = {
      notify: function(event, args) {
        if (this.callbacks[event]) {
          this.callbacks[event](args);
        }
      }
    };
    return BaseNetSocket;
  }).
  /**
   * The Node.js (node-webkit) implementation using the "net" module.
   * Should not be used directly.
   */
  factory('NodeNetSocket', ['BaseNetSocket', function(BaseNetSocket) {
    var NodeNetSocket = function(options) {
      BaseNetSocket.call(this, options);
      this.net = require('net');
      this.socket;
      // Just send the oncreate event now, since there is no such action here
      this.notify('create', true);
    };
    NodeNetSocket.prototype = Object.create(BaseNetSocket.prototype);
    NodeNetSocket.prototype.constructor = NodeNetSocket;
    angular.extend(NodeNetSocket.prototype, {
      connect: function(host, port) {
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
      },
      send: function(data) {
        // Convert to Node.js Buffer object
        var view = new Uint8Array(data);
        var buffer = new Buffer(view);
        this.socket.write(buffer);
      },
      disconnect: function() {
        this.socket.end();
      },
      close: function() {
        this.socket.destroy();
      },
      onconnect: function() {
        this.notify('connect', true);
      },
      ondata: function(data) {
        // Convert from Node.js Buffer object
        var ab = new ArrayBuffer(data.length);
        var view = new Uint8Array(ab);
        view.set(data);
        this.notify('receive', ab);
      },
      onend: function() {
        this.notify('disconnect');
      },
      onerror: function(error) {
        this.notify('error', "Node socket error (" + error.name + "): " + error.message);
      },
      onclose: function(had_error) {
        if (had_error === true) {
          this.notify('error', "Node socket closed due to a transmission error");
        }
        this.notify('close');
      },
    });
    return NodeNetSocket;
  }]).
  /**
   * The Chrome packaged app implementation using chrome.sockets.
   * Should not be used directly.
   */
  factory('ChromeNetSocket', ['BaseNetSocket', function(BaseNetSocket) {
    var ChromeNetSocket = function(options) {
      BaseNetSocket.call(this, options);
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
    };
    ChromeNetSocket.prototype = Object.create(BaseNetSocket.prototype);
    ChromeNetSocket.prototype.constructor = ChromeNetSocket;
    angular.extend(ChromeNetSocket.prototype, {
      connect: function(host, port) {
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
      },
      send: function(data) {
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
      },
      disconnect: function() {
        if (this.socketId) {
          chrome.sockets.tcp.disconnect(this.socketId, this.ondisconnect.bind(this));
        }
        else {
          // TODO: Error
        }
      },
      close: function() {
        chrome.sockets.tcp.close(this.socketId, this.onclose.bind(this));
      },
      oncreate: function(createInfo) {
        this.socketId = createInfo.socketId;
        if (this.socketId > 0) {
          chrome.sockets.tcp.onReceive.addListener(this.onreceive.bind(this));
          chrome.sockets.tcp.onReceiveError.addListener(this.onreceiveerror.bind(this));
          this.notify('create', true);
        }
        else {
          this.notify('create', false);
        }
      },
      onconnect: function(result) {
        if (result >= 0) {
          this.notify('connect', true);
        }
        else {
          this.notify('connect', false);
        }
      },
      onreceive: function(info) {
        this.notify('receive', info.data);
      },
      onreceiveerror: function(info) {
        this.notify('error', "Chrome result code: " + info.resultCode);
        chrome.sockets.tcp.getInfo(this.socketId, function (socketInfo) {
          if (socketInfo.connected === false) {
            this.notify('disconnect');
          }
        }.bind(this));
      },
      onsend: function(sendInfo) {
        if (sendInfo.resultCode >= 0) {
          this.notify('send', true);
        }
        else {
          this.notify('send', false);
        }
      },
      ondisconnect: function() {
        this.notify('disconnect');
      },
      onclose: function() {
        this.notify('close');
      },
    });
    return ChromeNetSocket;
  }]).
  /**
   * The Firefox packaged app implementation using mozTCPSocket.
   * Should not be used directly.
   */
  factory('MozNetSocket', ['BaseNetSocket', function(BaseNetSocket) {
    var MozNetSocket = function(options) {
      BaseNetSocket.call(this, options);
      this.socket;
      // Just send the oncreate event now, since there is no such action here
      this.notify('create', true);
    };
    MozNetSocket.prototype = Object.create(BaseNetSocket.prototype);
    MozNetSocket.prototype.constructor = MozNetSocket;
    angular.extend(MozNetSocket.prototype, {
      connect: function(host, port) {
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
      },
      send: function(data) {
        if (this.socket) {
          this.socket.send(data);
        }
        else {
          // TODO: Error
        }
      },
      disconnect: function() {
        // TODO!
      },
      close: function() {
        if (this.socket) {
          this.socket.close();
        }
        else {
          // TODO: Error
        }
      },
      onopen: function(event) {
        this.notify('connect', true);
      },
      ondata: function(event) {
        this.notify('receive', event.data);
      },
      onerror: function(event) {
        this.notify('error', "MozTCPSocket error message: " + event.data);
      },
      onclose: function() {
        this.notify('close');
      },
    });
    return MozNetSocket;
  }]);
