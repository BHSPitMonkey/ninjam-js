import React from 'react';
import { Panel } from 'react-bootstrap';

export default class UserPanel extends React.Component {
  render() {
    let header = <span>
      <span>{this.props.name}</span>
      <span className="ip">{this.props.ip}</span>
    </span>;

    return (
      <Panel header={header} bsStyle={this.props.local ? "primary" : "default"}>
        {this.props.children}
      </Panel>
    );
  }
}
