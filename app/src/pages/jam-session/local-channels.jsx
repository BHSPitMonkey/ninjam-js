import React from 'react';
import { Panel, Button, ButtonGroup } from 'react-bootstrap';

class LocalChannels extends React.Component {
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

  componentDidMount() {
  }

  render() {
    let header = <span>
      <span>{this.context.ninjam.username}</span>
      <span style={{float: 'right'}}>(You)</span>
    </span>;
    return (
      <Panel header={header} bsStyle="primary">
        {this.context.ninjam.localChannels.map((lc, i) => {
          return <ButtonGroup key={i}>
            <Button onClick={() => {lc.toggleTransmit(); this.forceUpdate();}} bsStyle={lc.transmit ? "primary" : "default"}>Transmit</Button>
            <Button onClick={() => {lc.toggleLocalMute(); this.forceUpdate();}} bsStyle={lc.localMute ? "default" : "primary"}>Listen</Button>
            <Button>(TODO)</Button>
            <Button disabled>{lc.name}</Button>
          </ButtonGroup>;
        })}
      </Panel>
    );
  }
}
// Context gained from parent
LocalChannels.contextTypes = {
  router: React.PropTypes.object,
  ninjam: React.PropTypes.object,
};
export default LocalChannels;
