'use strict';

/* Controllers */

angular.module('myApp.controllers', []).
  controller('ServerBrowser', function($scope, $dialog, NinjamClient) {
    $scope.ninjam = NinjamClient;
    
    // Not sure if these are even needed or do anything
    $scope.visible = true;
    $scope.opts = {
      backdropFade: true,
      dialogFade: true
    };
    
    // TODO: Blank these defaults
    $scope.defaultUsername = "NinjamJSUser";
    $scope.host = "ninjamer.com:2051";
    
    // Called by NinjamClient service when server issues auth challenge
    $scope.onAuthChallenge = function(challengeFields) {
      var title = 'License Agreement';
      var msg = challengeFields.licenseAgreement + '\n\nDo you agree to these terms?';
      var btns = [{result:false, label: 'No'}, {result:true, label: 'Yes', cssClass: 'btn-primary'}];

      $dialog.messageBox(title, msg, btns)
        .open()
        .then(function(result){
          NinjamClient.respondToChallenge(result);
      });
    };
    
    // Connect to a server
    $scope.connect = function() {
      console.log("You tried connecting!");
      NinjamClient.connect($scope.host, $scope.defaultUsername, '', $scope.onAuthChallenge);
    };
  }).
  controller('HeaderPane', function($scope, NinjamClient) {
    $scope.ninjam = NinjamClient;
  }).
  controller('ChatPane', function($scope, $document, NinjamClient) {
    $scope.ninjam = NinjamClient;
    $scope.messagesDiv = document.getElementById("messages");
    
    $scope.onChatMessage = function(messageFields) {
      switch (messageFields.command) {
        case "MSG":
          break;
        case "PRIVMSG":
          break;
        case "TOPIC":
          $scope.messagesDiv.append("<p>*** Topic is: " + messageFields.arg2 + "</p>");
          break;
        case "JOIN":
          this.users[fields.arg1] = {
            name: fields.arg1,
            channels: {}
          };
          break;
        case "PART":
          delete this.users[fields.arg1];
          break;
        case "USERCOUNT":
          break;
      }
    };
    NinjamClient._callbacks.onChatMessage = $scope.onChatMessage;
  }).
  controller('UsersPane', function($scope, NinjamClient) {
    $scope.ninjam = NinjamClient;
  });
