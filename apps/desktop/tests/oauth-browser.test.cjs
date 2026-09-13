const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateGoogleUrl } = require('../oauth-browser');
test('accepts only the Google authorization endpoint with state', () => {
  assert.equal(validateGoogleUrl('https://accounts.google.com/o/oauth2/v2/auth?state=secret'), 'https://accounts.google.com/o/oauth2/v2/auth?state=secret');
  for (const url of ['https://accounts.google.com.evil.test/o/oauth2/v2/auth?state=a', 'https://user:password@accounts.google.com/o/oauth2/v2/auth?state=a', 'file:///tmp/test', 'https://accounts.google.com/o/oauth2/v2/auth', 'https://accounts.google.com/other?state=a']) assert.throws(() => validateGoogleUrl(url));
});
