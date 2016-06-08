import React from 'react';
import xhr from 'xhr';
import { ListGroup, ListGroupItem, Label } from 'react-bootstrap';
import LoginModal from './login-modal.jsx';
import storage from '../../storage/index.js';

export default class PublicServerList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      servers: JSON.parse(storage.getItem('publicServers')) || [
        { host: "ninjamer.com:2049", locale: "FR" },
        { host: "ninjamer.com:2050", locale: "FR" },
        { host: "ninjamer.com:2051", locale: "FR" },
        { host: "ninjamer.com:2052", locale: "FR" },
        { host: "ninbot.com:2049", locale: "US" },
        { host: "ninbot.com:2050", locale: "US" },
        { host: "ninbot.com:2051", locale: "US" },
        { host: "ninbot.com:2052", locale: "US" },
        { host: "virtualliveband.de:2051", locale: "DE" },
        { host: "mutantlab.com:2049", locale: "US" },
      ],
      selected: -1,
    }

    this.refreshList = this.refreshList.bind(this);
    this.select = this.select.bind(this);
    this.onLoginResponse = this.onLoginResponse.bind(this);

    this.refreshList();
  }

  /**
   * Refresh the list of public servers from ninjam.com
   */
  refreshList() {
    const url = "http://autosong.ninjam.com/serverlist.php";

    xhr.get(url, (err, resp) => {
      if (err) {
        console.error('Unable to fetch public server list');
        return;
      }

      const data = resp.body;

      // Parse the server list
      if (data.substring(0, 6) != "SERVER") {
        console.log("Invalid server list from ninjam.com");
        return;
      }

      let servers = [];
      const lines = data.split("\n");
      const pattern = /SERVER "(.*)" "(.*)" "(.*)"/;
      lines.forEach(line => {
        const match = line.match(pattern);
        if (match !== null) {
          const userinfo = match[3].split(":", 2);
          var users = [];
          if (userinfo[0] != "0") {
            users = userinfo[1].split(",");
          }
          servers.push({
            host: match[1],
            status: match[2],
            userCount: userinfo[0],
            users: users
          });
        }
      });

      this.setState({servers});

      // Cache this server list in case the online server list goes down
      let cachedServers = servers.map(server => {
        // Strip out everything but the host
        return {host: server.host};
      });
      storage['publicServers'] = JSON.stringify(cachedServers);
    });
  }

  /**
   * Handle a server/row being clicked.
   * @param {number} i - Index of this.state.servers that was clicked.
   */
  select(i) {
    if (this.state.selected === i) {

    } else {
      // Mark row i as selected
      this.setState({selected: i});
    }
  }

  /**
   * Called by LoginModal when user submits login info or cancels.
   * @param {boolean} submitted
   * @param {string} host
   * @param {string} username
   * @param {string} password
   */
  onLoginResponse(submitted, host, username, password) {
    this.setState({selected: -1});
    if (submitted) {
      // Connect to servers[i]
      this.props.onSelect(host, username, password);
    }
  }

  render() {
    return (
      <div>
        <ListGroup className="public-server-list">
          {this.state.servers.map((server, i) => {
            let users = (server.users) ? server.users.join(", ") : "";
            return <ListGroupItem header={server.host} active={i===this.state.selected} onClick={e => {this.select(i)}} key={i}>
              <Label>{server.status}</Label>
              <Label>{server.userCount}</Label>
              <Label>{users}</Label>
            </ListGroupItem>
          })}
        </ListGroup>
        <LoginModal show={this.state.selected >= 0} server={this.state.servers[this.state.selected]} onResponse={this.onLoginResponse} public />
      </div>
    );
  }
}
