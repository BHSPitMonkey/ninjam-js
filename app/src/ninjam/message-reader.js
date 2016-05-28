/**
 * An interface for extracting information from a packed binary buffer.
 */
export default class MessageReader {
  /**
   * Construct a MessageReader using a given buffer.
   * @param {ArrayBuffer} buffer
   */
  constructor(buffer) {
    this._data = new DataView(buffer);
    this._offset = 0; // Current offset
  }
  nextUint8() {
    this._offset++;
    return this._data.getUint8(this._offset - 1);
  }
  nextUint16() {
    this._offset += 2;
    return this._data.getUint16(this._offset - 2, true);
  }
  nextUint32() {
    this._offset += 4;
    return this._data.getUint32(this._offset - 4, true);
  }
  nextInt8() {
    this._offset++;
    return this._data.getInt8(this._offset - 1);
  }
  nextInt16() {
    this._offset += 2;
    return this._data.getInt16(this._offset - 2, true);
  }
  nextInt32() {
    this._offset += 4;
    return this._data.getInt32(this._offset - 4, true);
  }
  // Returns the next n bytes (characters) of the message as a String.
  // If length is unspecified, we'll assume string is NUL-terminated.
  nextString(length) {
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
  }
  // Returns the next n bytes of the message as a new ArrayBuffer object
  nextArrayBuffer(bytes) {
    this._offset += bytes;
    return this._data.buffer.slice(this._offset - bytes, this._offset);
  }
  // Returns true if there is still more data to be retrieved from the message
  hasMoreData() {
    return (this._offset < this._data.byteLength);
  }
  // Returns the number of bytes remaining to be read
  bytesRemaining() {
    return this._data.byteLength - this._offset;
  }
}
