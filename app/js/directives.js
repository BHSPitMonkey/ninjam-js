'use strict';

/* Directives */


angular.module('myApp.directives', []).
  directive('appVersion', ['version', function(version) {
    return function(scope, elm, attrs) {
      elm.text(version);
    };
  }]).
  directive('server', function() {
    return {
      restrict: 'E',
      scope: {
        host: '@',
        user: '=defaultUsername'
      },
      templateUrl: 'partials/server.html'
    };
  });
