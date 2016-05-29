import React from 'react';
import xhr from 'xhr';
import { ListGroup, ListGroupItem, Label } from 'react-bootstrap';

export default class PublicServerList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      servers: [
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

    this.refreshList();
  }

  /**
   * Refresh the list of public servers from ninjam.com
   */
  refreshList() {
    const url = "http://autosong.ninjam.com/serverlist.php";

    xhr.get(url, (err, resp) => {
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
    });
  }

  /**
   * Handle a server/row being clicked.
   * @param {number} i - Index of this.state.servers that was clicked.
   */
  select(i) {
    if (this.state.selected === i) {
      // Connect to servers[i]
      // TODO
      if (this.props.onSelect) {
        this.props.onSelect(this.state.servers[i]);
      }
    } else {
      // Mark row i as selected
      this.setState({selected: i});
    }
  }

  render() {
    return (
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
    );
  }
}
