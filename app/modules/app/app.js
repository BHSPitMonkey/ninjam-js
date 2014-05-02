'use strict';
/**
 * Module for general app components
 */

angular.module('myApp.app', []).
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
          templateUrl: "modules/app/modalDisconnectedDialog.html",
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
  controller('HeaderPane', function($scope, NinjamClient) {
    $scope.ninjam = NinjamClient;
  }).
  controller('DebugPane', function($scope, NinjamClient) {
    $scope.ninjam = NinjamClient;
  });
