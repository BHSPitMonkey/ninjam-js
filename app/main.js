'use strict';

// Declare app level module which depends on filters, and services
angular.module('myApp', ['ngRoute',
                         'ui.bootstrap',
                         'ui.keypress',
                         'stepheneisenhauer.netsockets',
                         'myApp.app',
                         'myApp.ninjam',
                         'myApp.browser',
                         'myApp.jam']).
  config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/', {templateUrl: 'modules/browser/browser.html'});
    $routeProvider.when('/#jam', {templateUrl: 'modules/jam/jam.html'});
    $routeProvider.otherwise({redirectTo: '/'});
  }]);
