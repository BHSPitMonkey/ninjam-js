import React from 'react';
import { Modal, Button } from 'react-bootstrap';

export default class DisconnectedModal extends React.Component {
  render() {
    if (typeof this.props.reason != "string") return null;
    let reason = this.props.reason.trim();
    let show = (reason.length > 0);

    if (show) {
      // Clean up the string a little
      reason = reason[0].toUpperCase() + reason.substring(1);
      if (reason[reason.length-1] != '.') {
        reason += '.';
      }
    }

    return (
      <Modal show={show} onHide={this.props.onDismiss}>
        <Modal.Header closeButton>
          <Modal.Title>Disconnected from server</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {reason}
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={this.props.onDismiss}>Okay</Button>
        </Modal.Footer>
      </Modal>
    );
  }
}
DisconnectedModal.propTypes = {
  reason: React.PropTypes.string.isRequired,
  onDismiss: React.PropTypes.func.isRequired,
};
