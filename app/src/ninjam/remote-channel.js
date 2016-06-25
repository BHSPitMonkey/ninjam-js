/**
 * Class representing a single channel from a remote NINJAM server.
 */
export default class RemoteChannel {
  /**
   * @param {string} name - Channel name as provided by server
   * @param {number} volume - Channel volume as provided by server
   * @param {number} pan - Channel pan as provided by server
   * @param {AudioNode} outputNode - Audio node where this channel's audio goes
   */
  constructor(name, volume, pan, outputNode) {
    this.update(name, volume, pan);
    this.readyIntervals = [];
    this.localMute = false;
    this.localSolo = false;
    this.localVolume = 0.8;
    this.analyser = outputNode.context.createAnalyser();
    this.analyser.fftSize = 32;
    this.analyser.connect(outputNode);
    this.gainNode = outputNode.context.createGain();
    this.gainNode.gain.value = this.localVolume;
    this.gainNode.connect(this.analyser);
    this.frequencyData = new Float32Array(this.analyser.frequencyBinCount);
    this.frequencyDataLastUpdate = 0;
    this.maxDecibelValue = 0; // Should map from 0 to 100
    this.frequencyUpdateLoop = function(timestamp) {
      if (timestamp > this.frequencyDataLastUpdate + 75) {
        this.frequencyDataLastUpdate = timestamp;
        this.analyser.getFloatFrequencyData(this.frequencyData);
        this.maxDecibelValue = 100 + Math.max.apply(null, this.frequencyData);
        ////$rootScope.$apply(this.maxDecibelValue);
      }
      window.requestAnimationFrame(this.frequencyUpdateLoop);
    }.bind(this);
    window.requestAnimationFrame(this.frequencyUpdateLoop);
  }

  /**
   * Apply updated values from the server.
   * @param {string} name - Channel name as provided by server
   * @param {number} volume - Channel volume as provided by server
   * @param {number} pan - Channel pan as provided by server
   */
  update(name, volume, pan) {
    this.name = (name != "") ? name : "No name";
    this.volume = volume;
    this.pan = pan;
  }

  /**
   * Immediately play the next ready audio interval for this channel.
   */
  playNextInterval() {
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

  /**
   * Set the channel's mute state.
   * @param {boolean} state - True if channel should be muted
   */
  setMute (state) {
    this.localMute = state;
    this.gainNode.gain.value = (this.localMute) ? 0.0 : this.localVolume;
  }

  /**
   * Toggle the channel's current mute state.
   */
  toggleMute () {
    this.setMute(!this.localMute);
  }

  setVolume(volume) {
    this.localVolume = volume;
    this.gainNode.gain.value = this.localVolume;
  }
}
