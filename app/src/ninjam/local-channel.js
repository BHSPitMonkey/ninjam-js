// Note: libvorbis.js not yet webpack-friendly; VorbisEncoder can be expected to exist globally for now

/**
 * LocalChannels encapsulate local audio input devices, their audio legwork,
 * and the way they are presented to the server.
 *
 * In general, you will have one LocalChannel per recording device, all
 * with enabled=false by default, and the user will turn on the one(s) they
 * want to expose to the server. Once turned on, the user will click a
 * Transmit button for the channel when they are ready to start broadcasting.
 */
export default class LocalChannel {
  /**
   * @construct
   * @param {MediaStream} stream An audio stream granted by getUserMedia.
   * @param {AudioNode} outputNode The AudioNode the audio should leave
   *     through for local playback.
   * @param {AudioContext} context The master audio context
   * @param {function} onBeginUpload Callback to notify Client of new GUID
   * @param {function} onEncodedChunk Callback that encoded Vorbis chunks can
   *     be returned to.
   */
  constructor(stream, outputNode, context, onBeginUpload, onEncodedChunk) {
    var sourceNode = context.createMediaStreamSource(stream);
    this.setName(stream.getAudioTracks()[0].label);
    this.enabled = true; // Decides if this channel is advertised to the server TODO: Default to false, maybe persist last known config
    this.transmit = false; // Decides if this channel should send audio to the server (starting at the next interval at earliest)
    this.activeTransmit = false; // Decides if this channel should be transmitting NOW (not to be directly manipulated by user)
    this.localMute = true; // Decides if the user should NOT hear their own audio
    this.inputMute = false; // Decides if this channel should temporarily only output silence
    this.localGain = outputNode.context.createGain();
    this.localGain.gain.value = 0;
    this.localGain.connect(outputNode);
    this.analyser = outputNode.context.createAnalyser();
    this.analyser.fftSize = 32;
    this.analyser.connect(this.localGain);
    this.encoderNode = outputNode.context.createScriptProcessor(1024);
    this.encoderNode.onaudioprocess = this.onEncoderProcess.bind(this);
    this.encoderNode.connect(this.analyser);
    this.inputGain = outputNode.context.createGain();
    this.inputGain.gain.value = 0.8;
    this.inputGain.connect(this.encoderNode);
    this.sourceNode = sourceNode;
    this.sourceNode.connect(this.inputGain);
    this.frequencyData = new Float32Array(this.analyser.frequencyBinCount);
    this.frequencyDataLastUpdate = 0;
    this.maxDecibelValue = 0; // Should map from 0 to 100
    this._context = context;
    this._prevGuid = null;
    this._guid = null;
    this._finalizeInterval = false;
    this.frequencyUpdateLoop = function(timestamp) {
      if (timestamp > this.frequencyDataLastUpdate + 10) {
        this.frequencyDataLastUpdate = timestamp;
        this.analyser.getFloatFrequencyData(this.frequencyData);
        this.maxDecibelValue = 100 + Math.max.apply(null, this.frequencyData);
        //$rootScope.$apply(this.maxDecibelValue);
      }
      window.requestAnimationFrame(this.frequencyUpdateLoop);
    }.bind(this);
    window.requestAnimationFrame(this.frequencyUpdateLoop);

    // Set up Vorbis encoder
    this._onBeginUpload = onBeginUpload;
    this._onEncodedChunk = onEncodedChunk;
    this._encoder = new VorbisEncoder();
    this._encoder.ondata = this.onEncoderData.bind(this);
    //this._encoder.onfinish = this.onEncoderFinish.bind(this);
    // Copying these params from VorbisMediaRecorder implementation:
    this._encoder.init(this.sourceNode.channelCount, this._context.sampleRate, 0.4);

    // Pre-bind methods
    this.toggleLocalMute = this.toggleLocalMute.bind(this);
    this.toggleTransmit = this.toggleTransmit.bind(this);
  }
  setName(name) {
    this.name = name;
  }
  setEnabled(state) {
    if (this.enabled === state)
      return;
    // TODO: Do stuff
    this.enabled = state;
  }
  setInputMute(state) {
    this.inputMute = state;
    this.inputGain.gain.value = (this.inputMute) ? 0.0 : 1.0;
  }
  toggleInputMute() {
    this.setInputMute(!this.inputMute);
  }
  setLocalMute(state) {
    this.localMute = state;
    this.localGain.gain.value = (this.localMute) ? 0.0 : 1.0;
  }
  toggleLocalMute() {
    this.setLocalMute(!this.localMute);
  }
  toggleTransmit() {
    this.transmit = !this.transmit;

    // Only 'off' toggles have an instant effect on activeTransmit status ('on' will wait for next interval)
    if (!this.transmit) {
      this.activeTransmit = false;

      // Tell the server we're done uploading for this interval
      this._onEncodedChunk(this._guid, new ArrayBuffer(0), true);
    }
  }
  newInterval() {
    // If transmit was requested during the last interval, actually begin transmitting now
    if (this.transmit === true) {
      this.activeTransmit = true;
    }

    // Reinitialize the encoder
    this._encoder.finish();
    this._encoder.init(this.sourceNode.channelCount, this._context.sampleRate, 0.4);

    // Indicate to the encoder's ondata handler to send next chunk as "final"
    this._finalizeInterval = true;

    // Refresh our GUID
    this._prevGuid = this._guid;
    this._guid = crypto.getRandomValues(new Uint8Array(16));
    this._onBeginUpload(this._guid);
  }
  /**
   * Called by the ScriptProcessorNode (this.encoderNode) when there is new
   * audio data to be processed.
   * @param {AudioProcessingEvent} event
   */
  onEncoderProcess(event) {
    var buffers = [];
    var inputBuffer = event.inputBuffer;

    // Loop through the input channels
    for (var channel = 0; channel < event.inputBuffer.numberOfChannels; channel++) {
      var inData = inputBuffer.getChannelData(channel);
      var outData = event.outputBuffer.getChannelData(channel);

      // Copy the input directly to the output buffer unchanged (to keep the pipeline going)
      outData.set(inData);

      // Copy this channel's input buffer data to buffers array to be encoded
      if (this.activeTransmit) {
        buffers.push(inputBuffer.getChannelData(channel).slice().buffer);
      }
    }

    // Send data to our VorbisEncoder
    if (this.activeTransmit) {
      this._encoder.encode(buffers, inputBuffer.length, inputBuffer.numberOfChannels);
    }
  }
  /**
   * Called by VorbisEncoder instance as encoded chunks become available
   */
  onEncoderData(data) {
    let guid = this._finalizeInterval ? this._prevGuid : this._guid;
    if (guid !== null) {
      this._onEncodedChunk(guid, data, this._finalizeInterval);
    }
    this._finalizeInterval = false;
  }
}
