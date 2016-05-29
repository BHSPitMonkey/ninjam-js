import React from 'react';
import { Router, Route, Link } from 'react-router'
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

    // Prebind custom methods
    this.handleDisconnect = this.handleDisconnect.bind(this);

    // Private members
    this.ninjam = new NinjamClient();
    console.log(this.ninjam);
    this.ninjam.onDisconnect = this.handleDisconnect;
  }
  handleDisconnect() {
    console.log("App got disconnect");
    this.context.router.push('/');
  }
  getChildContext() {
    return {
      router: this.context.router,
      ninjam: this.ninjam,
    };
  }
  render() {
    return (
      <div>
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
