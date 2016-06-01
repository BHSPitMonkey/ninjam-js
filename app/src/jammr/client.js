import axios from 'axios';
import { SHA1 } from 'crypto-js';
import uuid from 'node-uuid';

/**
 * Wrapper for the jammr.net API.
 */
export default class JammrClient {
  constructor() {
    this.hexToken = SHA1(uuid.v4()).toString();
  }

  /**
   * Authenticate with the jammr API.
   * @param {string} username
   * @param {string} password
   */
  authenticate(username, password) {
    let url = `https://jammr.net/api/tokens/${username}/`;
    axios.request({
      url: url,
      method: 'post',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': url, // Won't work
      },
      data: {
        token: this.hexToken,
      },
      auth: {
        username: username,
        password: password,
      },
      responseType: 'text', // TODO
    })
    .then(function (response) {
      console.log('success!', response);
    })
    .catch(function (response) {
      console.log('error!', response);
    });
  }
}
