angular.module('BlocksApp').controller('AddressController', function($stateParams, $rootScope, $scope, $http, $location, $filter) {
    var activeTab = $location.url().split('#');
    if (activeTab.length > 1)
      $scope.activeTab = activeTab[1];

    $rootScope.$state.current.data["pageSubTitle"] = $stateParams.hash;
    $scope.addrHash = $stateParams.hash;
    $scope.addr = {"balance": 0, "count": 0, "mined": 0};
    $scope.settings = $rootScope.setup;

    $scope.hiddenZeroTxns = localStorage.getItem("hiddenZeroTxns")==="1";
    $scope.hiddenZeroChange = function () {
        localStorage.setItem("hiddenZeroTxns", $scope.hiddenZeroTxns?"1":"0");
        window.location.reload();
    };

    //fetch web3 stuff
    $http({
      method: 'POST',
      url: '/web3relay',
      data: {"addr": $scope.addrHash, "options": ["balance", "count", "bytecode"]}
    }).then(function(resp) {
      $scope.addr = $.extend($scope.addr, resp.data);
      fetchTxs();
      fetchTokenTxs();
      if (resp.data.isContract) {
        $rootScope.$state.current.data["pageTitle"] = "Contract Address";
        // fetchInternalTxs();
      }
    });

    // fetch ethf balance 
    if ($scope.settings.useEthFiat)
    $http({
      method: 'POST',
      url: '/fiat',
      data: {"addr": $scope.addrHash}
    }).then(function(resp) {
      $scope.addr.ethfiat = resp.data.balance;
    });

    $http.post('/addr_count', {addr: $scope.addrHash}).then(function (resp) {
        $scope.addr.count = resp.data.recordsTotal;
        $scope.addr.mined = parseInt(resp.data.mined);
    });

    //fetch transactions
    var fetchTxs = function() {
      $("#table_txs").DataTable({
        processing: true,
        serverSide: true,
        paging: true,
        ajax: function(data, callback, settings) {
          data.addr = $scope.addrHash;
          data.count = $scope.addr.count;
          data.hiddenZero = $scope.hiddenZeroTxns;
          $http.post('/addr', data).then(function(resp) {
            // save data
            $scope.data = resp.data;
            // check $scope.records* if available.
            resp.data.recordsTotal = $scope.recordsTotal ? $scope.recordsTotal : resp.data.recordsTotal;
            resp.data.recordsFiltered = $scope.recordsFiltered ? $scope.recordsFiltered : resp.data.recordsFiltered;
            callback(resp.data);
          });
        },
        "lengthMenu": [
                    [10, 20, 50, 100, 150, 500],
                    [10, 20, 50, 100, 150, 500] // change per page values here
                ],
        "pageLength": 20, 
        "order": [
            [6, "desc"]
        ],
        "language": {
          "lengthMenu": "_MENU_ transactions",
          "zeroRecords": "No transactions found",
          "infoEmpty": ":(",
          "infoFiltered": "(filtered from _MAX_ total txs)"
        },
        "columnDefs": [ 
          { "targets": [ 5 ], "visible": false, "searchable": false },
          {"type": "date", "targets": 6},
          {"orderable": false, "targets": [0,2,3,4]},
          { "render": function(data, type, row) {
                        if (data != $scope.addrHash)
                          return '<a href="/addr/'+data+'">'+data+'</a>'
                        else
                          return data
                      }, "targets": [2,3]},
          { "render": function(data, type, row) {
                        return '<a href="/block/'+data+'">'+data+'</a>'
                      }, "targets": [1]},
          { "render": function(data, type, row) {
                        return '<a href="/tx/'+data+'">'+data+'</a>'
                      }, "targets": [0]},
          { "render": function(data, type, row) {
                        return getDuration(data).toString();
                      }, "targets": [6]},
          { "render": function(data, type, row) {
                        return $filter('valuePrecision')(data);
              }, "targets": [4]}
          ]
      });
    }

    var fetchInternalTxs = function() {
      $http({
        method: 'POST',
        url: '/web3relay',
        data: {"addr_trace": $scope.addrHash}
      }).then(function(resp) {
        $scope.internal_transactions = resp.data;
      });      
    }

    var fetchTokenTxs = function() {
        $("#table_internal_txs").DataTable({
            processing: true,
            serverSide: true,
            paging: true,
            ajax: function(data, callback, settings) {
                data.addr = $scope.addrHash;
                data.count = $scope.addr.count;
                data.txType = "contract";
                $http.post('/addr', data).then(function(resp) {
                    $scope.data = resp.data;
                    resp.data.recordsTotal = $scope.recordsTotal ? $scope.recordsTotal : resp.data.recordsTotal;
                    resp.data.recordsFiltered = $scope.recordsFiltered ? $scope.recordsFiltered : resp.data.recordsFiltered;
                    callback(resp.data);
                });
            },
            "lengthMenu": [
                [10, 20, 50, 100, 150, 500],
                [10, 20, 50, 100, 150, 500] // change per page values here
            ],
            "pageLength": 20,
            "order": [
                [6, "desc"]
            ],
            "language": {
                "lengthMenu": "_MENU_ transactions",
                "zeroRecords": "No transactions found",
                "infoEmpty": ":(",
                "infoFiltered": "(filtered from _MAX_ total txs)"
            },
            "columnDefs": [
                { "targets": [ 5 ], "visible": false, "searchable": false },
                {"type": "date", "targets": 6},
                {"orderable": false, "targets": [0,2,3,4]},
                { "render": function(data, type, row) {
                        if (data != $scope.addrHash)
                            return '<a href="/addr/'+data+'">'+data+'</a>'
                        else
                            return data
                    }, "targets": [2,3]},
                { "render": function(data, type, row) {
                        return '<a href="/block/'+data+'">'+data+'</a>'
                    }, "targets": [1]},
                { "render": function(data, type, row) {
                        return '<a href="/tx/'+data+'">'+data+'</a>'
                    }, "targets": [0]},
                { "render": function(data, type, row) {
                        return getDuration(data).toString();
                    }, "targets": [6]},
                { "render": function(data, type, row) {
                        return $filter('valuePrecision')(data);
                    }, "targets": [4]}
            ]
        });
    }
    
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
          console.log(resp.data);
          scope.contract = resp.data;
        });
      }
  }
})
