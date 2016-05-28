import React from 'react';
import { Tabs, Tab } from 'react-bootstrap';

class JamSession extends React.Component {
  constructor(props) {
    super(props);

    // Default state
    this.state = {
    };

    // Private members
    // TODO

    // Prebind custom methods
    // TODO
  }

  render() {
    return (
      <div style={{padding: "20px 50px"}}>
        <h1>We be jammin</h1>
      </div>
    );
  }
}
// Context gained from parent
JamSession.contextTypes = {
  router: React.PropTypes.object,
  ninjam: React.PropTypes.object,
};
export default JamSession;
