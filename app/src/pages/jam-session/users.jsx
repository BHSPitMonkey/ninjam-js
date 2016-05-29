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
    // Set up Ninjam callback
    //this.context.ninjam.onChatMessage = this.onNinjamMessage.bind(this);
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
              return <ButtonGroup key={key}>
                <Button>M</Button>
                <Button>S</Button>
                <Button>(TODO)</Button>
                <Button disabled>{channel.name}</Button>
              </ButtonGroup>;
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
