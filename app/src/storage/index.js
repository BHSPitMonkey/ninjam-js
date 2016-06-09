let impl = null;
if (typeof chrome !== 'undefined' && chrome.storage.local) {
  impl = class {
    static setItem(key, value) {
      let obj = {};
      obj[key] = value;
      chrome.storage.local.set(obj);
    }
    static getItem(key, value) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.get(key, items => {
          if (key in items) {
            resolve(items[key]);
          } else {
            reject(new Error('Key not found in storage'));
          }
        });
      });
    }
  };
}
else if (typeof window.localStorage === 'object') {
  impl = class {
    static setItem(key, value) {
      window.localStorage[key] = value;
    }
    static getItem(key, value) {
      return new Promise((resolve, reject) => {
        let result = window.localStorage[key];
        if (typeof result === 'undefined') {
          reject(new Error('Key not found in storage'));
        } else {
          resolve(window.localStorage[key]);
        }
      });
    }
  };
}
else {
  // Throw some kind of error
  throw new Error('No local storage implementation found!');
}

export default impl;
