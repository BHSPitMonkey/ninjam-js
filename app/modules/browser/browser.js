'use strict';
/**
 * Module for server browser components
 */

angular.module('myApp.browser', []).
  controller('ServerBrowser', function($scope, $modal, $location, $http, NinjamClient) {
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
      
      var modalScope = $scope.$new();
      modalScope.agreement = challengeFields.licenseAgreement;
      var modalInstance = $modal.open({
        templateUrl: "modules/browser/modalLicenseAgreement.html",
        scope: modalScope
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
      //$store.set("lastUsedUsername", user);
    };
  }).
  controller('ServerConnectForm', function($scope) {
    $scope.data = {
      user: 'Default',
      pass: ''
    };
    //$scope.host = '';
  });
