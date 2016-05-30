import React from 'react';
import { Navbar, Tabs, Tab } from 'react-bootstrap';
import PublicServerList from './public-server-list.jsx';
import CustomServerForm from './custom-server-form.jsx';
import AgreementModal from './agreement-modal.jsx';

class ServerBrowser extends React.Component {
  constructor(props) {
    super(props);

    // Default state
    this.state = {
      agreementTerms: "",
    };

    // Private members
    // TODO

    // Prebind custom methods
    this.onSelect = this.onSelect.bind(this);
    this.onReceiveServerChallenge = this.onReceiveServerChallenge.bind(this);
    this.onAgreementResponse = this.onAgreementResponse.bind(this);
    this.handleDisconnect = this.handleDisconnect.bind(this);
  }

  componentDidMount() {
    // Subscribe to Ninjam callbacks
    this.context.ninjam.on('disconnect', this.handleDisconnect);
  }

  componentWillUnmount() {
    // Unsubscribe from Ninjam callbacks
    this.context.ninjam.removeListener('disconnect', this.handleDisconnect);

  }

  /**
   * Handles a child component selecting a NINJAM server to connect to.
   * @param {string} host
   * @param {string} username
   * @param {string} password
   */
  onSelect(host, username, password) {
    console.log("Connecting to server %s as %s", host, username);
    this.context.ninjam.connect(host, username, password, this.onReceiveServerChallenge);
  }

  /**
   * Called by NinjamClient when server sends a connect challenge.
   * @param {Object} fields
   */
  onReceiveServerChallenge(fields) {
    // Ask user if they want to accept terms
    this.setState({agreementTerms: fields.licenseAgreement});
  }

  /**
   * Called by AgreementModal when user accepts or rejects terms.
   * @param {bool} response - True if user accepted agreement terms.
   */
  onAgreementResponse(response) {
    this.context.ninjam.respondToChallenge(response);
    this.setState({agreementTerms: ""});
    if (response) {
      // Tell app to change to jam view
      this.context.router.push('/jam');
    }
  }

  handleDisconnect() {
    // Hide agreement modal
    this.setState({agreementTerms: ""});
  }

  render() {
    return (
      <div>
        <Navbar fixedTop fluid>
          <Navbar.Header>
            <Navbar.Brand>
              <a href="#">Ninjam JS</a>
            </Navbar.Brand>
          </Navbar.Header>
        </Navbar>
        <div style={{padding: "70px 50px"}}>
          <h1>Choose a Server</h1>
          <p>To jam with other musicians, first you need to choose a server to join.</p>
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
        <AgreementModal terms={this.state.agreementTerms} onResponse={this.onAgreementResponse} />
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
