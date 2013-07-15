var http = require('http'),
    os = require('os'),
    extend = require('extend'),
    async = require('async'),
    imageDownloader = require('./image-downloader');

/**
 * Helper method to see if one array contains values from another array
 *
 * @param array1
 * @param array2
 */
function arrayInArray (array1,array2){
  var inArray = false;

  if (array1 instanceof Array && array2 instanceof Array){
    for (var i = 0, len = array1.length && !inArray; i < len; i++){
      if (array2.indexOf(array1[i]) > -1){
        inArray = true;
      }
    }
  }

  return inArray;
}
/**
 * APIClient object. It fetches browsers on initialization
 *
 * @param settings {Object} with user credentials
 * @param settings.email {String} username from Browserstack
 * @param settings.password {String} password from Browserstack
 * @param cb {Function} Callback that get passed to storeBrowsers
 */
function APIClient(settings, cb){
  if (!settings.email) {
    throw new Error('Email is required');
  }
  if (!settings.password) {
    throw new Error('Password is required');
  }

  this.email = settings.email;
  this.password = settings.password;
  this.authHeader = "Basic " + new Buffer([this.email,this.password].join(':')).toString('base64');
  this.destinationFolder = settings.folder;

  this.reqOptions = {
    host : 'www.browserstack.com',
    port : 80,
    method : "GET",
    headers : {
      "authorization" : this.authHeader,
      "user-agent" : this.getUserAgent(),
      "content-length" : 0
    }
  };
  this.browsers = {};
  var self = this;

  self.getBrowsers(function(err, json){
    if (err){ throw err; }
    self.storeBrowsers.apply(self,[json,cb]);
  });
}
/**
 * This function is in charge of generating the UserAgent for Requests
 *
 * @returns {String}
 */
APIClient.prototype.getUserAgent = function(){
  return [[os.platform(),os.release()].join('/'), ['node',process.versions.node].join('/'), 'node-browserstack'].join(' ');
};
/**
 * Forms the requests object by extending the default ones and the new ones and populating content-length if possible
 *
 * @param options {Object} Extended option to overwrite default ones
 * @param data {String} String that's going to be sent with the request. Needed to calculate content-length
 *
 * @returns {Object}
 */
APIClient.prototype.getRequestOptions = function(options,data){
  var op = extend(true, {}, this.reqOptions, options);
  op.headers["content-length"] = (typeof data === 'string') ? data.length : 0;
  return op;
};
/**
 * General function to perform requests. It stringifies the data, and passes it accordingly
 *
 * @param options {Object} Extended option to overwrite default ones
 * @param data {String} String that's going to be sent with the request.
 * @param cb {Function} Callback that gets passed when the request finishes
 */
APIClient.prototype.request = function(options, data, cb){
  // Data is the callback
  if (typeof data === 'function'){
    cb = data;
    data = null;
  }
  var dataString = data ? JSON.stringify(data) : '';

  var statusMessage = {
    '403' : 'Forbidden',
    '400' : 'Bad request'
  };

  var request = http.request(this.getRequestOptions(options,dataString), function(res){
    var response = '';
    res.setEncoding('utf8');

    res.on('data', function(chunk){
      response += chunk;
    });

    res.on('end', function(){
      if (res.statusCode !== 200){
        var message;

        if (res.headers['content-type'] && res.headers['content-type'].indexOf('json') > -1 ) {
          message = JSON.parse(response).message;
        } else {
          message = response;
        }

        if (!message){
          message = statusMessage[res.statusCode];
        }
        cb(new Error(message));
      }
      else {
        cb(null, JSON.parse(response));
      }
    });
  });

  request.on('error', function(e){
    cb(new Error(e.message));
  });

  if (data){
    request.write(dataString);
  }

  request.end();
};
/**
 * Function that requests browsers to the BrowserStack API
 *
 * @param cb {Function} Callback that gets passed when the request finishes
 */
APIClient.prototype.getBrowsers = function(cb){
  this.request({
    path : '/screenshots/browsers.json'
  },cb);
};
/**
 * Function that gets called to store the browsers on an inner object to make things more accessible.
 *
 * @param browsers {Object} Browsers collection that comes from BrowserStack
 * @param cb {Function} Callback that gets passed when it finishes
 */
