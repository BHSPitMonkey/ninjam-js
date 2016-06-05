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
  // For debugging; Returns a hexadecimal string of the entire buffer
  toHexString() {
    let ua = new Uint8Array(this._data.buffer);
    let h = '';
    ua.forEach(byte => {
      let str = byte.toString(16).toUpperCase();
      if (str.length == 1) h += '0';
      h += str + ' ';
    });
    return h;
  }
  // For debugging; Returns a UTF-8 representation of the entire buffer
  toString() {
    let td = new TextDecoder();
    return td.decode(this._data.buffer);
  }
  // For debugging
  toFancyString() {
    let ua = new Uint8Array(this._data.buffer);
    let hexChunk = '';
    let strChunk = '';
    let ret = '';
    let len = ua.length;
    ua.forEach((byte, i) => {
      let hex = byte.toString(16).toUpperCase();
      if (hex.length == 1) hex += '0';
      hexChunk += hex + ' ';

      if (byte == 0xA0)
        strChunk += ' ';
      else
        strChunk += String.fromCharCode(byte);

      // Flush line every 16 bytes
      if (i % 16 == 15 || i === len - 1) {
        ret += hexChunk + strChunk.replace('\n', ' ').replace('\r', ' ').replace('\xA0', ' ') + '\n';
        hexChunk = strChunk = '';
      }
    });
    return ret;
  }
}
