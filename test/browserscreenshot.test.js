var assert = require('assert'),
    browserscreenshot = require('../');

suite('browserscreenshot',function(){
  var client,
      testUser = {
        'email' : 'test@test.com',
        'password' : '1234'
      };
  test('should throw an exception if no email is supplied',function(){
    assert.throws(
      function(){
        client = new browserscreenshot();
      },
      'Email is required'
    );
  });
  test('should throw an exception if no password is supplied',function(){
    assert.throws(
      function(){
        client = new browserscreenshot({
          'email' : testUser.email
        });
      },
      'Password is required'
    );
  });
  test('should call a callback function on creation',function(done){
    client = new browserscreenshot(testUser,done);
  });

  test('should have proper auth header on creation', function(){
    var shouldbe = 'Basic ' + new Buffer([testUser.email,testUser.password].join(':')).toString('base64');
    client = new browserscreenshot(testUser);
    assert.equal(client.authHeader,shouldbe);
  });
  test('should set a correct length on request', function(){
    var mockString = '1234';
    client = new browserscreenshot(testUser);

    assert.equal(client.getRequestOptions({},mockString).headers['content-length'], mockString.length);
  });
  test('should generate a proper file name', function(){
    var mockImageData = {
      "os": "Windows",
      "os_version": "XP",
      "browser": "ie",
      "browser_version": "7.0",
      "id": "be9989892cbba9b9edc2c95f403050aa4996ac6a",
      "state": "done",
      "url": "www.google.com",
      "thumb_url": "http://www.browserstack.com/screenshots/13b93a14db22872fcb5fd1c86b730a51197db319/thumb_winxp_ie_7.0.jpg",
      "image_url": "http://www.browserstack.com/screenshots/13b93a14db22872fcb5fd1c86b730a51197db319/winxp_ie_7.0.png",
      "created_at": "2013-03-14 16:25:45 UTC"
    };
    client = new browserscreenshot(testUser);

    assert.equal(client.getImageName(mockImageData), "google_Windows_XP_ie_7-0_2013-03-14T16-25-45-000Z");
  });

});