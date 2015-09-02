# Diont for Cordova

Easy Service Discovery on Local Networks. This Cordova plugin discovers services that are announced by Diont servers on the local network (wifi), either by other mobile devices that use this Diont plugin, or by a [Nodejs Diont](https://github.com/willemmulder/Diont) server.


## Features
* 100% complete: no extra dependencies
* allows for transmitting extra, arbitrary service information
* operates smoothly with [Diont for Nodejs](https://github.com/willemmulder/Diont)

## Installation
Install the plugin with cordova using this command

```shell
cordova plugin add "https://github.com/willemmulder/Diont-for-Cordova.git"
```
or install via [Plugman](https://github.com/apache/cordova-plugman/) and search for Diont.

The Diont plugin will be available as the `Diont` global variable in your Javascript code. See 'Get started' for an example.

## Get started
```javascript
var diont = Diont();

// ======
// Listen for announcements and renouncements in services
// ======
diont.on("serviceAnnounced", function(serviceInfo) {
	// A service was announced
	// This function triggers for services not yet available in diont.getServiceInfos()
	// serviceInfo is an Object { isOurService : Boolean, service: Object }
	// service.name, service.host and service.port are always filled
	console.log("A new service was announced", serviceInfo.service);
	// List currently known services
	console.log("All known services", diont.getServiceInfos());
});

diont.on("serviceRenounced", function(serviceInfo) {
	console.log("A service was renounced", serviceInfo.service);
	console.log("All known services", diont.getServiceInfos());
});

// ======
// Announce our own service
// ======
var service = {
	name: "TestServer 1",
	host: "127.0.0.1", // when omitted, defaults to the local IP
	port: "1231"
	// any additional information is allowed and will be propagated
};
diont.announceService(service);

// Renounce after 5 seconds
setTimeout(function() {
	diont.renounceService(service);
}, 5000);
```

## Thanks
Thanks to Gramakri for his [Cordova Datagram plugin](https://github.com/gramakri/cordova-plugin-datagram) that served as the inspiration for the UDP parts of this plugin.

## License

**This software is licensed under "MIT"**

> Copyright (c) 2015 Willem Mulder
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
