angular.module('BlocksApp').controller('TokenListController', function($stateParams, $rootScope, $scope, $http) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
    });
    $scope.settings = $rootScope.setup;

    $http.get('https://raw.githubusercontent.com/WONDevelopment/explorer/master/public/tokens.json')
        .then(function (res) {
            $scope.tokens = res.data;
        })
        .catch(err => {
            console.error(err);
            $http.get('/tokens.json').then(function (res) {
                $scope.tokens = res.data;
            })
        })
});