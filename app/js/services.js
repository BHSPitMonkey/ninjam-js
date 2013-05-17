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
      
      nextUint16 : function() {
        this._offset += 2;
        return this._data.getUint16(this._offset - 2);
      },
      
      nextUint32 : function() {
        this._offset += 4;
        return this._data.getUint32(this._offset - 4, true);
      },
      
      nextInt8 : function() {
        this._offset++;
        return this._data.getInt8(this._offset - 1);
      },
      
      nextInt16 : function() {
        this._offset += 2;
        return this._data.getInt16(this._offset - 2);
      },
      
      nextInt32 : function() {
        this._offset += 4;
        return this._data.getInt32(this._offset - 4, true);
      },
      
      // Returns the next n bytes (characters) of the message as a String.
      // If length is unspecified, we'll assume string is NUL-terminated.
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
      
      // Returns the next n bytes of the message as a new ArrayBuffer object
      nextArrayBuffer : function(bytes) {
        this._offset += bytes;
        return this._data.buffer.slice(this._offset - bytes, this._offset);
      },
      
      // Returns true if there is still more data to be retrieved from the message
      hasMoreData : function() {
        return (this._offset < this._data.byteLength);
      },
      
      // Returns the number of bytes remaining to be read
      bytesRemaining : function() {
        return this._data.byteLength - this._offset;
      },

    });
    
    // Builds a message by accepting fields sequentially
    var MessageBuilder = function(length) {
      this.buf = new ArrayBuffer(length);
      this._data = new DataView(this.buf);
      this._offset = 0;          // Current offset
    }
    angular.extend(MessageBuilder.prototype, {
      
      appendUint8 : function(value) {
        this._data.setUint8(this._offset, value);
        this._offset++;
      },
      
      appendUint32 : function(value) {
        this._data.setUint32(this._offset, value, true);
        this._offset += 4;
      },
      
      appendInt32 : function(value) {
        this._data.setInt32(this._offset, value, true);
        this._offset += 4;
      },
      
      appendString : function(string, length) {
        var len = (length) ? length : string.length;
        for (var i=0; i<len; i++)
          this.appendUint8(string.charCodeAt(i));
        
        // Finish with NUL if length is unspecified
        if (!length)
          this.appendUint8(0);
      },
      
      // Returns true if there is still more data to be retrieved from the message
      hasMoreData : function() {
        return (this._offset < this._data.byteLength);
      },

    });
    
    var NinjamClient = function() {
      this.socketId = null;
      this.status = "starting";   // Indicates connection status, for debugging
      this.host = null;
      this.port = null;
      this.username = null;
      this.password = null;
      this.anonymous = true;      // TODO: initialize as null and allow non-anon mode
      this.users = {};
      this.bpm = null;            // Beats per minute (tempo)
      this.bpi = null;            // Beats per interval (phrase length)
      this.maxChannels = null;    // Max channels per user allowed by server
      this.topic = null;
      this.autosubscribe = true; // Currently breaks us because we are bad at sockets
      
      this._socketPoll = null;    // setTimeout handle for continuous socket reads
      this._shouldPollSocket = true;  // Set to false to temporarily disable socket reads
      this._callbacks = {
        onChallenge: null,
        onChatMessage: null
      };
      this._msgBacklog = null;    // ArrayBuffer of incomplete server message(s)
      this._audioContext = new webkitAudioContext();
      this._audioBufferSource = this._audioContext.createBufferSource();
      console.log(this._audioBufferSource);
      
      // Try to create the socket
      console.log("Trying to create socket...");
      chrome.socket.create('tcp', {}, this._onCreate.bind(this));
    };
    
    angular.extend(NinjamClient.prototype, {
      
      // Connect to specified Ninjam server
      connect : function(host, username, password, onChallenge) {
        if (this.socketId > 0) {
          console.log("You're trying to connect! This client's socket ID is " + this.socketId + " and status is " + this.status);
          
          this.username = username;
          if (this.anonymous)
            username = "anonymous:" + username;
          this.passHash = CryptoJS.SHA1(username + ':' + password).toString(); // Pass 1/2
          this._callbacks.onChallenge = onChallenge;
          
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
      
      // Answer the server's authentication challenge
      respondToChallenge : function(acceptedAgreement) {
        var username = (this.anonymous) ? "anonymous:" + this.username : this.username;
        var msg = new MessageBuilder(29 + username.length);

        // Insert password hash (binary, not hex string)
        for (var i=0; i<5; i++)
          msg.appendInt32(this.passHash.words[i]);
          
        // Insert username
        msg.appendString(username);
        
        // Insert other fields
        var capabilities = (acceptedAgreement) ? 1 : 0;
        msg.appendUint32(capabilities);
        msg.appendUint32(0x00020000);
        
        if (!msg.hasMoreData())
          console.log("Message appears to be filled.");
        else
          console.log("Message appears to have more room left to populate!");

        console.log("Sending challenge response. " + msg.buf.byteLength + " bytes.");
        this._packMessage(0x80, msg.buf);
      },
      
      // Set flags (for receiving) for one or more channels. Param is an array.
      setUsermask : function(usermasks) {
        var usernamesLength = 0;
        for (var i=0; i<usermasks.length; i++)
          usernamesLength += (usermasks[i].length + 1); // +1 for NUL
        var msg = new MessageBuilder(usernamesLength + (usermasks.length * 4));
        
        for (var i=0; i<usermasks.length; i++) {
          msg.appendString(usermasks[i]);
          msg.appendUint32(0xFFFFFFFF); // Lazily subscribe to any and all possible channels...
        }
        
        this._packMessage(0x81, msg.buf);
      },
      
      // Tell the server about our channel(s)
      setChannelInfo : function() {
        // TODO
      },
      
      // Disconnect from the current server
      disconnect : function() {
        console.log("Disconnecting from server.");
        this.status = "disconnecting";
        if (this._socketPoll) {
          $timeout.cancel(this._socketPoll);
          this._socketPoll = null;
        }
        this.users = [];
        this.bpm = null;
        this.bpi = null;
        this.topic = null;
        chrome.socket.disconnect(this.socketId);
        this.status = "ready";
      },
      
      // Send something to server
      submitChatMessage : function(content) {
        var msg = new MessageBuilder(content.length + 8);
        msg.appendString('MSG');
        msg.appendString(content);
        msg.appendString('');
        msg.appendString('');
        msg.appendString('');
        this._packMessage(0xc0, msg.buf);
      },
      
      submitPrivateMessage : function(recipient, content) {
        var msg = new MessageBuilder(recipient.length + content.length + 12);
        msg.appendString('PRIVMSG');
        msg.appendString(recipient);
        msg.appendString(content);
        msg.appendString('');
        msg.appendString('');
        this._packMessage(0xc0, msg.buf);
      },
      
      submitTopic : function(content) {
        var msg = new MessageBuilder(content.length + 10);
        msg.appendString('TOPIC');
        msg.appendString(content);
        msg.appendString('');
        msg.appendString('');
        msg.appendString('');
        this._packMessage(0xc0, msg.buf);
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
            if (this._shouldPollSocket)
              chrome.socket.read(this.socketId, null, this._onDataRead.bind(this));
            
            this._socketPoll = $timeout(poll.bind(this), 500);
          }.bind(this), 0);
        }
      },
      
      // Called when data has been read from the socket
      _onDataRead : function(readInfo) {
        if (readInfo.resultCode > 0) {
          //console.log('Data has been read from the socket.');
          
          // Convert ArrayBuffer to string and log it
          //this._arrayBufferToString(readInfo.data, function(str) {
          //  console.log("Received (string):\n" + str);
          //}.bind(this));
          
          // Parse the received data
          this._parseMessages(readInfo.data);
        }
      },
      
      // Called when a write operation completes (or has an error)
      _onDataWrite : function(writeInfo) {
        //console.log("Socket write completed: ")
        //console.log(writeInfo);
      },
      
      // Converts an array buffer to a string
      //
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
      }, //
      
      // Parses an ArrayBuffer received from a Ninjam server
      _parseMessages : function(buf) {
        this._shouldPollSocket = false;
        
        if (this._msgBacklog != null) {
          //console.log("Fetching backlog (" + this._msgBacklog.byteLength + ")");
          //console.log("Merging with new buffer (" + buf.byteLength + ")");
          // Merge backlog and new buffer into single buffer
          var mergedBuf = new ArrayBuffer(this._msgBacklog.byteLength + buf.byteLength);
          var mergedView = new Uint8Array(mergedBuf);
          var backlogView = new Uint8Array(this._msgBacklog);
          var bufView = new Uint8Array(buf);
          for (var i=0; i<backlogView.length; i++)
            mergedView[i] = backlogView[i];
          for (var i=0; i<bufView.length; i++)
            mergedView[backlogView.length + i] = bufView[i];
          buf = mergedBuf;
          //console.log("Merged buf has " + buf.byteLength + " bytes.");
          this._msgBacklog = null;
        }
        
        var msg = new MessageReader(buf);
        var error = false;
        
        /* console.log("Here's the received buffer as a hex string:");
        var str = "";
        var dv = new DataView(buf);
        for (var i=0; i<dv.byteLength; i++) {
          var hex = dv.getUint8(i).toString(16);
          if (hex.length == 1)
            hex = "0" + hex;
          str += hex + " ";
          if ((i+1) % 16 == 0)
            str += "\n";
          else if ((i+1) % 8 == 0)
            str += "  ";
        }
        console.log(str); */
        
        // As long as the message has more data and we haven't hit errors...
        while (msg.hasMoreData() && !error) {
          var type = msg.nextUint8();
          var length = msg.nextUint32();
          
          // Are there `length` bytes remaining for us to peruse?
          //console.log("Message has " + msg.bytesRemaining() + " bytes remaining. This payload is " + length + " bytes.");
          if (msg.bytesRemaining() < length) {
            // We don't have this entire payload yet. Move to backlog and break.
            this._msgBacklog = buf.slice(msg._offset - 5);
            break;
          }
          else {
          
            // React to the type of message we're seeing
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
                this.passHash = CryptoJS.SHA1(this.passHash + fields.challenge);  // Pass 2/2
                
                // Tell the UI about this challenge
                this._callbacks.onChallenge(fields);
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
                else {
                  this.status = "authenticated";
                }
                break;
              
              case 0x02:  // Server Config Change Notify
                console.log("Received a Server Config Change notification.");
                var fields = {
                  bpm: msg.nextUint16(),
                  bpi: msg.nextUint16()
                };
                console.log(fields);
                
                // TODO: Notify user interface
                break;
              
              case 0x03:  // Server Userinfo Change Notify
                console.log("Received a Server Userinfo Change notification.");
                var startOffset = msg._offset;
                while (msg._offset - startOffset < length) {
                  var fields = {
                    active: msg.nextUint8(),
                    channelIndex: msg.nextUint8(),
                    volume: msg.nextInt16(),
                    pan: msg.nextInt8(),
                    flags: msg.nextUint8(),
                    username: msg.nextString(),
                    channelName: msg.nextString()
                  };
                  console.log(fields);
                  
                  var pieces = fields.username.split('@', 2);
                  var username = pieces[0];
                  var ip = (pieces.length == 2) ? pieces[1] : "";
                  
                  // If channel is active
                  if (fields.active == 1) {
                    if (!this.users[username]) {
                      this.users[username] = {
                        name: username,
                        fullname: fields.username,
                        ip: ip,
                        channels: {}
                      };
                    }
                    if (!this.users[username]["channels"][fields.channelIndex]) {
                      this.users[username]["channels"][fields.channelIndex] = {};
                      
                      // Subscribe to this channel, since we just met it
                      if (this.autosubscribe)
                        this.setUsermask([fields.username]);
                    }
                    this.users[username]["channels"][fields.channelIndex]["volume"] = fields.volume;
                    this.users[username]["channels"][fields.channelIndex]["pan"] = fields.pan;
                    this.users[username]["channels"][fields.channelIndex]["name"] = fields.channelName;
                  }
                  else {
                    // This channel is no longer active, so remove it from the store
                    this.users[username]["channels"].splice(fields.channelIndex);
                  }
                }
                
                // TODO: Notify user interface
                break;
              
              case 0x04:  // Server Download Interval Begin
                console.log("Received a Server Download Interval Begin notification.");
                var fields = {
                  guid: msg.nextArrayBuffer(16),
                  estimatedSize: msg.nextUint32(),
                  fourCC: msg.nextArrayBuffer(4),
                  channelIndex: msg.nextUint8(),
                  username: msg.nextString()
                };
                console.log(fields);
                
                // TODO
                break;
              
              case 0x05:  // Server Download Interval Write
                console.log("Received a Server Download Interval Write notification. Payload size " + length);
                var fields = {
                  guid: msg.nextArrayBuffer(16),
                  flags: msg.nextUint8(),
                  audioData: msg.nextArrayBuffer(length - 17)
                };
                console.log(fields);
                
                // TODO
                this._audioContext.decodeAudioData(fields.audioData, function(buffer) {
                  this._audioBufferSource.buffer = buffer;
                  this._audioBufferSource.connect(this._audioContext.destination);
                  this._audioBufferSource.start(0);
                }.bind(this));
                
                break;
              
              case 0xc0:  // Chat Message
                console.log("Received a Chat Message.");
                var fields = {
                  command: msg.nextString(),
                  arg1: msg.nextString(),
                  arg2: msg.nextString(),
                  arg3: msg.nextString(),
                  arg4: msg.nextString()
                };
                console.log(fields);
                
                switch (fields.command) {
                  case "MSG":
                    break;
                  case "PRIVMSG":
                    break;
                  case "TOPIC":
                    this.topic = fields.arg2;
                    break;
                  case "JOIN":
                    var pieces = fields.arg1.split('@', 2);
                    var username = pieces[0];
                    var ip = (pieces.length == 2) ? pieces[1] : "";
                    this.users[username] = {
                      name: username,
                      fullname: fields.arg1,
                      ip: ip,
                      channels: {}
                    };
                    break;
                  case "PART":
                    delete this.users[fields.arg1.split('@')[0]];
                    break;
                  case "USERCOUNT":
                    break;
                }
                
                // Inform callback
                if (this._callbacks.onChatMessage)
                  this._callbacks.onChatMessage(fields);
                break;

              case 0xFD:  // Keepalive
                //console.log("Received a keepalive message.");
                // This message has no payload. We should just send a Keepalive message back.
                if (this.status == "authenticated")
                  this._sendKeepalive();
                break;
              
              default:
                console.log("Received an unidentifiable message with type " + type + " and payload length " + length + "(" + buf.byteLength + " bytes)");
                error = true; // This will stop the while-loop
            }
          }
        }
                
        this._shouldPollSocket = true;
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
            data.setUint8(5+i, payloadData[i]);
        }
        
        /* console.log("Here's the packed message as a hex string:");
        var str = "";
        var dv = new DataView(buf);
        for (var i=0; i<dv.byteLength; i++) {
          var hex = dv.getUint8(i).toString(16);
          if (hex.length == 1) hex = "0" + hex;
          str += hex + " ";
          if ((i+1) % 16 == 0) str += "\n";
          else if ((i+1) % 8 == 0) str += "  ";
        }
        console.log(str); */
        
        chrome.socket.write(this.socketId, buf, this._onDataWrite.bind(this));
      },
      
      // Send a Keepalive message to the server
      _sendKeepalive : function() {
        //console.log("Sending keepalive message.");
        this._packMessage(0xFD, null);
      },
      
    });
    
    return new NinjamClient();
  });
