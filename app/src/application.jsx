import React from 'react';
import { Router, Route, Link } from 'react-router'
import { Client as NinjamClient } from './ninjam';
import DisconnectedModal from './modals/disconnected-modal.jsx';

// MIDI beat clock messages
const MIDI_START = new Uint8Array([0xfa]);
const MIDI_CLOCK = new Uint8Array([0xf8]);
const MIDI_STOP = new Uint8Array([0xfc]);

/**
 * Top-level application component
 */
export default class Application extends React.Component {
  constructor(props) {
    super(props);

    // Default state
    this.state = {
      disconnectReason: "",
    };

    // Prebind custom methods
    this.handleDisconnect = this.handleDisconnect.bind(this);
    this.handleBeat = this.handleBeat.bind(this);

    // Private members
    this.ninjam = new NinjamClient();
    console.log("Created NinjamClient", this.ninjam);
    this.midiAccess = null;
  }

  componentDidMount() {
    // Subscribe to Ninjam callbacks
    this.ninjam.on('disconnect', this.handleDisconnect);
    this.ninjam.on('beat', this.handleBeat);

    // Set up MIDI access
    navigator.requestMIDIAccess()
    .then(midiAccess => {
      this.midiAccess = midiAccess;
    }, reason => {
      console.log("Failed to get MIDI access: " + reason);
    });
  }

  componentWillUnmount() {
    // Unsubscribe from Ninjam callbacks
    this.ninjam.removeListener('disconnect', this.handleDisconnect);
    this.ninjam.removeListener('beat', this.handleBeat);
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

  /**
   * Called by NinjamClient on every beat.
   * @param {string} beat - Beat number (start of new interval is zero).
   */
  handleBeat(beat) {
    if (this.midiAccess) {
      // Send beat on all output ports
      if (beat === 0) {
        this.midiAccess.outputs.forEach(output => {
          output.send(MIDI_START); // TODO: Do we need to send MIDI_END each time?

          // Schedule all the clock thingies for this interval
          let numPulses = this.ninjam.bpi * 24;
          let pulseWidth = (60000.0 / this.ninjam.bpm) / 24.0; // ms per clock
          let now = window.performance.now();
          for (let i=0; i<numPulses; i++) {
            output.send(MIDI_CLOCK, now + (pulseWidth * i));
          }
        });
      }
    }
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
