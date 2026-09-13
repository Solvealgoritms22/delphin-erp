const { existsSync } = require('fs');
const { mkdtemp, rm } = require('fs/promises');
const { tmpdir } = require('os');
const path = require('path');
const { spawn } = require('child_process');

function validateGoogleUrl(value) {
  const url = new URL(value);
  if (url.origin !== 'https://accounts.google.com' || url.username || url.password ||
      url.pathname !== '/o/oauth2/v2/auth' || !url.searchParams.get('state')) throw new Error('Invalid OAuth URL');
  return url.href;
}
function browserExecutable() {
  const roots = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean);
  return roots.flatMap(root => [path.join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe'), path.join(root, 'Google', 'Chrome', 'Application', 'chrome.exe')]).find(existsSync);
}
function createOAuthBrowser() {
  let current = null;
  async function close() {
    const session = current;
    if (!session) return;
    current = null;
    if (!session.closed && session.child.pid) {
      // Unique profile forces a dedicated process; never target the user's regular browser.
      if (process.platform === 'win32') await new Promise(resolve => {
        const killer = spawn(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'taskkill.exe'), ['/PID', String(session.child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
        killer.once('exit', resolve); killer.once('error', resolve);
      });
      else session.child.kill();
    }
    if (session.directory.startsWith(path.join(tmpdir(), 'dolphin-oauth-')))
      await rm(session.directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 }).catch(() => {});
  }
  return {
    async open(value) {
      const url = validateGoogleUrl(value);
      const executable = browserExecutable();
      if (!executable) throw new Error('OAUTH_BROWSER_UNAVAILABLE');
      await close();
      const directory = await mkdtemp(path.join(tmpdir(), 'dolphin-oauth-'));
      const child = spawn(executable, ['--user-data-dir=' + directory, '--no-first-run', '--no-default-browser-check', '--app=' + url, '--window-size=520,720'], { stdio: 'ignore', shell: false });
      const session = { child, directory, closed: false }; current = session;
      child.once('exit', () => { session.closed = true; });
      await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); }).catch(async error => { session.closed = true; await close(); throw error; });
    },
    close,
    isClosed: () => !current || current.closed,
  };
}
module.exports = { createOAuthBrowser, validateGoogleUrl };
