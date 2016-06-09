import { SHA1, lib as CryptoLib } from 'crypto-js';
import EventEmitter from 'events';
import NetSocket from '../net-socket';
import DownloadManager from './download-manager';
import MessageReader from './message-reader';
import MessageBuilder from './message-builder';
import User from './user';
import LocalChannel from './local-channel';
import Channel from './remote-channel';

/**
 * Convert a WordArray to a Uint8Array.
 * (From https://groups.google.com/forum/#!topic/crypto-js/TOb92tcJlU0)
 * @param {WordArray} wordArray - WordArray object as returned by crypto-js
 * @return {Uint8Array}
 */
function wordArrayToTypedArray(wordArray) {
  // Shortcuts
  var words = wordArray.words;
  var sigBytes = wordArray.sigBytes;

  // Convert
  var u8 = new Uint8Array(sigBytes);
  for (var i = 0; i < sigBytes; i++) {
      var byte = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
      u8[i]=byte;
  }

  return u8;
}

/**
 * Ninjam Client
 */
export default class NinjamClient {
  constructor() {
    // Constants
    this.PROTOCOL_NINJAM = 'ninjam';
    this.PROTOCOL_JAMMR = 'jammr';

    this.status = "starting";

    // Set up audio playback context
    window.AudioContext = window.AudioContext||window.webkitAudioContext;
    this._audioContext = new window.AudioContext();
    this._masterGain = this._audioContext.createGain();
    this._masterGain.connect(this._audioContext.destination);
    this._metronomeGain = this._audioContext.createGain();
    this._metronomeGain.connect(this._masterGain);

    // Set up metronome sounds
    this._hiClickBuffer = null;
    this._loClickBuffer = null;
    var requestLo = new XMLHttpRequest();
    requestLo.open("GET", "snd/met-lo.ogg", true);
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
    requestHi.open("GET", "snd/met-hi.ogg", true);
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
    this.socket = new NetSocket({
      protocol: "tcp",
      onCreate: this.onSocketCreate.bind(this),
      onConnect: this.onSocketConnect.bind(this),
      onReceive: this.parseMessages.bind(this),
      onSend: this.onSocketSend.bind(this),
      //onError: this.onSocketError.bind(this),
      //onDisconnect: this.onSocketDisconnect.bind(this),
      //onClose: this.onSocketClose.bind(this),
    });

    // Set up Event Emitter (for callbacks)
    this._emitter = new EventEmitter();
    this.on = this._emitter.on.bind(this._emitter);
    this.removeListener = this._emitter.removeListener.bind(this._emitter);
  }

  /**
   * (Re)initialize/reset to a clean state
   *
   * Intended to be called after disconnecting (or during construction).
   */
  reinit() {
    this.debug = false;         // Causes debug pane to appear in UI
    this.status = "ready";
    this.host = null;
    this.port = null;
    this.protocol = this.PROTOCOL_NINJAM;
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
    this.setMasterMute(true);
    this.setMetronomeMute(false);
    this.connected = false;

    this.localChannels = [];
    this.setMicrophoneInputMute(false);

    this._checkKeepaliveTimeout = null;    // setTimeout handle for checking timeout
    this._lastSendTime = null;      // Time of last socket write
    this._msgBacklog = null;        // ArrayBuffer of incomplete server message(s)
    this._nextIntervalBegin = null; // setTimeout handle for local interval setup
    this.downloads = new DownloadManager();
  }

  onSocketCreate(success) {
    if (success === true) {
      this.reinit();
    }
    else {
      console.log("Couldn't create socket!");
      this.status = "no socket";
    }
  }

