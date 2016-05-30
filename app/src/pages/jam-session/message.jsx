import React from 'react';
import ReactMarkdown from 'react-markdown';

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
          username = this.props.username.split("@", 1)[0];
          username = <div className="username">{username}</div>;
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
      default:
        typeClass = 'topic'; // Use same class as topics
    }

    let className = "message " + typeClass;

    return (
      <div className={className}>
        {icon}
        {username}
        <div className="content">
          <ReactMarkdown
            source={content}
            escapeHtml={true}
            allowedTypes={[
              'Text',
              'Link',
              'Emph',
              'Code',
              'Strong',
              'Softbreak',
            ]}
            softBreak="br"
            unwrapDisallowed={true}
          />
        </div>
      </div>
    );
  }
}
export default Message;
