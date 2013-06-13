# browserscreenshot

browserscreenshot uses the BrowserStack's Screenshot API to take screenshots from websites and downloads to your computer.
It's great for automated tests to get a glance of your site in different browsers.

Note that this feature needs as of now, a "Regular" BrowserStack plan. Please, see [BrowserStack](http://www.browserstack.com/screenshots/pricing) for more details.

## CLI Usage

These are the parameters of the CLI

```
Options:
  -u, --username     The email you use to log in to Browserstack                                                            [required]
  -p, --password     Your account's password                                                                                [required]
  -w, --website      The website(s) from which you want to get screenshots. Comma separated list
  -b, --browser      The browser(s) from which you want to get screenshots. Comma separated list                            [required]
  -o, --orientation  Orientation of the device (portrait|landscape).                                                        [default: "portrait"]
  -s, --os           Operating System of the browser separating version with underscore (windows_xp). Comma separated list
  -d, --device       The device(s) from which you want to get screenshots. Comma separated list
  -h, --help         Shows help info
```

You may think that `website` should be mandatory. Since every single browser you request is a *paid* request and it will consume from the total, if you don't provide any website you only
will get the browsers to which you *would* submit the request. Try as many times as you want!

### `username`

This is actually your email to log into your BrowserStack account

### `password`

Password of your BrowserStack account

### `website`

Comma separated list of the URL's you want to get screenshot's from.

For example:

```
www.google.com,www.browserstack.com
```

Or just one:

```
www.google.com
```

### `browser`

Browser from which you want to get an screenshot. If you don't specify a version, it will suppose you wan't to get the latest one:

```
--browser ie
```

Will get you:

* IE 10 Desktop - Windows 8
* IE 10 normal - Windows 7

You can also get all of the versions from a browser, attaching `_all`:

```
--browser ie_all
```

Or a single version or a combination of them:

```
--browser ie_6,ie_7
```

* IE 6 - Windows XP
* IE 7 - Windows XP

##Development and Tests

```
npm install
./node_modules/.bin/grunt
```

## Credits

Really thanks for the support shown from [BrowserStack](http://www.browserstack.com/) guys, they made this possible.