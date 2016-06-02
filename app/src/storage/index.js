let impl = null;
if (typeof chrome !== 'undefined' && chrome.storage.local) {
  impl = chrome.storage.local;
}
else if (typeof window.localStorage === 'object') {
  impl = window.localStorage;
}
else {
  // Throw some kind of error
  throw new Error('No local storage implementation found!');
}

export default impl;
