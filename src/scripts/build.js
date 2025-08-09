#!/usr/bin/env node
/*
  Copies the current extension source tree into dist/ unchanged.
  Leaves room for compiling future TypeScript from src/ into dist/ as well.
*/
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');

async function main() {
  await fse.emptyDir(distDir);

  // Folders/files to copy as-is into dist
  const entriesToCopy = [
    'assets',
    'background',
    'content',
    'data',
    'options',
    'popup',
    'scripts',
    'shared',
    'styles',
    'manifest.json',
    'README.md',
    'LICENSE'
  ];

  for (const entry of entriesToCopy) {
    const srcPath = path.join(projectRoot, entry);
    if (!fs.existsSync(srcPath)) continue;
    const destPath = path.join(distDir, entry);
    await fse.copy(srcPath, destPath, { overwrite: true, dereference: true });
  }

  // Ensure an empty dist/src exists for clarity when TS emits later
  await fse.ensureDir(path.join(distDir, 'src'));
  console.log('Copied extension files to dist/.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});


