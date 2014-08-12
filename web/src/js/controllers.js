'use strict';

angular.module('addressBook.controllers', [])
    .controller('MainCtrl', ['$scope', '$rootScope', '$window', '$location', '$db', function ($scope, $rootScope, $window, $location, $db) {
        $scope.slide = '';
        $rootScope.back = function() {
          $scope.slide = 'slide-right';
          $window.history.back();
        }
        $rootScope.go = function(path){
          $scope.slide = 'slide-left';
          $location.url(path);
        }
    }])
    .controller('ContactListCtrl', ['$scope', 'Contact', '$location', function ($scope, contact, $location) {
        contact.retrieve().then(function(contacts) {
            $scope.contacts = contacts;
        }, function(reason) {
            console.log("Failed: " + reason);
        });
        $scope.delete = function(contactToDelete) {
            contact.delete(contactToDelete).then(function() {
                $scope.contacts.remove($scope.contacts.indexOf(contactToDelete));
            }, function(reason) {
                console.log("Delete failed.");
            });
        }
    }])
    .controller('ContactDetailCtrl', ['$scope', '$routeParams', 'Contact', function ($scope, $routeParams, contact) {
        contact.retrieve($routeParams.contactId).then(function(contact) {
            $scope.name = contact.name;
            $scope.data = contact.uniqueId;
        }, function(reason) {
            console.log("Failed: " + reason);
        });
    }])
    .controller('ShowMeCtrl', ['$scope', '$http', '$localKeyURL', function ($scope, $http, $localKeyURL) {
        console.log("In showme!");
        $http.get($localKeyURL)
         .success(function(data, status, headers, config) {
            $scope.data = data['localMachineIPHttpKeyURL'].split("/")[2];
            $scope.name = "Me";
         })
         .error(function(data, status, headers, config) {
            console.log("Error retrieving local HTTPKey.");
            console.log(data);
         })
    }])
    .controller('PutonCtrl', function () {
        console.log("Running puton.");
    })
    .controller('ContactNewCtrl', ['$scope', 'Contact', '$location', function($scope, contact, $location) {
        $scope.qrValue = '';
        $scope.contactName = '';
        $scope.videoStream = '';
        $scope.onSuccess = function(data) {
            $scope.qrValue = data;
        };
        $scope.onError = function(error) {
            console.log(error);
        };
        $scope.onVideoError = function(error) {
            console.log(error);
        };
        $scope.save = function(qrValue, contactName) {
            contact.create(contactName, qrValue).then(function() {
                $location.path('/contacts');
            }, function(reason) {
                console.log("Failed to save contact: " + reason);
            });
        }
    }]);