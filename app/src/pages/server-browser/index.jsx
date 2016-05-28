import React from 'react';
import { Tabs, Tab } from 'react-bootstrap';
import PublicServerList from './public-server-list.jsx';
import CustomServerForm from './custom-server-form.jsx';

class ServerBrowser extends React.Component {
  constructor(props) {
    super(props);

    // Default state
    this.state = {
    };

    // Private members
    // TODO

    // Prebind custom methods
    this.onSelect = this.onSelect.bind(this);
    this.onReceiveServerChallenge = this.onReceiveServerChallenge.bind(this);
  }

  /**
   * Handles a child component selecting a NINJAM server to connect to.
   * @param {object} server - Object with server info.
   */
  onSelect(server) {
    console.log("Want to connect to server: ", server, this.context.ninjam);
    this.context.ninjam.connect(server.host, 'NinjamJS', '', this.onReceiveServerChallenge);
  }

  onReceiveServerChallenge() {
    // TODO: Ask user if they want to accept terms

    // Accept terms
    this.context.ninjam.respondToChallenge(true);
    // Tell app to change to jam view
    this.context.router.push('/jam');
  }

  render() {
    return (
      <div style={{padding: "20px 50px"}}>
        <h1>Choose a Server</h1>
        <p>To jam with other musicians, first you need to choose a server to connect to.</p>
        <Tabs id="server-categories">
          <Tab eventKey={1} title="Public">
            <PublicServerList onSelect={this.onSelect} />
          </Tab>
          <Tab eventKey={2} title="jammr">Jammr connectivity coming soon!</Tab>
          <Tab eventKey={3} title="Recent">Content</Tab>
          <Tab eventKey={4} title="Custom">
            <CustomServerForm onSelect={this.onSelect} />
          </Tab>
        </Tabs>
      </div>
    );
  }
}
// Context gained from parent
ServerBrowser.contextTypes = {
  router: React.PropTypes.object,
  ninjam: React.PropTypes.object,
};
export default ServerBrowser;
