import React from 'react';
import { ListGroup, ListGroupItem, Label } from 'react-bootstrap';

/**
 * Shows the list of jammr servers once authed.
 */
export default class JammrServerList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selected: -1,
      servers: [],
      busy: true,
    };
    
    this.select = this.select.bind(this);
  }

  componentDidMount() {
    this.props.jammr.getLiveJams().then(servers => {
      this.setState({servers, busy: false});
    }).catch(reason => {
      console.log('getLiveJams promise failed: ', reason);
      this.setState({busy: false});
    });
  }

  /**
   * Handle a server/row being clicked.
   * @param {number} i - Index of this.state.servers that was clicked.
   */
  select(i) {
    if (this.state.selected === i) {
      // Connect
      this.props.onSelect(this.state.servers[i].server, this.props.jammr.username, this.props.jammr.hexToken, true);
    } else {
      // Mark row i as selected
      this.setState({selected: i});
    }
  }

  render() {
    return (
    <div>
      <ListGroup className="jammr-server-list">
        {this.state.servers.map((server, i) => {
          let users = (server.users) ? server.users.join(", ") : "";
          return <ListGroupItem header={server.server} active={i===this.state.selected} onClick={e => {this.select(i)}} key={i}>
            <Label>{server.is_public ? 'Public' : 'Private'}</Label>
            <Label>{server.status}</Label>
            <Label>{server.topic}</Label>
            <Label>{users}</Label>
          </ListGroupItem>
        })}
      </ListGroup>
    </div>
    );
  }
}
