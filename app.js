"use strict";

var Prowl = require('node-prowl');
var https = require('https');
var account = [];
var request = [];
var validation;
var prowlToken = null;
var ledringPreference = false;

// Get accounts from homey settings page.
function buildProwlArray() {
	account = null;
	account = Homey.manager('settings').get('prowlaccount');

	if (account != null) {
		prowlToken = account['token'];
		ledringPreference = account['ledring'];

		var url = "https://api.prowlapp.com/publicapi/verify?apikey=";

		https.get(url + prowlToken, function (result) {
			if(result.statusCode == "200"){
				validation = 1;

				if (validation == "1"){
					Homey.log("Prowl - Account validated successful");
					logValidation();
				} else {
					Homey.log("Prowl - Token key invalid");
				}
			} else if (result.statusCode > "400") {
				Homey.log("Prowl - Token key invalid");
				validation = "0";
				logValidation();
			}
		});

	} else {
	Homey.log("Prowl - No account configured yet");
	}
}

function logValidation() {
	var validatedSuccess = "Validation successful"
	var validatedFailed = "Validation failed, bad user/api key!"
	if (validation == "1") {
		Homey.manager('settings').set('prowlvalidation', validatedSuccess);
	} else if (validation == "0") {
		Homey.manager('settings').set('prowlvalidation', validatedFailed);
	}
}

Homey.manager('flow').on('action.prowlSend', function( callback, args ){
	  if( typeof validation == 'undefined' || validation == '0') return callback( new Error("Prowl api/token key not configured or valid under settings!") );
		var tempToken = prowlToken;
		var pMessage = args.message;
		if( typeof pMessage == 'undefined' ||pMessage == null || pMessage == '') return callback( new Error("Message can not be empty") );
		var pPriority = args.priority;
		prowlSend ( tempToken, pMessage, pPriority);
    callback( null, true ); // we've fired successfully
});



// Send notification with parameters
function prowlSend ( pToken , pMessage, pPriority) {
	var priority = 0;
	switch (pPriority) {
		case 'Very Low':
			priority = -2;
			break;
		case 'Moderate':
			priority = -1;
			break;
		case 'Normal':
			priority = 0;
			break;
		case 'High':
			priority = 1;
			break;
		case 'Emergency':
				priority = 2;
				break;
	}
	if (pToken != ""){

	var p = new Prowl(pToken);

	var msg = {
		// These values correspond to the parameters detailed on https://pushover.net/api
		// 'message' is required. All other values are optional.
		message: pMessage,   // required
		application: "Homey"
		// priority: priority
	};
Homey.log( "net voor aanroep met bericht: " + pMessage );
	p.push( pMessage, "Homey", function( err, result ) {
		if ( err ) {
			throw err;
		} else {
			if (ledringPreference == true){
				LedAnimate("green", 3000);
			}
		}
		// Homey.log( "Prowl bericht gestuurd: " + pMessage );
		Homey.log( "net na aanroep met bericht: " + pMessage );

		Homey.log( result );
		//Add send notification to Insights
		Homey.manager('insights').createEntry( 'prowl_sendNotifications', 1, new Date(), function(err, success){
        if( err ) return Homey.error(err);
    });
	});
	} else {
		if (ledringPreference == true){
			LedAnimate("red", 3000);
		}
	}
}

function LedAnimate(colorInput, duration) {
Homey.manager('ledring').animate(
    // animation name (choose from loading, pulse, progress, solid)
    'pulse',

    // optional animation-specific options
    {

	   color: colorInput,
        rpm: 300 // change rotations per minute
    },

    // priority
    'INFORMATIVE',

    // duration
    duration,

    // callback
    function( err, success ) {
        if( err ) return Homey.error(err);

    }
);
}

// Create Insight log
function createInsightlog() {
	Homey.manager('insights').createLog( 'prowl_sendNotifications', {
    label: {
        en: 'Send Notifications'
    },
    type: 'number',
    units: {
        en: 'notifications'
    },
    decimals: 0
});
}

var self = module.exports = {
	init: function () {

		// Start building Pushover accounts array
		buildProwlArray();

		createInsightlog();

		Homey.manager('settings').on( 'set', function(settingname){

			if(settingname == 'prowlaccount') {
			Homey.log('Prowl - Account has been changed/updated...');
			buildProwlArray();
		}
		});

	}
}
