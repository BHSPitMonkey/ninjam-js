import React from 'react';
import { Button, ButtonGroup, ProgressBar } from 'react-bootstrap';
import VolumeIndicator from './volume-indicator.jsx';
import UserPanel from './user-panel.jsx';

class RemoteUsers extends React.Component {
  constructor(props) {
    super(props);

    // Default state
    this.state = {
    };

    // Private members
    // TODO

    // Prebind custom methods
    this.onNinjamUserInfoChange = this.onNinjamUserInfoChange.bind(this);
  }

  componentDidMount() {
    // Subscribe to Ninjam callbacks
    this.context.ninjam.on('userInfoChange', this.onNinjamUserInfoChange);
  }

  componentWillUnmount() {
    // Unsubscribe from Ninjam callbacks
    this.context.ninjam.removeListener('userInfoChange', this.onNinjamUserInfoChange);
  }

  onNinjamUserInfoChange() {
    this.forceUpdate();
  }

  render() {
    let usernames = Object.keys(this.context.ninjam.users);
    let placeholder = usernames.length ? '' : (
      <div style={{fontSize:'150%', textAlign:'center', opacity:0.8, padding:'1em'}}>
        <p>Looks like you're the only one here.</p>
        <p>Tell your friends to join!</p>
      </div>
    );
    return (
      <div style={{display:"flex", flexDirection:"row", flexWrap:"wrap", justifyContent:"flex-start", alignContent:"flex-start", alignItems:"flex-start"}}>
        {usernames.map(username => {
          let user = this.context.ninjam.users[username];

          return <div style={{minWidth:"200px", borderRadius:"10px", overflow:"hidden", margin:"10px", flex:"0 1 auto"}} key={user.name}>
            <div style={{width:"100%", height:"30px", background:"#3371b8"}}></div>
            <div style={{width:"100%", padding:"10px", background:"#eee"}}>
              <p style={{fontSize:"18px", textAlign:"center", color:"black", marginBottom:0}}>{user.name}</p>
              <p style={{fontSize:"10px", textAlign:"center", color:"#b3b3b3", marginBottom:0}}>{user.ip}</p>
            </div>
            <div style={{width:"100%", padding:"10px", background:"white"}}>
              {Object.keys(user.channels).map(key => {
                let channel = user.channels[key];
                return <div className="channel" style={{display:"flex", flexDirection:"row", minHeight:"40px"}} key={key}>
                  <div style={{display:"flex", flexDirection:"column", border:"2px solid #eee", borderRadius:"8px", fontSize:"10px", width:"20px", height:"50px", overflow:"hidden"}}>
                    <div title="Mute" onClick={() => {channel.toggleMute(); this.forceUpdate();}} style={{display:"flex", justifyContent:"center", flexDirection:"column", textAlign:"center", flex:"1 1 auto", background:channel.localMute?"red":"white", color:channel.localMute?"white":"#4d4d4d"}}>M</div>
                    <div title="Solo" style={{display:"flex", justifyContent:"center", flexDirection:"column", textAlign:"center", flex:"1 1 auto"}}>S</div>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" value={channel.localVolume} onChange={(e) => {channel.setVolume(e.target.value); this.forceUpdate();}} style={{width:"50px", height:"50px", WebkitAppearance:"slider-vertical"}}></input>
                  <div>
                    <div>{channel.name}</div>
                    <VolumeIndicator channel={channel} />
                  </div>
                </div>;
              })}
            </div>
          </div>;

          // Old
          return <UserPanel name={user.name} ip={user.ip} key={user.name}>
            {Object.keys(user.channels).map(key => {
              let channel = user.channels[key];
              return <div className="channel" key={key}>
                <ButtonGroup>
                  <Button onClick={() => {channel.toggleMute(); this.forceUpdate();}} bsStyle={channel.localMute ? "primary" : "default"}>M</Button>
                  <Button>S</Button>
                  <Button disabled><VolumeIndicator channel={channel} /></Button>
                  <Button disabled>{channel.name}</Button>
                </ButtonGroup>
              </div>;
            })}
          </UserPanel>;
        })}
        {placeholder}
      </div>
    );
  }
}
// Context gained from parent
RemoteUsers.contextTypes = {
  router: React.PropTypes.object,
  ninjam: React.PropTypes.object,
};
export default RemoteUsers;
