import NodeNetSocket from './node-net-socket';
import ChromeNetSocket from './chrome-net-socket';
import MozNetSocket from './moz-net-socket';

let impl = null;
if (typeof global.require !== 'undefined' && global.require('net')) {
  impl = NodeNetSocket;
}
else if (typeof chrome !== 'undefined' && chrome.sockets) {
  impl = ChromeNetSocket;
}
else if (navigator.mozTCPSocket) {
  impl = MozNetSocket;
}
else {
  // Throw some kind of error
}

export default impl;
