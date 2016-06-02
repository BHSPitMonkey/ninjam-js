import React from 'react';
import { Form, FormGroup, FormControl, Button, Col, ControlLabel, Tooltip } from 'react-bootstrap';
import JammrClient from '../../../jammr/client.js';
import storage from '../../../storage/index.js';
import JammrLoginForm from './login-form.jsx';
import JammrServerList from './server-list.jsx';

/**
 * The component you see within the jammr tab of the server browser.
 * Shows the login form if you need to auth, or the server list if you have already authed.
 */
export default class JammrMain extends React.Component {
  constructor(props) {
    super(props);

    this.jammr = new JammrClient();

    this.state = {
      authenticated: false,
    };
  }

  componentDidMount() {
    this.jammr.on('authenticate', () => {
      this.setState({authenticated: true});
      this.forceUpdate();
    });
  }

  render() {
    if (this.jammr.supported !== true) return (
      <div style={{padding: '20px'}}>
        <p>Sorry, jammr is not supported in the Chrome App version of Ninjam JS.</p>
        <p>Please install Ninjam JS using the native installer for your operating system.</p>
      </div>
    );

    if (this.state.authenticated === true) {
      return <JammrServerList jammr={this.jammr} onSelect={this.props.onSelect} />;
    } else {
      return <JammrLoginForm jammr={this.jammr} />;
    }
  }
}
