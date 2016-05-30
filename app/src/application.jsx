import React from 'react';
import { Router, Route, Link } from 'react-router'
import { Client as NinjamClient } from './ninjam';
import DisconnectedModal from './modals/disconnected-modal.jsx';

/**
 * Top-level application component
 */
class Application extends React.Component {
  constructor(props) {
    super(props);

    // Default state
    this.state = {
      disconnectReason: "",
    };

    // Prebind custom methods
    this.handleDisconnect = this.handleDisconnect.bind(this);

    // Private members
    this.ninjam = new NinjamClient();
    console.log("Created NinjamClient", this.ninjam);
  }

  componentDidMount() {
    // Subscribe to Ninjam callbacks
    this.ninjam.on('disconnect', this.handleDisconnect);
  }

  componentWillUnmount() {
    // Unsubscribe from Ninjam callbacks
    this.ninjam.removeListener('disconnect', this.handleDisconnect);
  }

  /**
   * Called by NinjamClient after being disconnected.
   * @param {string} reason - Reason for disconnect.
   */
  handleDisconnect(reason) {
    console.log("App got disconnect for: " + reason);

    // Show disconnected modal
    if (typeof reason == "string") {
      this.setState({ disconnectReason: reason });
    }

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
        <DisconnectedModal reason={this.state.disconnectReason} onDismiss={() => {this.setState({disconnectReason:""})}} />
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
