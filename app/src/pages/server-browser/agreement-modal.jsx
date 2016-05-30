import React from 'react';
import { Modal, Button, Well } from 'react-bootstrap';

export default class AgreementModal extends React.Component {
  constructor(props) {
    super(props);

    // Prebind
    this.onAccept = this.onAccept.bind(this);
    this.onReject = this.onReject.bind(this);
    this.onEntering = this.onEntering.bind(this);
  }
  onAccept() {
    this.props.onResponse(true);
  }
  onReject() {
    this.props.onResponse(false);
  }
  onEntering() {
    document.getElementById('agreement-accept-btn').focus();
  }
  render() {
    if (typeof this.props.terms != "string") return null;
    let terms = this.props.terms.trim();
    let show = (terms.length > 0);
    return (
      <Modal show={show} onHide={this.onReject} className="agreement-modal">
        <Modal.Header closeButton>
          <Modal.Title>Server License Agreement</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>To connect to this server, you must accept the following terms:</p>
          <Well>{terms}</Well>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={this.onReject}>Cancel</Button>
          <Button onClick={this.onAccept} bsStyle="primary" id="agreement-accept-btn">Accept</Button>
        </Modal.Footer>
      </Modal>
    );
  }
}
AgreementModal.propTypes = {
  terms: React.PropTypes.string.isRequired,
  onResponse: React.PropTypes.func.isRequired,
};
