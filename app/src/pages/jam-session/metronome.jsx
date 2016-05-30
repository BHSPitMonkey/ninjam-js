import React from 'react';
import { ProgressBar } from 'react-bootstrap';

export default class Metronome extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      bpi: 16,
      bpm: 120,
      beat: 0,
    };

    this.onNinjamBeat = this.onNinjamBeat.bind(this);
  }

  componentDidMount() {
    // Subscribe to Ninjam callbacks
    this.props.ninjam.on('beat', this.onNinjamBeat);
  }

  componentWillUnmount() {
    // Unsubscribe from Ninjam callbacks
    this.props.ninjam.removeListener('beat', this.onNinjamBeat);
  }

  onNinjamBeat(beat) {
    this.setState({beat: beat});

    if (beat === 0) {
      this.setState({
        bpi: this.props.ninjam.bpi,
        bpm: this.props.ninjam.bpm,
      })
    }
  }

  render() {
    return (
      <div className="bpmbpi-metronome">
        <div className="bpmbpi-display">
          <div>{this.state.bpm} <span>BPM</span></div>
          <div>{this.state.bpi} <span>BPI</span></div>
        </div>
        <ProgressBar className="metronome" bsStyle="success" now={this.state.beat + 1} max={this.state.bpi} />
      </div>
    );
  }
}
