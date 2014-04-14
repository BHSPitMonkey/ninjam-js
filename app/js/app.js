'use strict';


// Declare app level module which depends on filters, and services
angular.module('myApp', ['ngRoute', 'ui.bootstrap', 'ui.keypress', 'myApp.filters', 'myApp.services', 'myApp.directives', 'myApp.controllers']).
  config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/', {templateUrl: 'partials/browser.html'});
    $routeProvider.when('/#jam', {templateUrl: 'partials/jam.html'});
    $routeProvider.otherwise({redirectTo: '/'});
  }]);
