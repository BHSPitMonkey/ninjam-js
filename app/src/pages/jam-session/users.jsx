import React from 'react';
import { Panel, Button, ButtonGroup } from 'react-bootstrap';

class RemoteUsers extends React.Component {
  constructor(props) {
    super(props);

    // Default state
    this.state = {
    };

    // Private members
    // TODO

    // Prebind custom methods
    // TODO
  }

  componentDidMount() {
    // Set up Ninjam callback (re-render whenever there's a chat message)
    this.context.ninjam.on('chatMessage', () => {this.forceUpdate()});
  }

  render() {
    return (
      <div>
        {Object.keys(this.context.ninjam.users).map((username) => {
          let user = this.context.ninjam.users[username];
          let header = <span>
            <span>{user.name}</span>
            <span style={{float: 'right'}}>{user.ip}</span>
          </span>;
          return <Panel header={header} key={username}>
            {Object.keys(user.channels).map((key) => {
              let channel = user.channels[key];
              return <div className="channel" key={key}>
                <ButtonGroup>
                  <Button>M</Button>
                  <Button>S</Button>
                  <Button>(TODO)</Button>
                  <Button disabled>{channel.name}</Button>
                </ButtonGroup>
              </div>;
            })}
          </Panel>;
        })}
      </div>
    );
  }
}
// Context gained from parent
RemoteUsers.contextTypes = {
  router: React.PropTypes.object,
  ninjam: React.PropTypes.object,
};
export default RemoteUsers;
