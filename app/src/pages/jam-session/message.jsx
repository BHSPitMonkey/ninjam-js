import React from 'react';

class Message extends React.Component {
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
    let typeClass = this.props.type;
    let icon, username;
    let content = this.props.content;

    // Customize various types of messages
    switch (this.props.type) {
      case 'privmsg':
        typeClass = 'msg privmsg';
        content = '(PRIVATE) ' + content;
        // Intentional fall-through to next case
      case 'msg':
        if (this.props.username) {
          icon = <div className="icon"></div>;
          username = <div className="username">{this.props.username}</div>;
        } else {
          // Sometimes we get a msg with no username (voting system). Display like a TOPIC.
          typeClass = 'topic';
        }
        break;
      case 'join':
        content = this.props.username + ' joined the server';
        break;
      case 'part':
        content = this.props.username + ' left the server';
        break;
      case 'topic':
        content = 'Topic is: ' + content;
        break;
      case 'bpmbpi':
        typeClass = 'topic'; // Use same class as topics
        break;
    }

    let className = "message " + typeClass;

    return (
      <div className={className}>
        {icon}
        {username}
        <div className="content">
          {content}
        </div>
      </div>
    );
  }
}
export default Message;
