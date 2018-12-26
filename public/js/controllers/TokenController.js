angular.module('BlocksApp').controller('TokenController', function($stateParams, $rootScope, $scope, $http, $location) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
    });
    var activeTab = $location.url().split('#');
    if (activeTab.length > 1)
      $scope.activeTab = activeTab[1];

    $rootScope.$state.current.data["pageSubTitle"] = $stateParams.hash; //replace with token name
    $scope.addrHash = isAddress($stateParams.hash) ? $stateParams.hash : undefined;
    var address = $scope.addrHash;
    $scope.token = {"balance": 0};
    $scope.settings = $rootScope.setup;

    //fetch dao stuff
    $http({
      method: 'POST',
      url: '/tokenrelay',
      data: {"action": "info", "address": address}
    }).then(function(resp) {
      // console.log(resp.data)
      $scope.token = resp.data;
      $scope.token.address = address;
      $scope.addr = {"bytecode": resp.data.bytecode};
      if (resp.data.name)
        $rootScope.$state.current.data["pageTitle"] = resp.data.name;
    });

    $scope.form = {};
    $scope.errors = {};
    $scope.showTokens = false;
    $scope.getBalance = function(a) {
        var addr = a.toLowerCase();

        $scope.form.addrInput="";
        $scope.errors = {};

        $scope.form.tokens.$setPristine();
        $scope.form.tokens.$setUntouched();
        if (isAddress(addr)) {
          $http({
            method: 'POST',
            url: '/tokenrelay',
            data: {"action": "balanceOf", "user": addr, "address": address}
          }).then(function(resp) {
            console.log(resp.data)
            $scope.showTokens = true;
            $scope.userTokens = resp.data.tokens;
            $scope.form.lastInput = addr;
          });
        } else 
            $scope.errors.address = "Invalid Address";
    };

    $http({
        method: 'POST',
        url: '/tokenrelay',
        data: {"addr": address, "action": "count"}
        }).then(function(resp) {
        $scope.token.count = resp.data.txCount;
        $scope.transferCount = resp.data.transferCount;
    });

    // fetch contract transaction
    $http({
        method: 'POST',
        url: '/tokenrelay',
        data: {"addr": $scope.addrHash, "length": 20, "action": "transaction"}
    }).then(function(resp) {
        $scope.latest_transactions = resp.data;
    });

})
.directive('contractSource', function($http) {
  return {
    restrict: 'E',
    templateUrl: '/views/contract-source.html',
    scope: false,
    link: function(scope, elem, attrs){
        //fetch contract stuff
        $http({
          method: 'POST',
          url: '/compile',
          data: {"addr": scope.addrHash, "action": "find"}
        }).then(function(resp) {
          scope.contract = resp.data;
        });
      }
  }
})
.directive('transferTokens', function($http) {
    return {
        restrict: 'E',
        templateUrl: '/views/transfer-tokens.html',
        scope: false,
        link: function(scope, elem, attrs){
            scope.transferStart = 0;
            scope.hideDirection = function (next) {
                if (next) {
                    if (scope.transferCount < (scope.transferStart + 20))
                        return "ng-hide";
                } else {
                    if (scope.transferStart === 0)
                        return "ng-hide";
                }
                return "";
            };
            // fetch created tokens
            scope.getTransferTokens = function(next) {
                if (next) scope.transferStart += 20;
                else scope.transferStart -= 20;

                if (scope.transferStart < 0) scope.transferStart = 0;

                var data = {
                    "action": "transfer",
                    "addr": scope.addrHash,
                    "start": scope.transferStart
                };

                $http({
                    method: 'POST',
                    url: '/tokenrelay',
                    data: data
                }).then(function(resp) {
                    scope.transfer_tokens = resp.data;
                });
            };
            scope.getTransferTokens();
        }
    }
});
