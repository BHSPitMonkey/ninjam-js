import React from 'react';
import { Navbar, Nav, NavDropdown, MenuItem, NavItem, ButtonToolbar, ButtonGroup, Button, DropdownButton, Panel } from 'react-bootstrap';
import Chat from './chat.jsx';
import LocalChannels from './local-channels.jsx';
import RemoteUsers from './users.jsx';
import Metronome from './metronome.jsx';

class JamSession extends React.Component {
  constructor(props) {
    super(props);

    // Default state
    this.state = {
    };

    // Private members
    // TODO

    // Prebind custom methods
    this.disconnect = this.disconnect.bind(this);
  }

  getChildContext() {
    return {
      router: this.context.router,
      ninjam: this.context.ninjam,
    };
  }

  disconnect() {
    this.context.ninjam.disconnect();
  }

  render() {
    return (
      <div id="jam-container">
        <Navbar fixedTop fluid>
          <Navbar.Header>
            <Navbar.Brand>
              <a href="#">Ninjam JS</a>
            </Navbar.Brand>
          </Navbar.Header>
          <Navbar.Collapse>
            <Nav>
              <Metronome ninjam={this.context.ninjam} />
            </Nav>
            <Nav pullRight>
              <ButtonToolbar>
                <ButtonGroup>
                  <Button bsStyle={this.context.ninjam.metronomeMute ? "danger" : "default"} onClick={() => {this.context.ninjam.toggleMetronomeMute(); this.forceUpdate();}}><img src="img/ic_metronome_black.svg" /></Button>
                  <Button bsStyle={this.context.ninjam.microphoneInputMute ? "danger" : "default"} onClick={() => {this.context.ninjam.toggleMicrophoneInputMute(); this.forceUpdate();}}><img src="img/ic_mic_mute_black.svg" /></Button>
                  <Button bsStyle={this.context.ninjam.masterMute ? "danger" : "default"} onClick={() => {this.context.ninjam.toggleMasterMute(); this.forceUpdate();}}><img src="img/ic_speaker_mute_black.svg" width="16" /></Button>
                </ButtonGroup>
                <ButtonGroup>
                  <DropdownButton title={<img src="img/ic_more_black.svg" />} id="bg-nested-dropdown">
                    {// <MenuItem eventKey="1">Toggle Debug Panel</MenuItem> }
                    <MenuItem eventKey="2" onClick={this.disconnect}>Leave Server</MenuItem>
                  </DropdownButton>
                </ButtonGroup>
              </ButtonToolbar>
            </Nav>
          </Navbar.Collapse>
        </Navbar>
        <div id="jam">
          <div id="users-channels">
            <h2>Users and Channels</h2>
            <LocalChannels />
            <RemoteUsers />
          </div>
          <Chat />
        </div>
      </div>
    );
  }
}
// Context gained from parent
JamSession.contextTypes = {
  router: React.PropTypes.object,
  ninjam: React.PropTypes.object,
};
// Context made available to children
JamSession.childContextTypes = {
  router: React.PropTypes.object,
  ninjam: React.PropTypes.object,
};
export default JamSession;
