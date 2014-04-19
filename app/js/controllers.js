'use strict';

/* Controllers */

angular.module('myApp.controllers', []).
  config(['$tooltipProvider', function ($tooltipProvider) {
    $tooltipProvider.options({
      placement: 'bottom',
      appendToBody: true
    });
  }]).
  controller('AppController', function($scope, $modal, $location, NinjamClient) {
    this.onDisconnect = function(reason) {
      if (reason && reason.length) {
        var modalScope = $scope.$new();
        modalScope.details = reason;
        var modalInstance = $modal.open({
          templateUrl: "partials/modalDisconnectedDialog.html",
          scope: modalScope
        });
        modalInstance.result.then(function() {
          // Modal was completed
        }, function() {
          // Modal was dismissed
        });
      }
      $location.path('/');
    };
    NinjamClient._callbacks.onDisconnect = this.onDisconnect.bind($scope);
  }).
  
  controller('ServerBrowser', function($scope, $modal, $location, $http, NinjamClient, $store) {
    $scope.ninjam = NinjamClient;

    // Dialog options
    $scope.opts = {
      backdrop: true,
      backdropFade: true,
      dialogFade: true,
      keyboard: false,
      backdropClick: false,
    };

    // TODO: Blank these defaults
    //$scope.defaultUsername = "NinjamJSUser";
    //$scope.lastUsedUsername = $store.get("lastUsedUsername");

    $scope.publicServers = [
      { host: "ninjamer.com:2049", locale: "FR" },
      { host: "ninjamer.com:2050", locale: "FR" },
      { host: "ninjamer.com:2051", locale: "FR" },
      { host: "ninjamer.com:2052", locale: "FR" },
      { host: "ninbot.com:2049", locale: "US" },
      { host: "ninbot.com:2050", locale: "US" },
      { host: "ninbot.com:2051", locale: "US" },
      { host: "ninbot.com:2052", locale: "US" },
      { host: "virtualliveband.de:2051", locale: "DE" },
      { host: "mutantlab.com:2049", locale: "US" },
    ];

    // Loads the current public server status from ninjam.com
    $scope.refreshPublicServerList = function() {
      var url = "http://autosong.ninjam.com/serverlist.php";
      $http.get(url).
        success(function(data, status, headers, config) {
          // Parse the server list
          if (data.substring(0, 6) != "SERVER") {
            console.log("Invalid server list from ninjam.com");
            return;
          }
          $scope.publicServers = [];
          var lines = data.split("\n");
          var pattern = /SERVER "(.*)" "(.*)" "(.*)"/;
          lines.forEach(function(line) {
            var match = line.match(pattern);
            if (match != null) {
              var userinfo = match[3].split(":", 2);
              var users = [];
              if (userinfo[0] != "0") {
                users = userinfo[1].split(",");
              }
              var server = {
                host: match[1],
                status: match[2],
                userCount: userinfo[0],
                users: users
              };
              $scope.publicServers.push(server);
            }
          });
        }).
        error(function(data, status, headers, config) {
          console.log("Error downloading public server list: " + status);
        });
    };
    $scope.refreshPublicServerList();

    // Returns the default username to use for a given host
    $scope.defaultUsername = function(host) {
      return 'NinjamJSUser';
    };

    // Called by NinjamClient service when server issues auth challenge
    $scope.onAuthChallenge = function(challengeFields) {
      
      var modalInstance = $modal.open({
        templateUrl: "partials/modalLicenseAgreement.html"
      });
      modalInstance.result.then(function() {
        // Modal was completed
        NinjamClient.respondToChallenge(true);
        // Change to jam view
        $location.path('/#jam');
      }, function() {
        // Modal was dismissed
        NinjamClient.respondToChallenge(false);
      });
      
      //$scope.visible = false;
    };
    
    // Connect to a server
    $scope.connect = function(host, user, pass) {
      console.log("Called connect: " + host + " User: " + user + " Pass: " + pass);
      NinjamClient.connect(host, user, pass, $scope.onAuthChallenge);
      $store.set("lastUsedUsername", user);
    };
  }).
  
  controller('ServerConnectForm', function($scope) {
    $scope.data = {
      user: 'Default',
      pass: ''
    };
    //$scope.host = '';
  }).
  
  controller('HeaderPane', function($scope, NinjamClient) {
    $scope.ninjam = NinjamClient;
  }).
  
  controller('ChatPane', function($scope, $document, NinjamClient) {
    $scope.ninjam = NinjamClient;
    $scope.messages = [];
    $scope.messagesDiv = document.getElementById("messages");
    
    // Called when ENTER is pressed inside textarea
    $scope.chatSubmit = function($event) {
      $event.preventDefault();
      var message = $event.target.value;
      $event.target.value = "";
      NinjamClient.submitChatMessage(message);
      $scope.messages.push({
        type: "msg",
        sender: $scope.ninjam.username,
        content: message
      });
    }
    
    $scope.onChatMessage = function(messageFields) {
      // Check if messagesDiv is scrolled down the maximum amount
      // TODO
      switch (messageFields.command) {
        case "MSG":
          if (messageFields.arg1 != $scope.ninjam.fullUsername) {
            $scope.messages.push({
              type: "msg",
              sender: messageFields.arg1,
              content: messageFields.arg2
            });
          }
          break;
        case "PRIVMSG":
          $scope.messages.push({
            type: "msg",
            sender: messageFields.arg1,
            content: "(PRIVATE) " + messageFields.arg2
          });
          break;
        case "TOPIC":
          $scope.messages.push({
            type: "topic",
            sender: "",
            content: "Topic is: " + messageFields.arg2
          });
          break;
        case "JOIN":
          $scope.messages.push({
            type: "join",
            sender: messageFields.arg1,
            content: "has joined the server"
          });
          break;
        case "PART":
          $scope.messages.push({
            type: "part",
            sender: messageFields.arg1,
            content: "has left the server"
          });
          break;
        case "USERCOUNT":
          break;
        case "BPMBPI":
          $scope.messages.push({
            type: "topic",
            sender: "",
            content: "BPM and BPI are now " + messageFields.arg1 + " and " + messageFields.arg2
          });
          break;
      }
      // Scroll to bottom if necessary
      $scope.messagesDiv.scrollTop = $scope.messagesDiv.scrollHeight;
    };
    NinjamClient._callbacks.onChatMessage = $scope.onChatMessage.bind($scope);
  }).
  
  controller('UsersPane', function($scope, NinjamClient) {
    $scope.ninjam = NinjamClient;
  }).

  controller('DebugPane', function($scope, NinjamClient) {
    $scope.ninjam = NinjamClient;
  });
