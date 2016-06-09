import React from 'react';
import { Button, ButtonGroup, ProgressBar } from 'react-bootstrap';
import VolumeIndicator from './volume-indicator.jsx';
import UserPanel from './user-panel.jsx';

class RemoteUsers extends React.Component {
  constructor(props) {
    super(props);

    // Default state
    this.state = {
    };

    // Private members
    // TODO

    // Prebind custom methods
    this.onNinjamUserInfoChange = this.onNinjamUserInfoChange.bind(this);
  }

  componentDidMount() {
    // Subscribe to Ninjam callbacks
    this.context.ninjam.on('userInfoChange', this.onNinjamUserInfoChange);
  }

  componentWillUnmount() {
    // Unsubscribe from Ninjam callbacks
    this.context.ninjam.removeListener('userInfoChange', this.onNinjamUserInfoChange);
  }

  onNinjamUserInfoChange() {
    this.forceUpdate();
  }

  render() {
    let usernames = Object.keys(this.context.ninjam.users);
    let placeholder = usernames.length ? '' : (
      <div style={{fontSize:'150%', textAlign:'center', opacity:0.8, padding:'1em'}}>
        <p>Looks like you're the only one here.</p>
        <p>Tell your friends to join!</p>
      </div>
    );
    return (
      <div>
        {usernames.map(username => {
          let user = this.context.ninjam.users[username];
          return <UserPanel name={user.name} ip={user.ip} key={user.name}>
            {Object.keys(user.channels).map(key => {
              let channel = user.channels[key];
              return <div className="channel" key={key}>
                <ButtonGroup>
                  <Button onClick={() => {channel.toggleMute(); this.forceUpdate();}} bsStyle={channel.localMute ? "primary" : "default"}>M</Button>
                  <Button>S</Button>
                  <Button disabled><VolumeIndicator channel={channel} /></Button>
                  <Button disabled>{channel.name}</Button>
                </ButtonGroup>
              </div>;
            })}
          </UserPanel>;
        })}
        {placeholder}
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
