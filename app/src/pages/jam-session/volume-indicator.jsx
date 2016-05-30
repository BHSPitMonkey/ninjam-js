import React from 'react';
import { ProgressBar } from 'react-bootstrap';

export default class VolumeIndicator extends React.Component {
  componentDidMount() {
    this.mounted = true;
    let animateLoop = () => {
      if (this.mounted) {
        this.forceUpdate();
        window.requestAnimationFrame(animateLoop);
      }
    }
    window.requestAnimationFrame(animateLoop);
  }
  componentWillUnmount() {
    this.mounted = false;
  }
  render() {
    return (
      <ProgressBar bsStyle="danger" now={this.props.channel.maxDecibelValue} />
    );
  }
}
