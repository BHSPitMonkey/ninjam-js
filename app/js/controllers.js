'use strict';

/* Controllers */

angular.module('myApp.controllers', []).
  controller('ServerBrowser', function($scope, NinjamClient) {
    $scope.ninjam = NinjamClient;
    
    $scope.visible = true;
    $scope.opts = {
      backdropFade: true,
      dialogFade: true
    };
    
    $scope.defaultUsername = "NinjamJSUser";
    $scope.host = "ninjamer.com:2051";
    
    $scope.connect = function() {
      console.log("You tried connecting!");
      NinjamClient.connect($scope.host, $scope.defaultUsername, null);
    };
  }).
  controller('HeaderPane', function($scope, NinjamClient) {
    $scope.ninjam = NinjamClient;
  }).
  controller('ChatPane', function($scope, NinjamClient) {
    $scope.ninjam = NinjamClient;
  }).
  controller('UsersPane', function($scope, NinjamClient) {
    $scope.ninjam = NinjamClient;
  });
