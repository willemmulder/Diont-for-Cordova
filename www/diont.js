var exec = cordova.require('cordova/exec');

var MULTICAST_HOST = "224.0.0.236";
var MULTICAST_PORT = 60540;

module.exports = function(options) {

	var instanceId = guid();

	var exports = {};
	var serviceInfos = {};
	var events = {};

	var options = options || {};
	var host = options.host || MULTICAST_HOST;
	var port = options.port || MULTICAST_PORT;

	// Services is a map (service.host+":"+service.port+":"+service.name) => Object serviceInfo
	// where serviceInfo is an object like
	// { isOurService : Boolean, service: Object }

	// =====
	// Set up UDP Multicast connection
	// =====

	function initCallbackSuccess() {
		queryForServices();
	}
	function initCallbackFail(err) {
		// ...
	}
	exec(initCallbackSuccess, initCallbackFail, 'Diont', 'init', [ instanceId, host, port ]);


	function messageCallback(message) {
		try {
			var messageObject = JSON.parse(message);
			var eventType = messageObject.eventType;
			var fromDiontId = messageObject.fromDiontInstance;
			if (fromDiontId == instanceId) {
				return;
			}
			if (eventType == "query") {
				var serviceInfosToAnnounce = [];
				for(var index in serviceInfos) {
					serviceInfosToAnnounce.push(serviceInfos[index]);
				}
				sendAnnouncement(serviceInfosToAnnounce);
			} else {
				var receivedServiceInfos = messageObject.serviceInfos;
				for(var serviceInfoIndex in receivedServiceInfos) {
					var serviceInfo = receivedServiceInfos[serviceInfoIndex];
					if(!serviceInfo.service) {
						continue;
					}
					var service = serviceInfo.service;
					if (!service.host || !service.port || !service.name) {
						continue;
					}
					if (eventType == "announce") {
						var id = service.host + ":" + service.port + ":" + service.name;
						if(!serviceInfos[id]) {
							var serviceInfo = serviceInfos[id] = {
								isOurService: false,
								service: service
							}
							if (events["serviceAnnounced"]) {
								for(var callbackId in events["serviceAnnounced"]) {
									var callback = events["serviceAnnounced"][callbackId];
									callback(serviceInfo);
								}
							}
						}
					} else if (eventType == "renounce") {
						var id = service.host + ":" + service.port + ":" + service.name;
						if(serviceInfos[id]) {
							var serviceInfo = serviceInfos[id];
							delete serviceInfos[id];
							if (events["serviceRenounced"]) {
								for(var callbackId in events["serviceRenounced"]) {
									var callback = events["serviceRenounced"][callbackId];
									callback(serviceInfo);
								}
							}
						}
					}
				}
			}
		} catch(e) {
			// ignore...
		}
	}
	exec(messageCallback, null, 'Diont', 'listen', [ instanceId ]);

	// =====
	// Exported functions
	// =====

    exports.announceService = function(service) {
        if (!service.host) {
            /* Many thanks to the following shoulders:
				http://net.ipcalf.com/
				http://stackoverflow.com/questions/2138538/non-server-side-method-of-getting-local-ip-address-in-browser
			*/
            // NOTE: window.RTCPeerConnection is "not a constructor" in FF22/23
            var RTCPeerConnection = /*window.RTCPeerConnection ||*/
                window.webkitRTCPeerConnection || window.mozRTCPeerConnection;

            var rtc;

            if (RTCPeerConnection) {

                rtc = new RTCPeerConnection({
                    iceServers: []
                });
                if (1 || window.mozRTCPeerConnection) { // FF [and now Chrome!] needs a channel/stream to proceed
                    rtc.createDataChannel('', {
                        reliable: false
                    });
                }
                rtc.onicecandidate = function(evt) {
                    if (evt.candidate) {
                        if (!service.host) {
                            service.host = getIpFromString(evt.candidate.candidate);
                        }
                        if (!service.host || !service.port || !service.name) {
                            return false;
                        }
                        var id = service.host + ":" + service.port + ":" + service.name;
                        if (!serviceInfos[id]) {
                            var serviceInfo = serviceInfos[id] = {
                                isOurService: true,
                                service: service
                            }
                            sendAnnouncement(serviceInfo);
                        }
                    }
                };

                rtc.createOffer(function(offerDesc) {
                    rtc.setLocalDescription(offerDesc);
                }, function(e) {
                    console.warn("offer failed", e);
                });
            } else {
                //browser doesn't support webrtc   
            }

            function getIpFromString(a) {
                var r = a.match(/\b(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/);
                return r[0];
            }
        }
    }


	exports.renounceService = function(service) {
		if (!service.host || !service.port || !service.name) {
			return false;
		}
		var id = service.host + ":" + service.port + ":" + service.name;
		if(serviceInfos[id] && serviceInfos[id].isOurService) {
			sendRenouncement(serviceInfos[id]);
			delete serviceInfos[id];
		}
	}

	exports.queryForServices = function() {
		queryForServices();
	}

	exports.on = function(eventName, callback) {
		if(!events[eventName]) {
			events[eventName] = {};
		}
		var callbackId = guid();
		events[eventName][callbackId] = callback;
		return callbackId;
	}

	exports.off = function(eventName, callbackId) {
		if(!events[eventName]) {
			return false;
		}
		delete events[eventName][callbackId];
		return true;
	}

	exports.getServiceInfos = function() {
		return JSON.parse(JSON.stringify(serviceInfos));
	}

	// =====
	// Helper functions
	// =====

	function generalSuccessCallback(success) {
		// ...
	}

	function generalFailCallback(error) {
		// ...
	}

	function sendAnnouncement(serviceInfo) {
		var serviceInfosToAnnounce = [];
		if (serviceInfo instanceof Array) {
			serviceInfosToAnnounce = serviceInfo;
		} else {
			serviceInfosToAnnounce = [serviceInfo];
		}
		var messageObject = {
			eventType: "announce",
			fromDiontInstance: instanceId,
			serviceInfos: serviceInfosToAnnounce
		}
		var message = JSON.stringify(messageObject);
		exec(generalSuccessCallback, generalFailCallback, 'Diont', 'send', [ instanceId, message, host, port ]);
	}

	function sendRenouncement(serviceInfo) {
		var serviceInfosToRenounce = [];
		if (serviceInfo instanceof Array) {
			serviceInfosToRenounce = serviceInfo;
		} else {
			serviceInfosToRenounce = [serviceInfo];
		}
		var messageObject = {
			eventType: "renounce",
			fromDiontInstance: instanceId,
			serviceInfos: serviceInfosToRenounce
		}
		var message = JSON.stringify(messageObject);
		exec(generalSuccessCallback, generalFailCallback, 'Diont', 'send', [ instanceId, message, host, port ]);
	}

	function queryForServices() {
		var messageObject = {
			eventType: "query",
			fromDiontInstance: instanceId
		}
		var message = JSON.stringify(messageObject);
		exec(generalSuccessCallback, generalFailCallback, 'Diont', 'send', [ instanceId, message, host, port ]);
	}

	function guid() {
		function s4() {
			return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
		}
		return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
	}

	// =====
	// Export
	// =====

	return exports;
}
