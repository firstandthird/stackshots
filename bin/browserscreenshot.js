#!/usr/bin/env node
var fs = require('fs'),
    version = JSON.parse(fs.readFileSync(__dirname + '/../package.json', 'utf8')).version,
    browserscreenshot = require('../'),
    async = require('async'),
    optimist = require('optimist');

// Validation arrays
var orientations = ['portrait','landscape'];

var argv = optimist
  .usage('browserscreenshot '+version+'\nUsage: $0 [opts]')
  .demand(['u','p','b'])
  .alias('u','username')
  .describe('u', 'The email you use to log in to Browserstack')
  .alias('p','password')
  .describe('p', 'Your account\'s password')
  .alias('w','website')
  .describe('w', 'The website(s) from which you want to get screenshots. Comma separated list')
  .alias('b','browser')
  .describe('b', 'The browser(s) from which you want to get screenshots. Comma separated list')
  .alias('o','orientation')
  .describe('o', 'Orientation of the device (portrait|landscape).')
  .default('o','portrait')
  .alias('s','os')
  .describe('s', 'Operating System of the browser separating version with underscore (windows_xp). Comma separated list')
  .alias('d','device')
  .describe('d', 'The device(s) from which you want to get screenshots. Comma separated list')
  .alias('h','help')
  .describe('h', 'Shows help info')
  .check(function(argv){
    if (orientations.indexOf(argv.orientation) === -1){
      throw new Error('Orientation has to bee one of this values ' + orientations.join('|'));
    }
  })
  .argv;

if (argv.help) {
  return optimist.showHelp(function(help) {
    console.log(help);
  });
}

var candidateBrowsers = argv.browser.toLowerCase().split(','),
    os = argv.os ? argv.os.toLowerCase().split(',') : null,
    devices = argv.device ? argv.device.toLowerCase().split(',') : null;

var auxOs = [], osVersions = null;

if (os){
  osVersions = {};
  for (var i = 0, len = os.length; i < len; i++){
    var osAndVersion = os[i].split('_');
    if (typeof osVersions[osAndVersion[0]] === 'undefined') {
      osVersions[osAndVersion[0]] = [];
    }
    if (auxOs.indexOf(osAndVersion[0]) === -1){
      auxOs.push(osAndVersion[0]);
    }
    if (osAndVersion[1]){
      osVersions[osAndVersion[0]].push(osAndVersion[1]);
    }
  }
  os = auxOs;
}

var client = new browserscreenshot({
  email : argv.username,
  password : argv.password
}, function(){
  var browsers = client.guessBrowsers(candidateBrowsers,os,osVersions, devices);
  var urls = argv.website ? argv.website.split(',') : null, functions = [];

  if (urls){
    urls.forEach(function(url){
      functions.push(function(cb){
        var request = {
          url : url,
          orientation : argv.orientation,
          browsers : browsers
        };
        console.log('Requesting images for %s', url);
        client.getImages(request,cb);
      });
    });

    async.series(functions,function(){
      console.log('All urls have been downloaded!');
    });
  }
  else {
    console.log('Since you provided no websites, I asume that you want to tests browser matching');
    console.log(browsers);
  }
});