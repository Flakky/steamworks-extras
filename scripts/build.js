#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');

const projectRoot = path.resolve(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');
const distDir = path.join(projectRoot, 'dist');

const copyFromRoot = async () => {
  const foldersToCopy = ['assets', 'styles'];
  
  for (const folder of foldersToCopy) {
    const src = path.join(projectRoot, folder);
    if (fs.existsSync(src)) {
      const dest = path.join(distDir, folder);
      await fse.copy(src, dest, { overwrite: true, dereference: true });
    }
  }
};

const copyFromSrc = async () => {
  if (!fs.existsSync(srcDir)) return;
  // Copy everything from src except TypeScript source files; tsc will emit JS into dist
  await fse.copy(srcDir, distDir, {
    overwrite: true,
    dereference: true,
    filter: (srcPath) => {
      if (fs.statSync(srcPath).isDirectory()) return true;
      const ext = path.extname(srcPath).toLowerCase();
      return ext !== '.ts' && ext !== '.tsx';
    },
  });
};

const copyManifest = async () => {
  const manifestRoot = path.join(projectRoot, 'manifest.json');
  if (fs.existsSync(manifestRoot)) {
    await fse.copy(manifestRoot, path.join(distDir, 'manifest.json'));
  }
};

const main = async () => {
  await fse.emptyDir(distDir);
  await copyFromRoot();
  await copyFromSrc();
  await copyManifest();
  console.log('Copied assets from root and static files from src into dist/.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
