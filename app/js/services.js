'use strict';

/* Services */

angular.module('myApp.services', []).
  factory('NinjamClient', function($timeout) {
    
    // Takes in an arraybuffer and helps us sequentially get fields out of it
    var MessageReader = function(buf) {
      this._data = new DataView(buf);
      this._offset = 0;          // Current offset
    }
    angular.extend(MessageReader.prototype, {
      
      nextUint8 : function() {
        this._offset++;
        return this._data.getUint8(this._offset - 1);
      },
      
      nextUint32 : function() {
        this._offset += 4;
        return this._data.getUint32(this._offset - 4, true);
      },
      
      nextString : function(length) {
        var string = "";
        if (length) {
          for (var i=0; i<length; i++)
            string += String.fromCharCode(this.nextUint8());
        }
        else {
          var char;
          while ((char = this.nextUint8()) != 0)
            string += String.fromCharCode(char);
        }
        return string;
      },
      
      // Returns true if there is still more data to be retrieved from the message
      hasMoreData : function() {
        return (this._offset < this._data.byteLength);
      },

    });
    
    // Builds a message by accepting fields sequentially
    var MessageBuilder = function(length) {
      this.buf = new ArrayBuffer(length);
      this._data = new DataView(buf);
      this._offset = 0;          // Current offset
    }
    angular.extend(MessageBuilder.prototype, {
      
      appendUint8 : function(value) {
        this._data.setUint8(this._offset, value);
        this.offset++;
      },
      
      appendUint32 : function(value) {
        this._data.setUint32(this._offset, value, true);
        this.offset += 4;
      },
      
      appendString : function(string, length) {
        var len = (length) ? length : string.length;
        for (var i=0; i<len; i++)
          this.appendUint8(string[i]);
        
        // Finish with NUL if length is unspecified
        if (!length)
          this.appendUint8(0);
      },

    });
    
    var NinjamClient = function() {
      this.socketId = null;
      this.status = "starting"; // Indicates connection status, for debugging
      this.host = null;
      this.port = null;
      this.username = null;
      this.pass = null;
      this.users = [];
      this.bpm = null;          // Beats per minute (tempo)
      this.bpi = null;          // Beats per interval (phrase length)
      this.maxChannels = null;  // Max channels per user allowed by server
      
      this._socketPoll = null;  // setTimeout handle for continuous socket reads
      
      // Try to create the socket
      console.log("Trying to create socket...");
      chrome.socket.create('tcp', {}, this._onCreate.bind(this));
    };
    
    angular.extend(NinjamClient.prototype, {
      
      // Connect to specified Ninjam server
      connect : function(host, username, password) {
        if (this.socketId > 0) {
          console.log("You're trying to connect! This client's socket ID is " + this.socketId + " and status is " + this.status);
          
          this.username = username;
          this.pass = password; // TODO: handle hashing/anon properly
          
          // Split the host string (e.g. hostname:port) into hostname and port
          var pieces = host.split(":");
          if (pieces.length == 2) {
            this.host = pieces[0];
            this.port = parseInt(pieces[1]);
          }
          else {
            throw "Invalid host format"
          }
          
          chrome.socket.connect(this.socketId, this.host, this.port, this._onConnectComplete.bind(this));
          
          this.status = "connecting";
        }
        else {
          console.log("Can't connect: Socket not created!");
        }
      },
      
      // Disconnect from the current server
      disconnect : function() {
        console.log("Disconnecting from server.");
        this.status = "disconnecting";
        if (this._socketPoll) {
          this._socketPoll.cancel();
          this._socketPoll = null;
        }
        this.users = [];
        chrome.socket.disconnect(this.socketId);
        this.status = "ready";
      },
      
      // Send something to server
      send : function() {
        
      },
      
      // Called when socket gets created
      _onCreate : function(createInfo) {
        console.log("Called onCreate. Got socket ID " + createInfo.socketId);
        this.socketId = createInfo.socketId;
        if (this.socketId > 0) {
          this.status = "ready";
        }
        else {
          console.log("Couldn't create socket!");
          this.status = "no socket";
        }
      },
      
      // Called when socket is connected
      _onConnectComplete : function(result) {
        console.log("Socket connection attempt completed with code " + result);
        
        if (result >= 0) {
          // We are connected; Begin polling for new information
          this._socketPoll = $timeout(function poll() {
            console.log("Polling for socket reads");
            
            chrome.socket.read(this.socketId, null, this._onDataRead.bind(this));
            
            this._socketPoll = $timeout(poll.bind(this), 1000);
          }.bind(this), 0);
        }
      },
      
      // Called when data has been read from the socket
      _onDataRead : function(readInfo) {
        if (readInfo.resultCode > 0) {
          console.log('Data has been read from the socket.');
          
          // Convert ArrayBuffer to string and log it
          //this._arrayBufferToString(readInfo.data, function(str) {
          //  console.log("Received (string):\n" + str);
          //}.bind(this));
          
          // Parse the received data
          this._parseMessage(readInfo.data);
        }
      },
      
      // Called when a write operation completes (or has an error)
      _onDataWrite : function(writeInfo) {
        console.log("Socket write completed: ")
        console.log(writeInfo);
      },
      
      // Converts an array buffer to a string
      _arrayBufferToString : function(buf, callback) {
        var bb = new Blob([new Uint8Array(buf)]);
        var f = new FileReader();
        f.onload = function(e) {
          callback(e.target.result);
        };
        f.readAsText(bb);
      },
      
      // Converts a string to an array buffer
      _stringToArrayBuffer : function(str, callback) {
        var bb = new Blob([str]);
        var f = new FileReader();
        f.onload = function(e) {
            callback(e.target.result);
        };
        f.readAsArrayBuffer(bb);
      },
      
      // Parses an ArrayBuffer received from a Ninjam server
      _parseMessage : function(buf) {
        //var data = new DataView(buf);
        var msg = new MessageReader(buf);
        
        var type = msg.nextUint8();
        var length = msg.nextUint32();
        
        console.log("Received message of type " + type + " and p-length " + length);
        if (buf.byteLength == length + 5)
        {
          switch (type) {
            case 0x00:  // Server Auth Challenge
              console.log("Received a server auth challenge.");
              var fields = {
                challenge: msg.nextString(8),
                serverCapabilities: msg.nextUint32(),
                protocolVersion: msg.nextUint32(),
                licenseAgreement: msg.nextString()
              };
              console.log(fields);
              // TODO: Tell the UI about this challenge
              break;

            case 0x01:  // Server Auth Reply
              console.log("Received a server auth reply.");
              var fields = {
                flag: msg.nextUint8(),
                error: null,
                maxChannels: null
              };
              if (msg.hasMoreData())
                fields.error = msg.nextString();
              if (msg.hasMoreData())
                fields.maxChannels = msg.nextUint8();
              console.log(fields);
              
              // If flag is not set happily, let's disconnect
              if (fields.flag == 0) {
                console.log("Server auth failed: " + fields.error + ". Disconnecting.");
                this.disconnect();
              }
              
              break;

            case 0xFD:  // Keepalive
              console.log("Received a keepalive message.");
            
              // This message has no payload. We should just send a Keepalive message back.
              this._sendKeepalive();
          }
        }
        else
        {
          console.log("Received message with mismatch! Actual buf length is " + buf.byteLength);
        }
      },
      
      // Assemble a Ninjam client message and write it to the server
      _packMessage : function(type, payload) {
        var payloadLength = (payload != null) ? payload.byteLength : 0;
        var buf = new ArrayBuffer(payloadLength + 5); // Header uses 5 bytes
        var data = new DataView(buf);
        data.setUint8(0, type);
        data.setUint32(1, payloadLength, true);
        
        // Attach payload
        if (payload != null) {
          var payloadData = new Uint8Array(payload);
          for (var i=0; i<payloadLength; i++)
            data.setUint8(2+i, payloadData[i]);
        }
        
        chrome.socket.write(this.socketId, buf, this._onDataWrite.bind(this));
      },
      
      // Send a Keepalive message to the server
      _sendKeepalive : function() {
        console.log("Sending keepalive message.");
        this._packMessage(0xFD, null);
      },
      
    });
    
    return new NinjamClient();
  });