APIClient.prototype.storeBrowsers = function(browsers, cb){
  var self = this;

  browsers.forEach(function(browser){
    var browserName = browser.browser.toLowerCase(),
        osName = browser.os.toLowerCase();
    if (typeof self.browsers[browserName] === 'undefined'){
      self.browsers[browserName] = {
        list : [],
        os : [],
        latestVersion : "0.0"
      };
    }
    if (self.browsers[browserName].os.indexOf(osName) === -1){
      self.browsers[browserName].os.push(osName);
    }
    self.browsers[browserName].list.push(browser);
    if (parseFloat(self.browsers[browserName].latestVersion) < parseFloat(browser.browser_version)){
      self.browsers[browserName].latestVersion = parseFloat(browser.browser_version).toFixed(1);
    }
  });
  if (typeof cb === 'function') { cb.apply(self); }
};
/**
 * Function that asks BrowserStack for the Images. Eventually it receives a response back from BrowserStack. Then it creates
 * a parallel queue for each image requested since all images are processed individually.
 *
 * @param request {Object} Request that is going to be sent to BrowserStack
 * @param cb {Function} Callback that gets passed when it finishes
 */
APIClient.prototype.getImages = function(request,cb){
  var self = this;

  console.log('Asking BrowserStack for %d images',request.browsers.length);

  this.request({
    path : '/screenshots',
    method : 'POST',
    headers : {
      'content-type' : 'application/json',
      'accept' : 'application/json'
    }
  },request, function(err,data){
    if (err) { throw err; }
    if (data){
      var functions = [];

      data.screenshots.forEach(function(screenshot,index){
        functions.push(function(done){
          self.queryQueue.apply(self,[data.wait_time, data.job_id, index,done]);
        });
      });

      console.log('There are %d images in queue', data.screenshots.length);

      async.parallel(functions,function(data){
        console.log('All done');
        if (typeof cb === 'function') { cb.apply(self,[data]); }
      });
    }
    else {
      throw new Error('No response came back! Do you have internet?');
    }
  });
};
/**
 * Recursive function that is called for each image to see if it's already processed. The waitingTime is advisory. Though
 * it comes from BrowserStack is not reliable. When the image is available, it finishes to retreive it.
 *
 * @param waitingTime {Number} Number of seconds that you should wait before making the request
 * @param jobID {String} Job's ID to make the request to see if image is or isn't processed
 * @param index {Number} Number of the image to which this image belongs in the internal job of BrowserStack
 * @param cb {Function} Function that gets passed to the next function
 */
APIClient.prototype.queryQueue = function(waitingTime, jobID, index, cb){
  var self = this;

  setTimeout(function(){
    self.request({
      path : '/screenshots/' + jobID + '.json',
      headers : {
        'content-type' : 'application/json',
        'accept' : 'application/json'
      }
    }, function(err, data){
      console.log('Checking if image %d is ready', index + 1);
      if (err) { cb(err); }
      if (data.screenshots[0].state === 'processing'){
        self.queryQueue.apply(self, [data.wait_time,jobID, index,cb]);
      }
      else {
        if (data.screenshots[index].state === 'done'){
          console.log('Fetching image %d', index + 1);
          self.fetchImages.apply(self, [data.screenshots[index],cb]);
        }
        else {
          self.queryQueue.apply(self, [data.wait_time,jobID, index,cb]);
        }
      }
    });
  }, waitingTime * 1000);
};
/**
 * Function that creates an unique and *descriptive* name for the image, given the data that comes from BrowserStack
 *
 * @param imageData {Object} Image object from Browserstack
 * @returns {String} Name of the image with which will be saved
 */
APIClient.prototype.getImageName = function(imageData){
  var os = [imageData.os,imageData.os_version].join('_'),
      browser = [imageData.browser,imageData.browser_version].join('_'),
      domain = imageData.url.substr(imageData.url.indexOf('://')+3).split('.'),
      date = (new Date()).toISOString();

  domain = domain[domain.length-2];
  var name = [domain,os,browser,date].join('_').replace(/\s/g, "_");
  name = name.replace(/:\s*/g,"-");
  name = name.replace(/\.\s*/g,"-");

  return name;
};
/**
 * This function is in charge of downloading the image to the route of the application
 *
 * @param data {Object} Data of the image to be fetched so we can download it
 * @param cb {Function} Function that gets passed to the next function
 */
APIClient.prototype.fetchImages = function(data,cb){
  var downloader = new imageDownloader();

  downloader.getImage(data.image_url, this.getImageName(data), this.destinationFolder, cb);
};
/**
 * Function that is in charge of Guessing the Browsers to stick with the ones BrowserStack has, according to the
 * parameters given
 *
 * @param browsers {Array} Browsers we want to get images from. Browsers can have the version separated by underscore.
 * Can add "_all" and even specify second minor version
 * @example
 *    ie_7 or ie_all or firefox_3.6
 * @param os {Array} Operating systems in which those browsers should run
 * @param osVersions {Object} Version of those OS. This should come in the format of "key" : [Array of versions]
 * @param devices {Array} Devices in which should run. Only applicable for Mobile Devices
 * @returns {Array} of guessed browsers
 */
