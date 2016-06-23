const Utf8Encoder = new TextEncoder("utf-8");

/**
 * An interface for packing information into a binary buffer.
 */
export default class MessageBuilder {
  /**
   * Construct a new MessageBuilder with a given length.
   * @param {number} length - Length in bytes of this message.
   */
  constructor(length) {
    this.buf = new ArrayBuffer(length);
    this._data = new DataView(this.buf);
    this._offset = 0; // Current offset
  }
  appendUint8(value) {
    this._data.setUint8(this._offset, value);
    this._offset++;
  }
  appendUint16(value) {
    this._data.setUint16(this._offset, value, true);
    this._offset += 2;
  }
  appendUint32(value) {
    this._data.setUint32(this._offset, value, true);
    this._offset += 4;
  }
  appendInt8(value) {
    this._data.setInt8(this._offset, value);
    this._offset++;
  }
  appendInt16(value) {
    this._data.setInt16(this._offset, value, true);
    this._offset += 2;
  }
  appendInt32(value) {
    this._data.setInt32(this._offset, value, true);
    this._offset += 4;
  }
  appendString(string, nullTerminate = true) {
    let arr = Utf8Encoder.encode(string);
    this.appendArrayBuffer(arr.buffer);
    if (nullTerminate)
      this.appendUint8(0);
  }
  appendArrayBuffer(data) {
    var dv = new DataView(data);
    var length = dv.byteLength;
    for (var i=0; i<length; i++) {
      this._data.setUint8(this._offset + i, dv.getUint8(i));
    }
    this._offset += length;
  }
  appendZeros(count) {
    for (var i=0; i<count; i++) {
      this.appendUint8(0);
    }
  }
  // Returns true if there is still more data to be retrieved from the message
  hasMoreData() {
    return (this._offset < this._data.byteLength);
  }
}