  onSocketConnect(success) {
    if (success === true) {
      this.connected = true;

      // Try to enumerate recording devices (TODO)
      // if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      //   console.error("enumerateDevices() not supported.");
      //   return;
      // }

      // List all audio inputs (TODO)
      // navigator.mediaDevices.enumerateDevices()
      // .then(function(devices) {
      //   devices.forEach(function(device) {
      //     // TODO: Only care about ones where device.kind is 'audioinput'
      //     console.log(device.kind + ": " + device.label + " id = " + device.deviceId);
      //   });
      // })
      // .catch(function(err) {
      //   console.error(err.name + ": " + err.message);
      // });

      // Get recording devices
      navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        // Only care about non-default audioinput devices
        devices = devices.filter(device => {
          return device.kind == 'audioinput' && device.deviceId != 'default';
        });

        // Call getUserMedia for all devices
        devices.forEach(device => {
          console.log(`Discovered device: ${device.label}`);
          navigator.webkitGetUserMedia(
            {
              audio: {
                mandatory: {
                  sourceId: device.deviceId,
                },
                optional: [
                  {'googEchoCancellation': false},
                  {'googAutoGainControl': false},
                  {'googAutoGainControl2': false},
                  {'googNoiseSuppression': false},
                  {'googHighpassFilter': false},
                  {'googTypingNoiseDetection': false},
                  {'echoCancellation': false},
                ],
              },
            },
            stream => {
              this.localChannels.push(new LocalChannel(
                stream,
                this._masterGain,
                this._audioContext,
                this.announceUploadIntervalBegin.bind(this),
                this.gotLocalEncodedChunk.bind(this)
              ));
            },
            err => {
              console.error("Call to webkitGetUserMedia failed :(", e);
            }
          );
        });
      })
      .catch(err => {
        console.error('Could not enumerate media devices for recording.', err);
      });
    }
    else {
      console.log("Socket open attempt failed");
    }
  }

  onSocketReceiveError(message) {
    console.log("Something wrong with socket: " + message);
  }

  onSocketSend(success) {
    if (success !== true) {
      console.log("Error sending to socket!");
    }
  }

  // Periodically check whether a new keepalive message is needed
  _checkKeepalive() {
    if (this.status == "authenticated" && (new Date()).getTime() - this._lastSendTime > 3000)
      this._sendKeepalive();

    this._checkKeepaliveTimeout = setTimeout(this._checkKeepalive.bind(this), 3000);
  }

  /**
   * Connect to a NINJAM server.
   * @param {string} host - Host and port, e.g. "ninbot.com:2052".
   * @param {string} username - Username/handle to connect as.
   * @param {string} password - Password, normally an empty string.
   * @param {function} onChallenge - Callback for when the server issues challenge.
   * @param {boolean} jammr - True if connecting to a jammr server
   */
  connect(host, username, password, onChallenge, jammr) {
    if (jammr) {
      console.warn("jammr not yet supported by ninjam client");
      this.protocol = this.PROTOCOL_JAMMR;
    }

    console.log("Connect called. Status is: " + this.status);
    if (this.status == "ready") {
      this.username = username;
      this.anonymous = !password;
      if (this.anonymous)
        username = "anonymous:" + username;
      this.passHash = SHA1(username + ':' + password); // Pass 1/2
      this.on('challenge', onChallenge);

      // Split the host string (e.g. hostname:port) into hostname and port
      var pieces = host.split(":");
      if (pieces.length == 2) {
        this.host = pieces[0];
        this.port = parseInt(pieces[1]);
      }
      else {
        throw "Invalid host format"
      }

      this.socket.connect(this.host, this.port);

      this.status = "connecting";
    }
    else {
      console.log("Can't connect: Socket not created! " + this.status);
    }
  }

  /**
   * Respond to the server's auth challenge.
   * @param {boolean} acceptedAgreement - True if client accepts the server's terms.
   */
  respondToChallenge(acceptedAgreement) {
    var username = (this.anonymous) ? "anonymous:" + this.username : this.username;
    var msg = new MessageBuilder(29 + username.length);

    // Insert password hash (binary, not hex string)
    msg.appendArrayBuffer(wordArrayToTypedArray(this.passHash).buffer);

    // Insert username
    msg.appendString(username);

    // Insert other fields
    var capabilities = (acceptedAgreement) ? 1 : 0;
    msg.appendUint32(capabilities);
    if (this.protocol === this.PROTOCOL_JAMMR) {
      msg.appendUint32(0x80000000);
    } else {
      msg.appendUint32(0x00020000);
    }

    if (!msg.hasMoreData())
      console.log("Message appears to be filled.");
    else
      console.log("Message appears to have more room left to populate!");

    console.log("Sending challenge response. " + msg.buf.byteLength + " bytes.");
    this._packMessage(0x80, msg.buf);

    // Re-enable sounds
    this.setMasterMute(false);
  }

  // Set flags (for receiving) for one or more channels. Param is an array.
  setUsermask(usermasks) {
    var usernamesLength = 0;
    for (var i=0; i<usermasks.length; i++)
      usernamesLength += (usermasks[i].length + 1); // +1 for NUL
    var msg = new MessageBuilder(usernamesLength + (usermasks.length * 4));

    for (var i=0; i<usermasks.length; i++) {
      msg.appendString(usermasks[i]);
      msg.appendUint32(0xFFFFFFFF); // Lazily subscribe to any and all possible channels...
    }

    this._packMessage(0x81, msg.buf);
  }

  // Tell the server about our channel(s).
  setChannelInfo() {
    var allNamesLength = 0;
    for (var i=0; i<this.localChannels.length; i++) {
      allNamesLength += (this.localChannels[i].name.length + 1); // +1 for NUL char
    }
    var msg = new MessageBuilder(2 + allNamesLength + (4 * this.localChannels.length));
    msg.appendUint16(4);  // Channel parameter size
    for (var i=0; i<this.localChannels.length; i++) {
      msg.appendString(this.localChannels[i].name);  // Channel name
      msg.appendInt16(0);         // Volume (0dB)
      msg.appendInt8(0);          // Pan
      msg.appendUint8(1);         // Flags (???)
      //msg.appendZeros(paramLength - 5 - this.localChannels[i].name.length);
    }

    this._packMessage(0x82, msg.buf);
  }

  // Disconnect from the current server
  disconnect(reason) {
    console.log("Disconnecting from server.");
    this.status = "disconnecting";
    if (this._nextIntervalBegin) {
      clearTimeout(this._nextIntervalBegin);
      this._nextIntervalBegin = null;
    }
    if (this._checkKeepaliveTimeout) {
      clearTimeout(this._checkKeepaliveTimeout)
      this._checkKeepaliveTimeout = null;
    }
    this.socket.disconnect();
    this.connected = false;
    // TODO: Kill all the audio
    this.downloads.clearAll();
    this._emitter.emit('disconnect', reason);
    this.reinit();
  }

  setMasterMute(state) {
    this.masterMute = state;
    this._masterGain.gain.value = (this.masterMute) ? 0.0 : 1.0;
  }

  toggleMasterMute() {
    this.setMasterMute(!this.masterMute);
  }

  setMetronomeMute(state) {
    this.metronomeMute = state;
    this._metronomeGain.gain.value = (this.metronomeMute) ? 0.0 : 1.0;
  }

  toggleMetronomeMute() {
    this.setMetronomeMute(!this.metronomeMute);
  }

  setMicrophoneInputMute(state) {
    this.microphoneInputMute = state;
    for (var i=0; i<this.localChannels.length; i++) {
      this.localChannels[i].setInputMute(state);
    }
  }

  toggleMicrophoneInputMute() {
    this.setMicrophoneInputMute(!this.microphoneInputMute);
  }

  // Send something to server
  submitChatMessage(content) {
    var msg = new MessageBuilder(content.length + 8);
    msg.appendString('MSG');
    msg.appendString(content);
    msg.appendString('');
    msg.appendString('');
    msg.appendString('');
    this._packMessage(0xc0, msg.buf);
  }

  submitPrivateMessage(recipient, content) {
    var msg = new MessageBuilder(recipient.length + content.length + 12);
    msg.appendString('PRIVMSG');
    msg.appendString(recipient);
    msg.appendString(content);
    msg.appendString('');
    msg.appendString('');
    this._packMessage(0xc0, msg.buf);
  }

  submitTopic(content) {
    var msg = new MessageBuilder(content.length + 10);
    msg.appendString('TOPIC');
    msg.appendString(content);
    msg.appendString('');
    msg.appendString('');
    msg.appendString('');
    this._packMessage(0xc0, msg.buf);
  }

  // TODO: Need to figure out local channel index if more than one exist
  announceUploadIntervalBegin(guid) {
    var msg = new MessageBuilder(25);
    msg.appendArrayBuffer(guid.buffer);
    msg.appendUint32(0); // Just set estimated size to 0
    msg.appendString("OGGv", 4);
    msg.appendUint8(0); // TODO: Channel index
    this._packMessage(0x83, msg.buf);
  }

  // Send a locally-recorded chunk to the server
  // data : ArrayBuffer
  // TODO: Need to figure out local channel index if more than one exist
  gotLocalEncodedChunk(guid, data, final) {
    //console.log("gotLocalEncodedChunk, length " + data.byteLength, guid, data, final);
    if (final) console.log("Writing final chunk for interval");
    var msg = new MessageBuilder(17 + data.byteLength);
    msg.appendArrayBuffer(guid.buffer);
    msg.appendUint8(final ? 1 : 0); // Flags
    msg.appendArrayBuffer(data);
    this._packMessage(0x84, msg.buf);
  }

  // Converts an array buffer to a string asynchronously
  _arrayBufferToStringAsync(buf, callback) {
    var bb = new Blob([new Uint8Array(buf)]);
    var f = new FileReader();
    f.onload = function(e) {
      callback(e.target.result);
    };
    f.readAsText(bb);
  }

  // Converts a string to an array buffer
  _stringToArrayBufferAsync(str, callback) {
    var bb = new Blob([str]);
    var f = new FileReader();
    f.onload = function(e) {
        callback(e.target.result);
    };
    f.readAsArrayBuffer(bb);
  }

  // Converts an array buffer to a hex string
  _arrayBufferToHexString(buf) {
    var str = "";
    var arr = new Uint8Array(buf);
    for (var i=0; i<arr.byteLength; i++) {
      var hex = arr[i].toString(16);
      if (hex.length == 1) hex = "0" + hex;
      str += hex;
    }
    return str;
  }

  // Converts an array buffer to a string
  _arrayBufferToString(buf) {
    var str = "";
    var arr = new Uint8Array(buf);
    for (var i=0; i<arr.byteLength; i++) {
      str += String.fromCharCode(arr[i]);
    }
    return str;
  }

  // Sets up a new interval
  _beginNewInterval() {
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
      if (i == 0) {
        this.currentBeat = 0;
        this._emitter.emit('beat', this.currentBeat);
      } else {
        setTimeout(function() {
          this.currentBeat = (this.currentBeat + 1) % this.bpi;
          this._emitter.emit('beat', this.currentBeat);
        }.bind(this), (clickTime - this._currentIntervalCtxTime) * 1000);
      }
    }

    // Tell LocalChannels about the new interval
    this.localChannels.forEach(channel => {
      channel.newInterval();
    });

    // Call this function again at the start of the next interval
    this._nextIntervalBegin = setTimeout(this._beginNewInterval.bind(this), secondsToNext * 1000);
  }

  // Finish and enqueue a particular interval download
  _finishIntervalDownload(guid) {
    // Retrieve the data and delete the download from the queue
    var fullBufferArray = this.downloads.get(guid).finish();
    var username = this.downloads.get(guid).username;
    var channelIndex = this.downloads.get(guid).channelIndex;

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
    this.downloads.deleteInterval(guid);
  }

  // Play the next ready interval (if exists) for all Channels
  _playAllChannelsNextInterval() {
    for (var name in this.users) {
      if (this.users.hasOwnProperty(name)) {
        for (var index in this.users[name].channels) {
          this.users[name].channels[index].playNextInterval();
        }
      }
    }
  }

  // Parses an ArrayBuffer received from a Ninjam server
  parseMessages(buf) {
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
              challenge: msg.nextArrayBuffer(8),
              serverCapabilities: msg.nextInt32(),
              //keepaliveInterval: msg.nextInt16(),
              protocolVersion: msg.nextUint32(),
              licenseAgreement: ''
            };
            if (msg.hasMoreData()) {
              fields.licenseAgreement = msg.nextString();
            }

            // Merge passHash with challenge
            let passChallenge = new MessageBuilder(28);
            passChallenge.appendArrayBuffer(wordArrayToTypedArray(this.passHash).buffer);
            passChallenge.appendArrayBuffer(fields.challenge);
            this.passHash = SHA1(CryptoLib.WordArray.create(new Uint8Array(passChallenge.buf)));

            // Tell the UI about this challenge
            this._emitter.emit('challenge', fields);
            this._emitter.removeAllListeners('challenge');
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
              this._checkKeepaliveTimeout = setTimeout(this._checkKeepalive.bind(this), 3000);
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

            // Notify user interface
            this._emitter.emit('chatMessage', {
              command: 'BPMBPI',
              arg1: fields.bpm,
              arg2: fields.bpi
            });
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

              // If channel is active
              if (fields.active == 1) {
                // Create user if necessary
                if (!this.users[fields.username]) {
                  console.log("User not already known, creating...");
                  this.users[fields.username] = new User(username, fields.username, ip);
                }
                var user = this.users[fields.username];

                // Create channel if necessary
                if (!user.channels[fields.channelIndex]) {
                  console.log("Channel index not already known, creating...");
                  var channel = new Channel(fields.channelName, fields.volume, fields.pan, this._masterGain);
                  console.log(channel);
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
                if (this.users[fields.username]) {
                  console.log("Deleting now-inactive channel");
                  delete this.users[fields.username].channels[fields.channelIndex];
                }
              }
            }
            // Inform callbacks
            this._emitter.emit('userInfoChange', fields);
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
            var download = this.downloads.get(fields.guid);
            if (this.downloads.contains(fields.guid)) {
              // Not sure how to treat this situation
              console.log("[!!!] Received Download Interval Begin for known guid:");
              console.log(fields.guid);
            }
            else {
              if (fields.fourCC == "OGGv") {
                // Set up a queue for this GUID, associated with the proper user/chan
                this.downloads.addInterval(fields.guid, fields.username, fields.channelIndex);
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
            if (this.downloads.contains(fields.guid)) {
              // Push the audio data to the queue for this GUID
              this.downloads.get(fields.guid).addChunk(fields.audioData);

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
                this.downloads.deleteUserDownloads(fields.arg1);
                delete this.users[fields.arg1];
                break;
              case "USERCOUNT":
                break;
            }

            // Inform callbacks
            this._emitter.emit('chatMessage', fields);
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
  }

  //

  /**
   * Assemble a Ninjam client message and write it to the server.
   * @param {number} type - The NINJAM message type as a byte. (e.g. 0xC0)
   * @param {ArrayBuffer} payload - Contents of the message. See MessageBuilder
   */
  _packMessage(type, payload) {
    if (!this.connected) return;

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

    this.socket.send(buf);
    this._lastSendTime = (new Date()).getTime();
  }

  // Send a Keepalive message to the server
  _sendKeepalive() {
    //console.log("Sending keepalive.");
    this._packMessage(0xFD, null);
  }
}
