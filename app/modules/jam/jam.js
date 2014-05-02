'use strict';
/**
 * Module for jam session components
 */

angular.module('myApp.jam', []).
  controller('UsersPane', function($scope, NinjamClient) {
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
  });
