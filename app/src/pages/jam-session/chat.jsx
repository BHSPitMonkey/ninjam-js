import React from 'react';
import { Navbar, Nav, NavDropdown, MenuItem, NavItem, ButtonToolbar, ButtonGroup, Button, DropdownButton } from 'react-bootstrap';
import Message from './message.jsx';

class Chat extends React.Component {
  constructor(props) {
    super(props);

    // Default state
    this.state = {
      messages: []
    };

    // Private members
    this.messagesDiv = null;

    // Prebind custom methods
    this.onNinjamMessage = this.onNinjamMessage.bind(this);
    this.onComposeKeyDown = this.onComposeKeyDown.bind(this);
  }

  componentDidMount() {
    // Insert a dummy message
    let initialMsgText = `Connected to ${this.context.ninjam.host}:${this.context.ninjam.port}`;
    this.state.messages.push(<Message type="system" content={initialMsgText} key={0} />);
    this.forceUpdate();

    // Subscribe to Ninjam callbacks
    this.context.ninjam.on('chatMessage', this.onNinjamMessage);
  }

  componentWillUnmount() {
    // Unsubscribe from Ninjam callbacks
    this.context.ninjam.removeListener('chatMessage', this.onNinjamMessage);
  }

  componentDidUpdate() {
    // Auto-scroll chat box after an update
    if (this.messagesDiv) {
      this.messagesDiv.scrollTop = this.messagesDiv.scrollHeight;
    }
  }

  /**
   * Called by Ninjam client when a chat message arrives.
   * @param {Object} fields
   */
  onNinjamMessage(fields) {
    let numMessages = this.state.messages.length;
    let type, username, content;
    switch (fields.command) {
        case "MSG":
          // Ignore your own messages, we've already displayed them
          if (fields.arg1 != this.context.ninjam.fullUsername) {
            let lastMessage = this.state.messages.pop();
            if (lastMessage.props.type == "msg" && lastMessage.props.username == fields.arg1) {
              fields.arg2 = lastMessage.props.content + "\n" + fields.arg2;
            } else {
              this.state.messages.push(lastMessage);
            }
            type = "msg";
            username = fields.arg1;
            content = fields.arg2;
          }
          break;
        case "PRIVMSG":
          // TODO: Perform stacking (see onComposeKeyDown)
          type = "privmsg";
          username = fields.arg1;
          content = '(PRIVATE) ' + fields.arg2;
          break;
        case "TOPIC":
          type = "topic";
          content = fields.arg2;
          break;
        case "JOIN":
          type = "join";
          username = fields.arg1;
          break;
        case "PART":
          type = "part";
          username = fields.arg1;
          break;
        case "USERCOUNT":
          break;
        case "BPMBPI":
          type = "bpmbpi";
          content = 'BPM and BPI are now ' + fields.arg1 + ' and ' + fields.arg2;
          break;
        default:
          console.error("Unrecognized chat command: " + fields.command);
          return;
      }

      // Insert new message
      if (type) {
        this.state.messages.push(<Message type={type} username={username} content={content} key={numMessages} />);
        this.forceUpdate();
      }

      // TODO: Autoscroll messages div
  }

  /**
   * Called when text entry area fires keyDown event.
   */
  onComposeKeyDown(event) {
    // Only care if Enter is pressed
    if (event.keyCode == 13) {
      // Submit message
      event.preventDefault();
      let message = event.target.value;
      event.target.value = "";
      this.context.ninjam.submitChatMessage(message);

      // Add to messages list
      let username = this.context.ninjam.username;
      let last = this.state.messages.length - 1;
      let lastMessage = this.state.messages[last];
      if (lastMessage.props.type == "msg" && lastMessage.props.username == username) {
        this.state.messages.pop();
        message = lastMessage.props.content + "\n" + message;
      }
      this.state.messages.push(<Message type="msg" username={username} content={message} />);
      this.forceUpdate();
    }
  }

  render() {
    return (
      <div id="chat">
        <h2>Chat</h2>
        <div className="messages" ref={(ref) => {this.messagesDiv = ref}}>
          {this.state.messages}
        </div>
        <div className="entry-area">
          <textarea onKeyDown={this.onComposeKeyDown} placeholder="Type here to chat" />
        </div>
      </div>
    );
  }
}
// Context gained from parent
Chat.contextTypes = {
  router: React.PropTypes.object,
  ninjam: React.PropTypes.object,
};
export default Chat;
