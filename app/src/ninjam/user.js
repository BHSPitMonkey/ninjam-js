/**
 * Represents a user in the current NINJAM server.
 */
export default class User {
  constructor(name, fullname, ip) {
    this.name = name;
    this.fullname = fullname;
    this.ip = ip;
    this.channels = {};
  }
  addReadyInterval(audioBuffer, channelIndex) {
    if (this.channels.hasOwnProperty(channelIndex)) {
      this.channels[channelIndex].readyIntervals.push(audioBuffer);
    }
  }
}
