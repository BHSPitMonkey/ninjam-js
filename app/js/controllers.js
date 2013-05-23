'use strict';

/* Controllers */

angular.module('myApp.controllers', []).
  controller('AppController', function($scope, NinjamClient) {
    
  }).
  controller('ServerBrowser', function($scope, $dialog, $location, NinjamClient) {
    $scope.ninjam = NinjamClient;
    
    // Not sure if these are even needed or do anything
    $scope.visible = true;
    $scope.opts = {
      backdrop: true,
      backdropFade: true,
      dialogFade: true,
      keyboard: false,
      backdropClick: false,
    };
    
    // TODO: Blank these defaults
    $scope.defaultUsername = "NinjamJSUser";
    $scope.host = "ninjamer.com:2051";
    
    // Called by NinjamClient service when server issues auth challenge
    $scope.onAuthChallenge = function(challengeFields) {
      var title = 'License Agreement';
      var msg = challengeFields.licenseAgreement + '\n\nDo you agree to these terms?';
      var btns = [{result:false, label: 'No'}, {result:true, label: 'Yes', cssClass: 'btn-primary'}];

      $dialog.messageBox(title, msg, btns, $scope.opts)
        .open()
        .then(function(result){
          NinjamClient.respondToChallenge(result);
          // Change to jam view
          $location.path('/#jam');
      });
      
      //$scope.visible = false;
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
    $scope.messages = [];
    $scope.messagesDiv = document.getElementById("messages");
    
    // Called when ENTER is pressed inside textarea
    $scope.chatSubmit = function($event) {
      $event.preventDefault();
      NinjamClient.submitChatMessage($event.target.value);
      $event.target.value = "";
    }
    
    $scope.onChatMessage = function(messageFields) {
      switch (messageFields.command) {
        case "MSG":
          $scope.messages.push({
            type: "msg",
            sender: messageFields.arg1,
            content: messageFields.arg2
          });
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
    };
    NinjamClient._callbacks.onChatMessage = $scope.onChatMessage.bind($scope);
  }).
  controller('UsersPane', function($scope, NinjamClient) {
    $scope.ninjam = NinjamClient;
  });
