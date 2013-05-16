'use strict';

/* Services */

angular.module('myApp.services', []).
  factory('NinjamClient', function($timeout) {
    var NinjamClient = function() {
      this.socketId = null;
      this.status = "starting";
      this.host = null;
      this.port = null;
      this.users = [{name:"Spongebob"},{name:"Patrick"}];
      this.bpm = null;
      this.bpi = null;
      
      // Try to create the socket
      console.log("Trying to create socket...");
      chrome.socket.create('tcp', {}, this._onCreate.bind(this));
    };
    
    angular.extend(NinjamClient.prototype, {
      
      // Connect to specified Ninjam server
      connect : function(host, username, password) {
        if (this.socketId > 0) {
          console.log("You're trying to connect! This client's socket ID is " + this.socketId + " and status is " + this.status);
        }
        else {
          console.log("Can't connect: Socket not created!");
        }
      },
      
      // Send something to server
      send : function() {
        
      },
      
      // Called when socket gets created
      _onCreate : function(createInfo) {
        console.log("Called onCreate. Got socket ID " + createInfo.socketId);
        this.socketId = createInfo.socketId;
        if (this.socketId > 0) {
          this.status = "ready";
        }
        else {
          console.log("Couldn't create socket!");
          this.status = "no socket";
        }
      },
    });
    
    return new NinjamClient();
  });
