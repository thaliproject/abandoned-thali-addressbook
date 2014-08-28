angular.module('addressBook.services', [])
    .factory('DomainToHttpKeyURL', ['$domainToHttpKeyURLBase', '$http', '$q',
        function($domainToHttpKeyURLBase, $http, $q) {
            function translate(domainToTranslate) {
                return $http.get($domainToHttpKeyURLBase + domainToTranslate)
                    .then(function(response) {
                        return response.data['httpKeyUrl'];
                    })
                    .catch(function(errResponse) {
                        var errorMessage = "Error translating qrValue to httpkey URL";
                        console.log(errorMessage);
                        console.log(errResponse.data);
                        console.log(errResponse.status);
                        console.log(errResponse.headers);
                        console.log(errResponse.config);
                        return translate(domainToTranslate);
                    });
            }

            return function(domainToTranslate) {
                return translate(domainToTranslate);
            };
    }])
    .factory('PermissionDatabase', ['$relayAddress', '$q', 'pouchdb', function($relayAddress, $q, pouchdb) {
        /*
         The document in keybase has four fields
         id - Exactly the value out of the httpkeyurl
         keyType - "RSAKeyType"
         modulus -
         exponent -
         */
        var rsakeytype = "rsapublickey";
        var keyDatabaseName = "thaliprincipaldatabase";
        function keyDatabasePouch() {
            return TDHReplication.waitForRelayToStart()
                .then(function() {
                    return pouchdb.create($relayAddress + "/" + keyDatabaseName);
                })
        }

        return {
            create: function(httpKey) {
                var rsaPublicKeyString = httpKey.split("/")[3];
                // We add a + 1 on rsakeytype.length because we want to eat the ":" separator
                var rsaPublicKeySplit = rsaPublicKeyString.substr(rsakeytype.length + 1).split(".");
                var publicKeyDoc = {};
                publicKeyDoc.keyType = rsakeytype;
                publicKeyDoc.exponent = rsaPublicKeySplit[0];
                publicKeyDoc.modulus = rsaPublicKeySplit[1];
                // Yes, we use the same string as the record ID
                var recordId = rsaPublicKeyString;
                // We don't need a 'then' since if the key is present then we have succeeded!
                return keyDatabasePouch()
                    .then(function(pouch) {
                        return pouch.get(recordId)
                            .catch(function (err) {
                                // We don't need a 'then' since if the key was successfully put we are done
                                return keyDatabasePouch()
                                    .then(function(pouch) {
                                        return pouch.put(publicKeyDoc, recordId).catch(function (err) {
                                                // It's quite likely nobody is listening so we should log ourselves
                                                console.log("Could not put key into database! - " + err);
                                                return $q.reject(err);
                                            }
                                        )
                                    });
                            })
                    });
            },
            delete: function(httpKey) {
                var recordId = httpKey.split("/")[3];
                return keyDatabasePouch()
                    .then(function(pouch) {
                        return pouch.get(recordId)
                            .then(
                            function (doc) {
                                return keyDatabasePouch()
                                    .then(function(pouch) {
                                        return pouch.remove(doc)
                                            .then(function() { console.log("permission deleted!"); })
                                            .catch(function(err) { console.log("permission wasn't deleted because " +
                                                err)});
                                    });
                            },
                            function (err) {
                                // If the key isn't in the permission database then it has, effectively, already been
                                // deleted and we can just return.
                                console.log("permission wasn't in the DB so we didn't need to delete it, all good.");
                                return;
                            }
                        );
                    });
            }
        }
    }])
    .factory('Contact', ['$db', '$tdhdb', '$q', '$rootScope', 'DomainToHttpKeyURL', 'PermissionDatabase',
        function($db, $tdhdb, $q, $rootScope, domainToHttpKeyURL, permissionDatabase) {
        return {
            create: function (contactName, qrValue) {
                var contact = {name: contactName, httpKeyUrl: ""};
                var deferred = $q.defer();
                $db.post(contact, function(err, postResponse) {
                    $rootScope.$apply(function() {
                        if(postResponse.ok) {
                            domainToHttpKeyURL(qrValue)
                                .then(function(retrievedHttpKeyUrl) {
                                    contact.httpKeyUrl = retrievedHttpKeyUrl;
                                    $db.put(contact, postResponse.id, postResponse.rev,
                                        function(err, putResponse) {
                                            if (err) {
                                                console.log("Attempt to update contact with httpKey value failed: " + err);
                                            } else {
                                                permissionDatabase.create(retrievedHttpKeyUrl)
                                                    .then(function() { console.log("Full provisioned " + retrievedHttpKeyUrl)});
                                            }
                                        })
                                })
                                .catch(function(err) {
                                    console.log("Attempt to translate domain to httpkey URL failed - " + err);
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
            // This function has not had the logic added to it to change keys in the permission database
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
                            if (contact.httpKeyUrl && contact.httpKeyUrl.length > 0) {
                                permissionDatabase.delete(contact.httpKeyUrl)
                                    .then(function(response) {
                                        return deferred.resolve(response);
                                    })
                                    .catch(function(errResponse) {
                                        return deferred.reject(errResponse);
                                    });
                            } else {
                                // This is a race condition where someone deleted a contact before we had
                                // turned its onion address into a httpkeyURL.
                                return deferred.resolve();
                            }
                        } else {
                            console.log("Failed to delete contact: " + err);
                            return deferred.reject(err);
                        }
                    });
                });
                return deferred.promise;
            }
        }
    }])
;