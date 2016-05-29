import React from 'react';
import { Form, FormGroup, FormControl, Button, Col, ControlLabel } from 'react-bootstrap';

export default class CustomServerForm extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
    };

    this.onSubmit = this.onSubmit.bind(this);
  }

  /**
   * Handles form submissions.
   * @param {Event} event
   */
  onSubmit(event) {
    event.preventDefault();

    let host = document.getElementById('host').value;
    let user = document.getElementById('username').value;
    let pass = document.getElementById('password').value;

    // Tell server browser our choice
    this.props.onSelect(host, user, pass);
  }

  render() {
    return (
      <div style={{padding: '40px 20px'}}>
        <Form horizontal onSubmit={this.onSubmit}>
          <FormGroup controlId="host">
            <Col componentClass={ControlLabel} sm={2}>Server Host</Col>
            <Col sm={10}>
              <FormControl type="text" placeholder="e.g. ninbot.com:2049" />
            </Col>
          </FormGroup>

          <FormGroup controlId="username">
            <Col componentClass={ControlLabel} sm={2}>Username</Col>
            <Col sm={10}>
              <FormControl type="text" placeholder="e.g. HeroOfGuitars" />
            </Col>
          </FormGroup>

          <FormGroup controlId="password">
            <Col componentClass={ControlLabel} sm={2}>Password</Col>
            <Col sm={10}>
              <FormControl type="password" placeholder="Leave blank in most cases" />
            </Col>
          </FormGroup>

          <FormGroup>
            <Col smOffset={2} sm={10}>
              <Button type="submit" bsStyle="primary">Connect</Button>
            </Col>
          </FormGroup>
        </Form>
      </div>
    );
  }
}
