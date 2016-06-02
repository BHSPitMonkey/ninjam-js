import EventEmitter from 'events';
import { SHA1 } from 'crypto-js';
import uuid from 'node-uuid';

// Use node modules imported at runtime (without global, the modules will be resolved by webpack and use XHR)
const querystring = (typeof global !== 'undefined' && typeof global.require !== 'undefined' && global.require('querystring')) || null;
const https = (typeof global !== 'undefined' && typeof global.require !== 'undefined' && global.require('https')) || null;

// Private constants
const API_HOST = 'jammr.net';

/**
 * Wrapper for the jammr.net API.
 */
export default class JammrClient {
  constructor() {
    // Public properties
    this.hexToken = SHA1(uuid.v4()).toString();
    this.authenticated = false;
    this.supported = !!(typeof global.require !== 'undefined' && global.require('https'));

    // Private properties
    this.username = '';
    this._password = '';
    this._cookie = []; // Not needed?

    // Set up Event Emitter (for callbacks)
    this._emitter = new EventEmitter();
    this.on = this._emitter.on.bind(this._emitter);
    this.removeListener = this._emitter.removeListener.bind(this._emitter);
    this.emit = this._emitter.emit.bind(this._emitter);
  }

  /**
   * Authenticate with the jammr API.
   * @param {string} username
   * @param {string} password
   */
  authenticate(username, password) {
    let path = `/api/tokens/${username}/`;
    let url = `https://${API_HOST}${path}`;

    // NOTE: Since we can't do this in Chrome without resorting to socket hax, this will remain node/electron-only for now

    // Url-encode POST fields
    let post_data = querystring.stringify({
        'token' : this.hexToken
    });

    // Prepare POST request options
    let post_options = {
        host: API_HOST,
        path: path,
        method: 'POST',
        auth: `${username}:${password}`,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': post_data.length,
            'Referer': url,
        },
    };

    // Create request
    let req = https.request(post_options, (resp) => {
        if (resp.statusCode === 201) {
            // Login successful; our token has been accepted
            this.username = username;
            this._password = password;

            // Parse and save the cookie
            this._cookie = resp.headers['set-cookie'][0].split(';', 1)[0].split('=', 2);
            console.log("Got jammr session ID: ", this._cookie[1]);
            this.authenticated = true;
            this.emit('authenticate');
        } else {
            // Login failed
            console.log(`jammr login failed with status code ${resp.statusCode}`, resp);
            this.emit('error', 'Authentication failure');
        }

        // resp.on('data', (d) => {
        //   console.log(d);
        // });
    });
    req.write(post_data);
    req.end();
  }

  /**
   * Get list of live jam sessions.
   */
  getLiveJams() {
    if (!this.authenticated) {
      throw new Error("Not authenticated");
    }

    let path = `/api/livejams/`;
    let url = `https://${API_HOST}${path}`;

    let options = { 
      host: API_HOST,
      path: path,
      method: 'GET',
      auth: `${this.username}:${this._password}`,
      headers: {
          'Referer': url,
      },
    };
    let promise = new Promise((resolve, reject) => {
      let results = ''; 
      let req = https.request(options, (res) => {
        res.on('data', (chunk) => {
          results += chunk;
          //TODO
        }); 
        res.on('end', () => {
          //TODO
          console.log("Got end of data: ", results);
          let decoded = JSON.parse(results);
          resolve(decoded);
        }); 
      });

      req.on('error', function(e) {
        //TODO
        reject();
      });

      req.end();
    });
    return promise;
  }
}
