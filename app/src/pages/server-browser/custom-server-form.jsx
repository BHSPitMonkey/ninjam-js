import React from 'react';
import { Form, FormGroup, FormControl, Button, Col, ControlLabel } from 'react-bootstrap';
import storage from '../../storage/index.js';

export default class CustomServerForm extends React.Component {
  constructor(props) {
    super(props);

    // Initial state
    this.state = {
      host: '',
      username: '',
      password: '',
    };

    // Load default state from storage
    storage.getItem('lastCustomHost')
    .then(host => {
      this.setState({host})
    })
    .catch(e => {});
    storage.getItem('lastUsername')
    .then(username => {
      this.setState({username})
    })
    .catch(e => {});

    // Prebind
    this.onSubmit = this.onSubmit.bind(this);
  }

  /**
   * Handles form submissions.
   * @param {Event} event
   */
  onSubmit(event) {
    event.preventDefault();

    // Save values for pre-loading next time
    storage.setItem('lastCustomHost', this.state.host);
    storage.setItem('lastUsername', this.state.username);

    // Tell server browser our choice
    this.props.onSelect(this.state.host, this.state.username, this.state.password);
  }

  render() {
    return (
      <div style={{padding: '40px 20px'}}>
        <Form horizontal onSubmit={this.onSubmit}>
          <FormGroup controlId="host">
            <Col componentClass={ControlLabel} sm={2}>Server Host</Col>
            <Col sm={10}>
              <FormControl type="text" placeholder="e.g. ninbot.com:2049" required value={this.state.host} onChange={(e) => {this.setState({host: e.target.value})}} />
            </Col>
          </FormGroup>

          <FormGroup controlId="username">
            <Col componentClass={ControlLabel} sm={2}>Username</Col>
            <Col sm={10}>
              <FormControl type="text" placeholder="e.g. HeroOfGuitars" required value={this.state.username} onChange={(e) => {this.setState({username: e.target.value})}} />
            </Col>
          </FormGroup>

          <FormGroup controlId="password">
            <Col componentClass={ControlLabel} sm={2}>Password</Col>
            <Col sm={10}>
              <FormControl type="password" placeholder="Leave blank in most cases" onChange={(e) => {this.setState({password: e.target.value})}} />
            </Col>
          </FormGroup>

          <FormGroup>
            <Col smOffset={2} sm={10}>
              <Button type="submit" bsStyle="primary" disabled={!(this.state.host && this.state.username)}>Connect</Button>
            </Col>
          </FormGroup>
        </Form>
      </div>
    );
  }
}
