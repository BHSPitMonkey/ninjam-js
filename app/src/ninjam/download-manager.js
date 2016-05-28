import IntervalDownload from './interval-download';

export default class DownloadManager {
  constructor() {
    this.intervals = {};
  }
  contains(guid) {
    return this.intervals.hasOwnProperty(guid);
  }
  get(guid) {
    return this.intervals[guid];
  }
  addInterval(guid, username, channelIndex) {
    this.intervals[guid] = new IntervalDownload(username, channelIndex);
  }
  deleteInterval(guid) {
    delete this.intervals[guid];
  }
  deleteUserDownloads(username) {
    for (var guid in this.downloads) {
      if (this.intervals[guid].username == username) {
        delete this.intervals[guid];
      }
    }
  }
  clearAll() {
    this.intervals = {};
  }
}
