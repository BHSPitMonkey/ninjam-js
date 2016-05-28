/**
 * Represents a single in-progress interval download.
 */
export default class IntervalDownload {
  constructor(username, channelIndex) {
    this.username = username;
    this.channelIndex = channelIndex;
    this.chunks = [];
  }
  addChunk(chunk) {
    this.chunks.push(chunk);
  }
  // Return a fully-assembled ArrayBuffer containing the OGGv data.
  // This IntervalDownload should be deleted after finish() returns.
  finish() {
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
}
