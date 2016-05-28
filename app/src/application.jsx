import React from 'react';
import { Router, Route, Link } from 'react-router'
import { Navbar } from 'react-bootstrap';
import { Client as NinjamClient } from './ninjam';

/**
 * Top-level application component
 */
class Application extends React.Component {
  constructor(props) {
    super(props);

    // Default state
    this.state = {
    };

    // Private members
    this.ninjam = new NinjamClient();
    console.log(this.ninjam);

    // Prebind custom methods
    // TODO
  }
  getChildContext() {
    return {
      ninjam: this.ninjam,
    };
  }
  render() {
    return (
      <div>
        <Navbar>
          <Navbar.Header>
            <Navbar.Brand>
              <a href="#">Ninjam JS</a>
            </Navbar.Brand>
          </Navbar.Header>
        </Navbar>
        {this.props.children}
      </div>
    );
  }
}
// Context gained from parent
Application.contextTypes = {
  router: React.PropTypes.object
};
// Context made available to children
Application.childContextTypes = {
  router: React.PropTypes.object,
  ninjam: React.PropTypes.object,
};
export default Application;
