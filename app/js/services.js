'use strict';

/* Services */

angular.module('myApp.services', []).
  factory('MessageReader', function() {
    function MessageReader(buf) {
      this._data = new DataView(buf);
      this._offset = 0; // Current offset
    }
    MessageReader.prototype = {
      nextUint8 : function() {
        this._offset++;
        return this._data.getUint8(this._offset - 1);
      },
      nextUint16 : function() {
        this._offset += 2;
        return this._data.getUint16(this._offset - 2, true);
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
        return this._data.getInt16(this._offset - 2, true);
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
    };
    return MessageReader;
  }).
  factory('MessageBuilder', function(Channel) {
    function MessageBuilder(length) {
      this.buf = new ArrayBuffer(length);
      this._data = new DataView(this.buf);
      this._offset = 0; // Current offset
    }
    MessageBuilder.prototype = {
      appendUint8 : function(value) {
        this._data.setUint8(this._offset, value);
        this._offset++;
      },
      appendUint16 : function(value) {
        this._data.setUint16(this._offset, value, true);
        this._offset += 2;
      },
      appendUint32 : function(value) {
        this._data.setUint32(this._offset, value, true);
        this._offset += 4;
      },
      appendInt8 : function(value) {
        this._data.setInt8(this._offset, value);
        this._offset++;
      },
      appendInt16 : function(value) {
        this._data.setInt16(this._offset, value, true);
        this._offset += 2;
      },
      appendInt32 : function(value) {
        this._data.setInt32(this._offset, value, true);
        this._offset += 4;
      },
      appendString : function(string, length) {
        var len = (length) ? length : string.length;
        for (var i=0; i<len; i++) {
          this.appendUint8(string.charCodeAt(i));
        }
        // Finish with NUL if length is unspecified
        if (!length)
          this.appendUint8(0);
      },
      appendZeros : function(count) {
        for (var i=0; i<count; i++) {
          this.appendUint8(0);
        }
      },
      // Returns true if there is still more data to be retrieved from the message
      hasMoreData : function() {
        return (this._offset < this._data.byteLength);
      },
    };
    return MessageBuilder;
  }).
  factory('IntervalDownload', function() {
    function IntervalDownload(username, channelIndex) {
      this.username = username;
      this.channelIndex = channelIndex;
      this.chunks = [];
    }
    IntervalDownload.prototype = {
      addChunk: function(chunk) {
        this.chunks.push(chunk);
      },
      // Return a fully-assembled ArrayBuffer containing the OGGv data.
      // This IntervalDownload should be deleted after finish() returns.
      finish: function() {
        // Create an ArrayBuffer containing all the concatenated OGG/vorbis data
        var totalSize = 0;
        for (var i=0; i<this.chunks.length; i++)
          totalSize += this.chunks[i].byteLength;
        var fullBufferArray = new Uint8Array(totalSize);
        var offset = 0;
        for (var i=0; i<this.chunks.length; i++) {
          fullBufferArray.set( new Uint8Array(this.chunks[i]), offset );
          offset += this.chunks[i].byteLength;
          //this.chunks[i] = null;
        }
        return fullBufferArray;
      }
    };
    return IntervalDownload;
  }).
  factory('Channel', function() {
    function Channel(name, volume, pan) {
      this.name = name;
      this.volume = volume;
      this.pan = pan;
      this.readyIntervals = [];
      this.localMute = false;
      this.localSolo = false;
      this.localVolume = 0.8;
      this.gainNode = null;
    }
    Channel.prototype = {
      update: function(name, volume, pan) {
        this.name = name;
        this.volume = volume;
        this.pan = pan;
      },
      playNextInterval: function() {
        if (this.gainNode && this.readyIntervals.length) {
          var audioBuffer = this.readyIntervals.shift();
          if (audioBuffer) {
            // Play this buffer!
            var bufferSource = this.gainNode.context.createBufferSource();
            bufferSource.buffer = audioBuffer;
            bufferSource.connect(this.gainNode);
            bufferSource.start();
          }
        }
      }
    };
    return Channel;
  }).
  factory('User', function() {
    function User(name, fullname, ip) {
      this.name = name;
      this.fullname = fullname;
      this.ip = ip;
      this.channels = {};
    }
    User.prototype = {
      // Enqueue a buffer of decoded audio that is ready to play
      addReadyInterval: function(audioBuffer, channelIndex) {
        if (this.channels.hasOwnProperty(channelIndex)) {
          this.channels[channelIndex].readyIntervals.push(audioBuffer);
        }
      }
    };
    return User;
  }).
  factory('NinjamClient', function(MessageReader, MessageBuilder, IntervalDownload, Channel, User, $timeout) {
    var NinjamClient = function() {
      // Set up audio playback context
      this._audioContext = new webkitAudioContext();
      this._masterGain = this._audioContext.createGain();
      this._masterGain.connect(this._audioContext.destination);
      this._metronomeGain = this._audioContext.createGain();
      this._metronomeGain.connect(this._masterGain);
      
      // Set up metronome sounds
      this._hiClickBuffer = null;
      this._loClickBuffer = null;
      var requestLo = new XMLHttpRequest();
      requestLo.open("GET", "snd/met-lo.wav", true);
      requestLo.responseType = "arraybuffer";
      requestLo.onload = function() {
        // Decode asynchronously
        this._audioContext.decodeAudioData(
          requestLo.response,
          function(buffer) {
              this._loClickBuffer = buffer;
          }.bind(this)
        );
      }.bind(this);
      requestLo.send();
      var requestHi = new XMLHttpRequest();
      requestHi.open("GET", "snd/met-hi.wav", true);
      requestHi.responseType = "arraybuffer";
      requestHi.onload = function() {
        // Decode asynchronously
        this._audioContext.decodeAudioData(
          requestHi.response,
          function(buffer) {
              this._hiClickBuffer = buffer;
          }.bind(this)    
        );
      }.bind(this);
      requestHi.send();
      
      // Try to create the socket
      console.log("Trying to create socket...");
      chrome.sockets.tcp.create({}, this._onCreate.bind(this));

      // Initialize values (only the ones that need resetting after disconnect)
      this.reset = function() {
        this.socketId = null;
        this.status = "starting";   // Indicates connection status, for debugging
        this.host = null;
        this.port = null;
        this.username = null;
        this.fullUsername = null;   // Server will tell us this after auth reply
        this.password = null;
        this.anonymous = true;      // TODO: initialize as null and allow non-anon mode
        this.users = {};
        this.bpm = null;            // Beats per minute (tempo)
        this.bpi = null;            // Beats per interval (phrase length)
        this.currentBeat = null;
        this.maxChannels = null;    // Max channels per user allowed by server
        this.topic = null;
        this.autosubscribe = true;  // Currently breaks us because we are bad at sockets
        this.setMasterMute(false);
        this.setMetronomeMute(false);
        this.setMicrophoneMute(false);
        
        this._localChannels = [{name:"Default"}];
        
        this._socketPoll = null;        // setTimeout handle for continuous socket reads
        this._shouldPollSocket = true;  // Set to false to temporarily disable socket reads
        this._callbacks = {
          onChallenge: null,
          onChatMessage: null,
          onDisconnect: null
        };
        this._checkKeepaliveTimeout = null;    // setTimeout handle for checking timeout
        this._lastSendTime = null;      // Time of last socket write
        this._msgBacklog = null;        // ArrayBuffer of incomplete server message(s)
        this._nextIntervalBegin = null; // setTimeout handle for local interval setup
        this._audioIntervals = {};      // Will contain audio data buffer queues keyed by GUID
      };
      this.reset();
    };
    
    angular.extend(NinjamClient.prototype, {
      
      // Periodically check whether a new keepalive message is needed
      _checkKeepalive : function() {
        if (this.status == "authenticated" && (new Date()).getTime() - this._lastSendTime > 3000)
          this._sendKeepalive();
        
        this._checkKeepaliveTimeout = $timeout(this._checkKeepalive.bind(this), 3000);
      },
      
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
          
          chrome.sockets.connect(this.socketId, this.host, this.port, this._onConnectComplete.bind(this));
          
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
      
      // Tell the server about our channel(s).
      setChannelInfo : function() {
        var allNamesLength = 0;
        for (var i=0; i<this._localChannels.length; i++) {
          allNamesLength += (this._localChannels[i].name.length + 1); // +1 for NUL char
        }
        var msg = new MessageBuilder(2 + allNamesLength + (4 * this._localChannels.length));
        msg.appendUint16(4);  // Channel parameter size
        for (var i=0; i<this._localChannels.length; i++) {
          msg.appendString(this._localChannels[i].name);  // Channel name
          msg.appendInt16(0);         // Volume (0dB)
          msg.appendInt8(0);          // Pan
          msg.appendUint8(1);         // Flags (???)
          //msg.appendZeros(paramLength - 5 - this._localChannels[i].name.length);
        }
        
        this._packMessage(0x82, msg.buf);
      },
      
      // Disconnect from the current server
      disconnect : function(reason) {
        console.log("Disconnecting from server.");
        this.status = "disconnecting";
        if (this._socketPoll) {
          $timeout.cancel(this._socketPoll);
          this._socketPoll = null;
        }
        if (this._nextIntervalBegin) {
          $timeout.cancel(this._nextIntervalBegin);
          this._nextIntervalBegin = null;
        }
        if (this._checkKeepaliveTimeout) {
          $timeout.cancel(this._checkKeepaliveTimeout)
          this._checkKeepaliveTimeout = null;
        }
        this.users = {};
        this.bpm = null;
        this.bpi = null;
        this.topic = null;
        chrome.sockets.tcp.disconnect(this.socketId);
        this.status = "ready";
        if (this._callbacks.onDisconnect)
          this._callbacks.onDisconnect(reason);
      },

      setMasterMute : function(state) {
        this.masterMute = state;
        this._masterGain.gain.value = (this.masterMute) ? 0.0 : 1.0;
      },
      
      toggleMasterMute : function() {
        this.setMasterMute(!this.masterMute);
      },

      setMetronomeMute : function(state) {
        this.metronomeMute = state;
        this._metronomeGain.gain.value = (this.metronomeMute) ? 0.0 : 1.0;
      },
      
      toggleMetronomeMute : function() {
        this.setMetronomeMute(!this.metronomeMute);
      },
      
      setMicrophoneMute : function(state) {
        this.microphoneMute = state;
      },
      
      toggleMicrophoneMute : function() {
        this.setMicrophoneMute(!this.microphoneMute);
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
          chrome.sockets.tcp.onReceive.addListener(this._onReceiveData.bind(this));
          chrome.sockets.tcp.onReceiveError.addListener(this._onReceiveError.bind(this));
        }
      },
      
      // Called when data has been read from the socket
      _onReceiveData : function(info) {
        // Parse the received data
        this._parseMessages(info.data);
      },

      _onReceiveError : function(info) {
        if (info.resultCode == -15)
        {
          console.log("Socket is no longer connected!");
          this.disconnect("Socket became disconnected.");
        }
        else if (readInfo.resultCode < -1)
        {
          console.log("Socket read failed:");
          console.log(readInfo);
        }
        else {
          console.log("Something wrong with socket! resultCode: " + info.resultCode);
        }
      },
      
      // Called when a send operation completes (or has an error)
      _onDataSend : function(sendInfo) {
        //console.log("Socket write completed: ")
        //console.log(writeInfo);
        if (sendInfo < 0) {
          console.log("Error writing to socket! resultCode: " + sendInfo.resultCode);
        }
      },
      
      // Converts an array buffer to a string asynchronously
      _arrayBufferToStringAsync : function(buf, callback) {
        var bb = new Blob([new Uint8Array(buf)]);
        var f = new FileReader();
        f.onload = function(e) {
          callback(e.target.result);
        };
        f.readAsText(bb);
      },
      
      // Converts a string to an array buffer
      _stringToArrayBufferAsync : function(str, callback) {
        var bb = new Blob([str]);
        var f = new FileReader();
        f.onload = function(e) {
            callback(e.target.result);
        };
        f.readAsArrayBuffer(bb);
      },
      
      // Converts an array buffer to a hex string
      _arrayBufferToHexString : function(buf) {
        var str = "";
        var arr = new Uint8Array(buf);
        for (var i=0; i<arr.byteLength; i++) {
          var hex = arr[i].toString(16);
          if (hex.length == 1) hex = "0" + hex;
          str += hex;
        }
        return str;
      },
      
      // Converts an array buffer to a string
      _arrayBufferToString : function(buf) {
        var str = "";
        var arr = new Uint8Array(buf);
        for (var i=0; i<arr.byteLength; i++) {
          str += String.fromCharCode(arr[i]);
        }
        return str;
      },
      
      // Sets up a new interval
      _beginNewInterval : function() {
        this._currentIntervalCtxTime = this._audioContext.currentTime;
        var secondsPerBeat = 60.0 / this.bpm;
        var secondsToNext = secondsPerBeat * this.bpi; // in seconds
        this._nextIntervalCtxTime = this._currentIntervalCtxTime + secondsToNext;
        
        console.log("New interval is starting. Ctx time: " + this._audioContext.currentTime + " Duration: " + secondsToNext);
        
        // Play all the ready intervals
        this._playAllChannelsNextInterval();
        
        // Schedule metronome beeps for this interval (and the downbeat of the next)
        for (var i=0; i<this.bpi; i++) {
          var bufferSource = this._audioContext.createBufferSource();
          var clickTime = this._currentIntervalCtxTime + (secondsPerBeat * i);
          bufferSource.buffer = (i == 0) ? this._hiClickBuffer : this._loClickBuffer;
          bufferSource.connect(this._metronomeGain);
          bufferSource.start(clickTime);
          
          // Update the currentBeat property at these times as well
          if (i == 0)
            this.currentBeat = 0;
          else
            $timeout(function() {
              this.currentBeat = (this.currentBeat + 1) % this.bpi;
            }.bind(this), (clickTime - this._currentIntervalCtxTime) * 1000);
        }
        
        // End previous recording
        // TODO

        // Start new recording
        // TODO

        // Call this function again at the start of the next interval
        this._nextIntervalBegin = $timeout(this._beginNewInterval.bind(this), secondsToNext * 1000);
      },
      
      // Finish and enqueue a particular interval download
      _finishIntervalDownload : function(guid) {
        // Retrieve the data and delete the download from the queue
        var fullBufferArray = this._audioIntervals[guid].finish();
        var username = this._audioIntervals[guid].username;
        var channelIndex = this._audioIntervals[guid].channelIndex;

        // Try to decode and then enqueue the audio in the Channel it belongs to
        this._audioContext.decodeAudioData(fullBufferArray.buffer, function(audioBuffer) {
          // Enqueue the audio in the Channel it belongs to
          if (this.users.hasOwnProperty(username)) {
            this.users[username].addReadyInterval(audioBuffer, channelIndex);
          }
          else {
            console.log("Discarding audio data for user who seems to no longer exist");
            console.log(username);
            console.log(this.users);
          }
        }.bind(this), function(error) {
          console.log("Error decoding audio data for guid: " + guid);
        }.bind(this));

        // Delete the download from the queue
        delete this._audioIntervals[guid];
      },
      
      // Play the next ready interval (if exists) for all Channels
      _playAllChannelsNextInterval : function() {
        for (var name in this.users) {
          if (this.users.hasOwnProperty(name)) {
            for (var index in this.users[name].channels) {
              this.users[name].channels[index].playNextInterval();
            }
          }
        }
      },

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
          if (msg.bytesRemaining() < 5) {
            this._msgBacklog = buf.slice(msg._offset);
            break;
          }
          var type = msg.nextUint8();
          var length = msg.nextUint32();
          
          // Are there `length` bytes remaining for us to peruse?
          if (msg.bytesRemaining() < length) {
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
                  serverCapabilities: msg.nextInt32(),
                  //keepaliveInterval: msg.nextInt16(),
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
                  this.disconnect(fields.error);
                }
                else {
                  this.status = "authenticated";
                  this._checkKeepaliveTimeout = $timeout(this._checkKeepalive.bind(this), 3000);
                  this.setChannelInfo();
                  this.fullUsername = fields.error;
                }
                break;
              
              case 0x02:  // Server Config Change Notify
                console.log("Received a Server Config Change notification.");
                var fields = {
                  bpm: msg.nextUint16(),
                  bpi: msg.nextUint16()
                };
                console.log(fields);
                this.bpm = fields.bpm;
                this.bpi = fields.bpi;
                
                // Kick off the local beat timing system
                if (this._nextIntervalBegin == null)
                  this._beginNewInterval();
                
                // TODO: Notify user interface
                if (this._callbacks.onChatMessage) {
                  this._callbacks.onChatMessage({
                    command: 'BPMBPI',
                    arg1: fields.bpm,
                    arg2: fields.bpi
                  });
                }
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
                  
                  var pieces = fields.username.split('@', 2);
                  var username = pieces[0];
                  var ip = (pieces.length == 2) ? pieces[1] : "";

                  // Create user if necessary
                  if (!this.users[fields.username]) {
                    console.log("User not already known, creating...");
                    this.users[fields.username] = new User(username, fields.username, ip);
                  }
                  var user = this.users[fields.username];

                  // If channel is active
                  if (fields.active == 1) {
                    // Create channel if necessary
                    if (!user.channels[fields.channelIndex]) {
                      console.log("Channel index not already known, creating...");
                      var channel = new Channel(fields.channelName, fields.volume, fields.pan);
                      console.log(channel);
                      channel.gainNode = this._audioContext.createGain();
                      channel.gainNode.connect(this._masterGain);
                      user.channels[fields.channelIndex] = channel;
                      
                      // Subscribe to this channel, since we just met it
                      if (this.autosubscribe)
                        this.setUsermask([fields.username]);
                    }
                    // Otherwise just update existing channel
                    else {
                      console.log("Channel already known. Updating...");
                      this.users[fields.username].channels[fields.channelIndex].update(fields.channelName, fields.volume, fields.pan);
                    }
                  }
                  else {
                    // This channel is no longer active, so remove it
                    if (user) {
                      console.log("Deleting now-inactive channel");
                      delete this.users[fields.username].channels[fields.channelIndex];
                    }
                  }
                }
                break;
              
              case 0x04:  // Server Download Interval Begin
                var fields = {
                  guid: this._arrayBufferToHexString(msg.nextArrayBuffer(16)),
                  estimatedSize: msg.nextUint32(),
                  fourCC: this._arrayBufferToString(msg.nextArrayBuffer(4)),
                  channelIndex: msg.nextUint8(),
                  username: msg.nextString()
                };
                console.log("Got new Download Interval Begin with username: " + fields.username);
                
                // If this GUID is already known to us
                if (this._audioIntervals.hasOwnProperty(fields.guid)) {
                  // Not sure how to treat this situation
                  console.log("[!!!] Received Download Interval Begin for known guid:");
                  console.log(fields.guid);
                }
                else {
                  if (fields.fourCC == "OGGv") {
                    // Set up a queue for this GUID, associated with the proper user/chan
                    this._audioIntervals[fields.guid] = new IntervalDownload(fields.username, fields.channelIndex);
                    //console.log("Audio intervals:");
                    //console.log(this._audioIntervals);
                  }
                  else {
                    console.log("[!!!] Received Download Interval Begin with non-OGGv fourCC:");
                    console.log(fields.fourCC);
                  }
                }
                break;
              
              case 0x05:  // Server Download Interval Write (receiving some audio)
                //console.log("Received a Server Download Interval Write notification. Payload size " + length);
                var fields = {
                  guid: this._arrayBufferToHexString(msg.nextArrayBuffer(16)),
                  flags: msg.nextUint8(),
                  audioData: msg.nextArrayBuffer(length - 17)
                };
                //console.log(fields);
                //console.log("Received a Server Download Interval Write notification. Payload size " + length + " Guid: " + fields.guid + " Flags: " + fields.flags);

                // If this GUID is already known to us
                if (this._audioIntervals.hasOwnProperty(fields.guid)) {
                  // Push the audio data to the queue for this GUID
                  this._audioIntervals[fields.guid].addChunk(fields.audioData);

                  // If flags==1, this queue is complete and may be assembled/decoded/scheduled for playback
                  if (fields.flags == 1) {
                    this._finishIntervalDownload(fields.guid);
                  }
                }
                else {
                  console.log("Tried pushing to guid queue " + fields.guid + " but it's not there!");
                }
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
                    this.users[fields.arg1] = new User(username, fields.arg1, ip);
                    break;
                  case "PART":
                    delete this.users[fields.arg1];
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
        
        chrome.sockets.tcp.send(this.socketId, buf, this._onDataSend.bind(this));
        this._lastSendTime = (new Date()).getTime();
      },
      
      // Send a Keepalive message to the server
      _sendKeepalive : function() {
        //console.log("Sending keepalive.");
        this._packMessage(0xFD, null);
      },
      
    });
    
    return new NinjamClient();
  }).
  factory("$store",function($parse){
  /**
   * Global Vars
   */
  //var storage = (typeof window.localStorage === 'undefined') ? undefined : window.localStorage,
  //  supported = !(typeof storage == 'undefined' || typeof window.JSON == 'undefined');
  var storage = chrome.storage.sync,
      supported = !(typeof storage == 'undefined' || typeof window.JSON == 'undefined');

  var privateMethods = {
    /**
     * Pass any type of a string from the localStorage to be parsed so it returns a usable version (like an Object)
     * @param res - a string that will be parsed for type
     * @returns {*} - whatever the real type of stored value was
     */
    parseValue: function(res) {
      var val;
      try {
        val = JSON.parse(res);
        if (typeof val == 'undefined'){
          val = res;
        }
        if (val == 'true'){
          val = true;
        }
        if (val == 'false'){
          val = false;
        }
        if (parseFloat(val) == val && !angular.isObject(val) ){
          val = parseFloat(val);
        }
      } catch(e){
        val = res;
      }
      return val;
    }
  };
  var publicMethods = {
    /**
     * Set - let's you set a new localStorage key pair set
     * @param key - a string that will be used as the accessor for the pair
     * @param value - the value of the localStorage item
     * @returns {*} - will return whatever it is you've stored in the local storage
     */
    set: function(key,value){
      if (!supported){
        try {
          $.cookie(key, value);
          return value;
        } catch(e){
          console.log('Local Storage not supported, make sure you have the $.cookie supported.');
        }
      }
      var saver = JSON.stringify(value);
      storage.set({key: value});
      return privateMethods.parseValue(saver);
    },
    /**
     * Get - let's you get the value of any pair you've stored
     * @param key - the string that you set as accessor for the pair
     * @returns {*} - Object,String,Float,Boolean depending on what you stored
     */
    get: function(key){
      if (!supported){
        try {
          return privateMethods.parseValue($.cookie(key));
        } catch(e){
          return null;
        }
      }
      var item = storage.get(key);
      return privateMethods.parseValue(item);
    },
    /**
     * Remove - let's you nuke a value from localStorage
     * @param key - the accessor value
     * @returns {boolean} - if everything went as planned
     */
    remove: function(key) {
      if (!supported){
        try {
          $.cookie(key, null);
          return true;
        } catch(e){
          return false;
        }
      }
      storage.remove(key);
      return true;
    },
    /**
           * Bind - let's you directly bind a localStorage value to a $scope variable
           * @param $scope - the current scope you want the variable available in
           * @param key - the name of the variable you are binding
           * @param def - the default value (OPTIONAL)
           * @returns {*} - returns whatever the stored value is
           */
          bind: function ($scope, key, def) {
              def = def || '';
              if (!publicMethods.get(key)) {
                  publicMethods.set(key, def);
              }
              $parse(key).assign($scope, publicMethods.get(key));
              $scope.$watch(key, function (val) {
                  publicMethods.set(key, val);
              }, true);
              return publicMethods.get(key);
          }
  };
  return publicMethods;
});

