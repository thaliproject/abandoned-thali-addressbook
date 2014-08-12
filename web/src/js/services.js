angular.module('addressBook.services', [])
    .factory('DomainToHttpKeyURL', ['$domainToHttpKeyURLBase', '$http', function($domainToHttpKeyURLBase, $http) {
        return function(domainToTranslate, successFunc) {
            $http.get($domainToHttpKeyURLBase + domainToTranslate)
                .success(function(data, status, headers, config) {
                    successFunc(data['httpKeyUrl']);
                })
                .error(function(data, status, headers, config) {
                    console.log("Error translating qrValue to httpkey URL");
                    console.log(data);
                    console.log(status);
                    console.log(headers);
                    console.log(config);
                })
        };
    }])
    .factory('Contact', ['$db', '$tdhdb', '$q', '$rootScope', 'DomainToHttpKeyURL',
        function($db, $tdhdb, $q, $rootScope, domainToHttpKeyURL) {
        return {
            create: function (contactName, qrValue) {
                var contact = {name: contactName, httpKeyUrl: ""};
                var deferred = $q.defer();
                $db.post(contact, function(err, postResponse) {
                    $rootScope.$apply(function() {
                        if(postResponse.ok) {
                            domainToHttpKeyURL(qrValue, function(retrievedHttpKeyUrl) {
                                $db.put({ httpKeyUrl: retrievedHttpKeyUrl}, postResponse.id, postResponse.rev,
                                    function(err, putResponse) {
                                        if (err) {
                                            console.log("Attempt to update contact with httpKey value failed: " + err);
                                        }
                                    })
                            });
                            deferred.resolve(postResponse);
                        } else {
                            console.log("Failed to save new contact: " + err);
                            deferred.reject(err);
                        }
                    });
                });
                return deferred.promise;
            },
            retrieve: function (contactId) {
                var deferred = $q.defer();
                $db.allDocs({include_docs:true}, function(err,response) {
                    $rootScope.$apply(function() {
                        if (response) {
                            var map = Array.prototype.map;
                            var returnValue = map.call(response.rows, function(x) { return x.doc;});
                            if (contactId) {
                                returnValue = returnValue.filter(function(contact) { return contact._id == contactId})[0];
                            }
                            deferred.resolve(returnValue);
                        } else {
                            console.log("Error getting all contacts: " + err);
                            deferred.reject(err);
                        }                   
                    });
                });
                return deferred.promise;
            }, 
            update: function (contact) {
                var deferred = $q.defer();
                $db.post(contact, function(err, response) {
                    $rootScope.$apply(function() {
                        if(response.ok) {
                            deferred.resolve(response);
                        } else {
                            console.log("Failed to update contact: " + err);
                            deferred.reject(err);
                        }
                    });
                });
                return deferred.promise;
            },
            delete: function (contact) {
                console.log("In delete!");
                var deferred = $q.defer();
                $db.remove(contact, function(err, response) {
                    $rootScope.$apply(function() {
                        if (response) {
                            deferred.resolve(response);
                        } else {
                            console.log("Failed to delete contact: " + err);
                            deferred.reject(err);
                        }
                    });
                });
                return deferred.promise;
            }
        }
    }])
;