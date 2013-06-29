#!/usr/bin/env node
var fs = require('fs'),
    version = JSON.parse(fs.readFileSync(__dirname + '/../package.json', 'utf8')).version,
    browserscreenshot = require('../'),
    async = require('async'),
    optimist = require('optimist');

// Validation arrays
var orientations = ['portrait','landscape'];

var argv = optimist
<<<<<<< HEAD
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
=======
    .usage('browserscreenshot '+version+'\nUsage: $0 [opts]')
    .demand(['u','p'])
    .alias('u','username')
    .describe('u', 'The email you use to log in to Browserstack')
    .alias('p','password')
    .describe('p', 'Your account\'s password')
    .alias('w','website')
    .describe('w', 'The website(s) from which you want to get screenshots. Comma separated list')
    .alias('b','browser')
    .default('b','IE_8,IE_9,Chrome,Firefox')
    .describe('b', 'The browser(s) from which you want to get screenshots. Comma separated list')
    .alias('o','orientation')
    .describe('o', 'Orientation of the device (portrait|landscape).')
    .default('o','portrait')
    .alias('s','os')
    .describe('s', 'Operating System of the browser separating version with underscore (windows_xp). Comma separated list')
    .default('s', 'windows_7')
    .alias('d','device')
    .describe('d', 'The device(s) from which you want to get screenshots. Comma separated list')
    .alias('f', 'folder')
    .describe('f', 'Folder in which screenshots will be stored')
    .default('f', process.cwd())
    .alias('l','ls')
    .describe('l','Instead of getting images, it will output a list of browsers and OS available')
    .boolean('l')
    .alias('h','help')
    .describe('h', 'Shows help info')
    .check(function(argv){
      if (orientations.indexOf(argv.orientation) === -1){
        throw new Error('Orientation has to bee one of this values ' + orientations.join('|'))
      }
    })
    .argv;
>>>>>>> Version 0.1.0

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
  password : argv.password,
  folder : argv.folder
}, function(){
  if (argv.l){
    for (var browser in client.browsers){
      if (client.browsers.hasOwnProperty(browser)) {
        var versions = [];
        console.log('Browser: %s', browser);
        console.log('OS: %s', client.browsers[browser].os.join(', '));
        client.browsers[browser].list.forEach(function(version){
          var browserVersion = version.browser_version || version.os_version;
          if (versions.indexOf(browserVersion) === -1){
            versions.push(browserVersion);
          }
        });
        console.log('Versions: %s', versions.join(', '));
        console.log('');
      }
    }
  }
  else {
    var browsers = client.guessBrowsers(candidateBrowsers,os,osVersions, devices);
    var urls = argv.website ? argv.website.split(',') : null, functions = [];

    if (!browsers){
      throw new Error('Invalid browsers supplied');
    }
    else {
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
          console.log('All urls have been downloaded into "%s"!', client.destinationFolder);
        });
      }
      else {
        console.log('Since you provided no websites, I asume that you want to tests browser matching');
        console.log(browsers);
      }
    }
  }

});