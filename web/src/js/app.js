'use strict';

angular.module('addressBook', [
	'ja.qr',
	'pouchdb',
	'ngTouch',
	'ngRoute',
	'ngAnimate',
	'addressBook.controllers',
	'addressBook.directives',
	'addressBook.services'
])
.config(['$routeProvider', function ($routeProvider) {
	$routeProvider
		.when('/contacts', {
			templateUrl: 'partials/contact-list.html', 
			controller: 'ContactListCtrl'
		})
		.when('/showme', {
			templateUrl: 'partials/contact-detail.html',
			controller: 'ShowMeCtrl'
		})
		// .when('/rawdb', {
		// 	templateUrl: 'partials/rawdb.html',
		// 	controller: 'PutonCtrl',
		// 	css: '../bower_components/puton/public/dist/release/puton.css'
		// })
		.when('/contacts/:contactId', {
			templateUrl: 'partials/contact-detail.html', 
			controller: 'ContactDetailCtrl'
		})
		.when('/newcontact', {
			templateUrl: 'partials/contact-new.html',
			controller: 'ContactNewCtrl'
		})
		.when('/deletecontact/:contactId', {
			templateUrl: 'partials/contact-delete.html',
			controller: 'ContactDeleteCtrl'
		})
		.otherwise({
			redirectTo: '/contacts'
		});
}])
.constant('$dbname', 'addressbook')
.constant('$relayAddress', TDHReplication.relayAddress)
.constant('$tdhdb', TDHReplication.relayAddress+'/addressbook')
.constant('$localKeyURL', TDHReplication.relayAddress+'/_relayutility/localhttpkeys')
.constant('$domainToHttpKeyURLBase', TDHReplication.relayAddress+'/_relayutility/translateonion?')
.factory('$db', ['$dbname', '$tdhdb', function($dbname, $tdhdb) {
   var $db = new PouchDB($dbname);

   // There is a bug in the pouchdb nightly that when an event occurs it calls a callback
   // that isn't defined. To work around that we aren't using the sync convenience function.
   // NOTE: Somebody, somewhere doesn't detect when the TDH goes down and the replication won't fail
   // properly so the following absolutely should not be relied on.
    function doSync(source, target) {
        TDHReplication.waitForRelayToStart()
            .then(function() {
                PouchDB.replicate(source, target, {live: true}).on('error', function(err) {
                    console.log("We got an error synching " + source + " to " + target + ", " +  err);
                    doSync();
                });
            });
    }

   doSync($dbname, $tdhdb);
   doSync($tdhdb, $dbname);

   return $db;
}])
;