APIClient.prototype.guessBrowsers = function(browsers, os, osVersions, devices){
  var guessed = [],
      self = this;

  browsers.forEach(function(browser){
    var aux = browser.split('_'),
        browserName = aux.shift(),
        browserVersion = aux.pop();

    if (self.browsers[browserName]){
      var browserStackBrowser = extend(true,{},self.browsers[browserName]);
      browserVersion = browserVersion || browserStackBrowser.latestVersion;
      if (browserVersion !== 'all' && browserVersion.indexOf('.') === -1){
        browserVersion += '.0';
      }

      if (browserStackBrowser.os.length === 1 || !os || arrayInArray(os,browserStackBrowser.os)){
        for (var i = 0, len = browserStackBrowser.list.length; i < len; i++){
          var currentBrowserVersion = parseFloat(browserStackBrowser.list[i].browser_version).toFixed(1) || null,
              currentBrowserOSName = browserStackBrowser.list[i].os.toLowerCase(),
              currentBrowserOSVersion = browserStackBrowser.list[i].os_version.toLowerCase(),
              currentBrowserDevice = browserStackBrowser.list[i].device ? browserStackBrowser.list[i].device.toLowerCase() : null;

          if (self.validBrowserVersion(currentBrowserVersion,browserVersion)){
            if (self.validOS(browserStackBrowser, currentBrowserOSName, os)){
              if (self.validOSVersion(osVersions, currentBrowserOSName, currentBrowserOSVersion, browserStackBrowser)){
                if (self.validDevice(currentBrowserDevice, devices)){
                  guessed.push(browserStackBrowser.list[i]);
                }
              }
            }
          }
        }
      }
    }
  });

  return guessed;
};
/**
 * Function that validates the browser version. This is the First Stage of the Validation
 *
 * Validates that:
 *  Evaluated browser matches requested version OR
 *  Requested version is equals to "all" OR
 *  Requested version is equals to 0.0 (no version) OR
 *  Evaluated browser doesn't have browser version
 *
 * @param currentBrowserVersion {String|Null} Browser's version of the evaluated browser
 * @param browserVersion {String} Requested browser version
 * @returns {boolean}
 */
APIClient.prototype.validBrowserVersion = function(currentBrowserVersion, browserVersion){
  return currentBrowserVersion === browserVersion || browserVersion === 'all' || browserVersion === '0.0' || !currentBrowserVersion;
};
/**
 * Function that validates the Operating System. This is the Second Stage of the Validation
 *
 * Validates that:
 *  The amount of OS the browser has is equals to 1 so we don't need to specify OS for IE for example. OR
 *  Evaluated browsers is inside of the OS candidates
 *  There is no requested OS. OR
 *
 * @param browserStackBrowser {Object} that contains all the information for a single browser
 * @param currentBrowserOSName {String} Browser's OS
 * @param os {Array|Null} Requested OS
 * @returns {boolean}
 */
APIClient.prototype.validOS = function(browserStackBrowser, currentBrowserOSName, os){
  return browserStackBrowser.os.length === 1 || !os  || os.indexOf(currentBrowserOSName) > -1;
};
/**
 * Function that validates if the OS version is valid. This is the Third Stage of the Validation
 *
 * Validates that:
 *  There is no requested OS versions. OR
 *    We have an entry specified for that OS. AND
 *      OS' version match with the candidates OR
 *      We haven't specified a particular version for that OS
 *  The amount of OS the browser has is equals to 1 so we don't need to specify OS for IE for example.
 *
 * @param osVersions {Object} Version of those OS. This should come in the format of "key" : [Array of versions]
 * @param currentBrowserOSName {String} Name of the OS of the Browser
 * @param currentBrowserOSVersion {String} Version of the OS of the current Browser
 * @param browserStackBrowser {Object} that contains all the information for a single browser
 * @returns {boolean}
 */
APIClient.prototype.validOSVersion = function(osVersions, currentBrowserOSName, currentBrowserOSVersion, browserStackBrowser){
  return !osVersions ||
      (typeof osVersions[currentBrowserOSName] !== "undefined" && (osVersions[currentBrowserOSName].indexOf(currentBrowserOSVersion) > -1 || !osVersions[currentBrowserOSName].length)) ||
      browserStackBrowser.os.length === 1;
};
/**
 * Function that validates if the Device of the Browser is Valid. This is the Final Stage
 *
 * Validates that:
 *  There is no requested Browser's device. OR
 *  The browser doesn't have a device (Desktop)
 *  Browser's device is in the requested list
 *
 * @param currentBrowserDevice
 * @param devices {Array} Requested Devices
 * @returns {boolean}
 */
APIClient.prototype.validDevice = function(currentBrowserDevice, devices){
  return !currentBrowserDevice || !devices || devices.indexOf(currentBrowserDevice) > -1;
};

module.exports = APIClient;