'use strict';

const Homey = require('homey');
var Prowl = require('node-prowl');
var https = require('https');
var request = [];
var account = [];
var validation;
var prowlToken = null;
var ledringPreference = false;
var InsightLog = null;

class MyApp extends Homey.App {

	onInit() {

        // Start building Prowl accounts array
		buildProwlArray();

		createInsightlog();

		Homey.ManagerSettings.on('set', function (settingname) {

			if (settingname == 'prowlaccount') {
				console.log('Prowl - Account has been changed/updated...');
				buildProwlArray();
			}
		});

    let sendMessage = new Homey.FlowCardAction('prowlSend');
		sendMessage
		.register()
		.registerRunListener(( args, state ) => {
			if (typeof validation == 'undefined' || validation == '0') return new Error("Prowl token not configured or valid under settings!");
				let pToken = prowlToken;
				let pMessage = args.message;
				let pPriority = args.priority;
				if (typeof pMessage == 'undefined' || pMessage == null || pMessage == '') return new Error("Message can not be empty");
				return prowlSend(pToken, pMessage, pPriority, '');
		})
	}
}

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
		application: "Homey",
		priority: pPriority
	};
	p.push( pMessage, "Homey", function( err, result ) {
		if ( err ) {
			// throw err;
			console.log("Error in calling push: " + err);
		} else {
			if (ledringPreference == true){
				// LedAnimate("green", 3000);
			}
		}
		console.log(result);
		//Add send notification to Insights
		InsightEntry(1, new Date());
	});
	} else {
		if (ledringPreference == true){
			// LedAnimate("red", 3000);
		}
	}
}

function InsightEntry(message, date)
{

	Homey.ManagerInsights.getLog('prowl_sendNotifications').then(logs => {
		logs.createEntry(message,date).catch( err => {
			console.error(err);
		});
	}).catch(err => {
	console.log("Cannot Make insight entry")
	});
}

// Create Insight log
function createInsightlog() {
	Homey.ManagerInsights.createLog('prowl_sendNotifications', {
		label: {
			en: 'Send Notifications',
			nl: 'Verstuurde notificaties'
		},
		type: 'number',
		units: {
			en: 'notifications',
			nl: 'notificaties'
		},
		decimals: 0
	}).then(function (err){
	console.log("Log Created")
	}).catch(function (err)
{
	console.log("Log Not created. " + err)
});
}

function buildProwlArray() {
	account = null;
	account = Homey.ManagerSettings.get('prowlaccount');

	if (account != null) {
		prowlToken = account['token'];
		ledringPreference = account['ledring'];
		validation = 1;
		console.log("Prowl - Account configured successful");
	} else {
		validation = 0;
		console.log("Prowl - No account configured yet");
	}
}

function logValidation() {
	let validatedSuccess = "Validation successful"
	let validatedFailed = "Validation failed, bad token!"
	if (validation == "1") {
		Homey.ManagerSettings.set('prowlvalidation', validatedSuccess);
	} else if (validation == "0") {
		Homey.ManagerSettings.set('prowlvalidation', validatedFailed);
	}
}

module.exports = MyApp;
