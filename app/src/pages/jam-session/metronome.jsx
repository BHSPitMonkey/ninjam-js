import React from 'react';
import { ProgressBar } from 'react-bootstrap';
import BpmBpiModal from './bpm-bpi-modal.jsx';

export default class Metronome extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      bpi: 16,
      bpm: 120,
      beat: 0,
      modalVisible: false,
    };

    this.onNinjamBeat = this.onNinjamBeat.bind(this);
    this.onVoteModalSubmit = this.onVoteModalSubmit.bind(this);
  }

  componentDidMount() {
    // Subscribe to Ninjam callbacks
    this.props.ninjam.on('beat', this.onNinjamBeat);
  }

  componentWillUnmount() {
    // Unsubscribe from Ninjam callbacks
    this.props.ninjam.removeListener('beat', this.onNinjamBeat);
  }

  /**
   * Called when Ninjam client announces a new beat.
   */
  onNinjamBeat(beat) {
    this.setState({beat: beat});

    // If this is the first beat of a new interval, refresh our BPM/BPI state
    if (beat === 0) {
      this.setState({
        bpi: this.props.ninjam.bpi,
        bpm: this.props.ninjam.bpm,
      })
    }
  }

  /**
   * Called when the BpmBpiModal form gets submitted.
   */
  onVoteModalSubmit(data) {
    // Hide the modal
    this.setState({modalVisible:false});

    // Cast votes
    if (data.bpm != this.props.ninjam.bpm) {
      this.props.ninjam.submitChatMessage(`!vote bpm ${data.bpm}`);
    } else if (data.bpi != this.props.ninjam.bpi) {
      this.props.ninjam.submitChatMessage(`!vote bpi ${data.bpi}`);
    } else {
      console.warning('Tried to cast vote, but BPM and BPI were unchanged.');
    }
  }

  render() {
    return (
      <div className="bpmbpi-metronome">
        <div className="bpmbpi-display" style={{cursor:'pointer'}} onClick={() => {this.setState({modalVisible:true})}}>
          <div>{this.state.bpm} <span>BPM</span></div>
          <div>{this.state.bpi} <span>BPI</span></div>
        </div>
        <ProgressBar className="metronome" bsStyle="success" now={this.state.beat + 1} max={this.state.bpi} />
        <BpmBpiModal show={this.state.modalVisible} bpm={this.state.bpm} bpi={this.state.bpi} onResponse={this.onVoteModalSubmit} />
      </div>
    );
  }
}
