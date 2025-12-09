#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const pagesApi = path.join(projectRoot, 'pages', 'api');
const pagesApiDisabled = path.join(projectRoot, 'pages', '_api_disabled_for_pages_build');

function log(...args) { console.log('[build-pages]', ...args); }

try {
  // If pages/api exists, rename it out of the way
  const apiExists = fs.existsSync(pagesApi);
  if (apiExists) {
    log('Found pages/api, renaming to', pagesApiDisabled);
    fs.renameSync(pagesApi, pagesApiDisabled);
  } else {
    log('No pages/api found, continuing');
  }

  // Run next build and export
  log('Running `next build`');
  execSync('npx next build', { stdio: 'inherit', cwd: projectRoot });

  log('Running `npx next export`');
  // next export will output to 'out' by default
  execSync('npx next export', { stdio: 'inherit', cwd: projectRoot });

  log('Export finished — static files in ./out');
} catch (err) {
  console.error('[build-pages] Build failed:', err.message || err);
  process.exit(1);
} finally {
  // Restore pages/api if we moved it
  try {
    if (fs.existsSync(pagesApiDisabled)) {
      log('Restoring pages/api from', pagesApiDisabled);
      fs.renameSync(pagesApiDisabled, pagesApi);
    }
  } catch (restoreErr) {
    console.error('[build-pages] Failed to restore pages/api:', restoreErr.message || restoreErr);
  }
}
