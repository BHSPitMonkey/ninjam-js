/*
* @license
* angular-net-sockets v0.1
* (c) 2014 Stephen Eisenhauer http://stepheneisenhauer.com
* License: MIT
*/

'use strict';

angular.module('stepheneisenhauer.netsockets', []).
  factory('NetSocket', function (NodeNetSocket, ChromeNetSocket, MozNetSocket) {
    if (typeof require !== 'undefined' && require('net')) {
      return NodeNetSocket;
    }
    else if (chrome.sockets) {
      return ChromeNetSocket;
    }
    else if (navigator.mozTCPSocket) {
      return MozNetSocket;
    }
    else {
      // Raise some kind of error
    }
  }).
  factory('BaseNetSocket', function() {
    // Superclass for all platform-specific socket implementations.
    // Do not use directly.
    var BaseNetSocket = function(options) {
      this.protocol = options.protocol || "tcp";
      this.callbacks = {
        create: options['onCreate'],
        connect: options['onConnect'],
        receive: options['onReceive'],
        receiveError: options['onReceiveError'],
        send: options['onSend'],
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
  factory('NodeNetSocket', function(BaseNetSocket) {
    var NodeNetSocket = function(options) {
      this.protocol = options.protocol || "tcp";
      this.net = require('net');
      this.socket;
      
      // Just send the oncreate event now, since there is no such action here
      // TODO: Event
    }
    NodeNetSocket.prototype = {
      open: function(host, port) {
        this.socket = this.net.connect({host: host, port: port}, this.onopen.bind(this));
      }
    };
    return NodeNetSocket;
  }).
  factory('ChromeNetSocket', function(BaseNetSocket) {
    var ChromeNetSocket = function(options, oncreate) {
      BaseNetSocket.call(this, options, oncreate);
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
        this.notify('receiveError', "Chrome result code: " + info.resultCode);
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
  }).
  factory('MozNetSocket', function(BaseNetSocket) {
    var MozNetSocket = function(options) {
      this.protocol = options.protocol || "tcp";
      this.socket;
      
      // Just send the oncreate event now, since there is no such action here
      // TODO: Event
    }
    MozNetSocket.prototype = {
      open: function(host, port) {
        this.socket = navigator.mozTCPSocket.open(host, port, {binaryType:"arraybuffer"});
        this.socket.onopen = this.onconnect.bind(this);
        this.socket.ondata = this.onreceive.bind(this);
        this.socket.onerror = this.onerror.bind(this);
        this.socket.onclose = this.onclose.bind(this);
      },
      send: function(data) {
        if (this.socket) {
          this.socket.send(data);
        }
        else {
          // TODO: Error
        }
      },
      close: function(data) {
        if (this.socket) {
          this.socket.close();
        }
        else {
          // TODO: Error
        }
      },
      onconnect: function() {
        
      },
      onreceive: function() {
        
      },
      onerror: function() {
        
      },
      onclose: function() {
        
      }
    };
    return MozNetSocket;
  });
