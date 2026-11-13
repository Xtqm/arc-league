const fs = require('fs');
const path = require('path');

// Removes the electron-builder output directory so every local packaging
// build starts from a clean slate (see openspec change: clean-dist-before-packaging).
const distDir = path.join(__dirname, '..', 'dist');

if (!fs.existsSync(distDir)) {
  console.log(`No packaging output directory at ${distDir}; nothing to clean.`);
  process.exit(0);
}

console.log(`Cleaning stale packaging output: ${distDir}`);

try {
  fs.rmSync(distDir, { recursive: true, force: true });
  console.log(`Removed ${distDir}`);
} catch (err) {
  console.error(`ERROR: Failed to remove stale packaging output directory "${distDir}".`);
  console.error('A file inside dist is likely locked by another process (e.g., a running packaged app, installer, or build). Close it and re-run the packaging script.');
  console.error(err);
  process.exit(1);
}
