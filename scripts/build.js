#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const esbuild = require('esbuild')

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

const copyHtmlAndDataFiles = async () => {
    if (!fs.existsSync(srcDir)) return;
    // Copy everything from src except TypeScript source files; tsc will emit JS into dist
    await fse.copy(srcDir, distDir, {
        overwrite: true,
        dereference: true,
        filter: (srcPath) => {
            if (fs.statSync(srcPath).isDirectory()) return true;
            const ext = path.extname(srcPath).toLowerCase();
            return ext === '.html' || ext === '.json';
        },
    });
};

const copyManifest = async () => {
    const manifestRoot = path.join(projectRoot, 'manifest.json');
    if (fs.existsSync(manifestRoot)) {
        await fse.copy(manifestRoot, path.join(distDir, 'manifest.json'));
    }
};
const bundleContentScripts = async (inlineScripts = true) => {
    const contentScriptsToBundle = [
        // Background scripts
        {
            entry: 'src/background/extensionservice.ts',
            outfile: 'dist/background/extensionservice.js',
        },
        // Offscreen
        {
            entry: 'src/background/offscreen/offscreen.ts',
            outfile: 'dist/background/offscreen/offscreen.js',
        },
        // Content scripts
        {
            entry: 'src/content/appdetails/appdetails.ts',
            outfile: 'dist/content/appdetails/appdetails.js',
        },
        {
            entry: 'src/content/appwishlists/appwishlist.ts',
            outfile: 'dist/content/appwishlists/appwishlist.js',
        },
        {
            entry: 'src/content/refunds/refunds.ts',
            outfile: 'dist/content/refunds/refunds.js',
        },
        {
            entry: 'src/content/traffic/apptraffic.ts',
            outfile: 'dist/content/traffic/apptraffic.js',
        },
        // Popup
        {
            entry: 'src/popup/popup.ts',
            outfile: 'dist/popup/popup.js',
        },
        // Options
        {
            entry: 'src/options/options.ts',
            outfile: 'dist/options/options.js',
        },
        // Shared scripts
        {
            entry: 'src/shared/log.ts',
            outfile: 'dist/shared/log.js',
        },
        {
            entry: 'src/shared/statusblock.ts',
            outfile: 'dist/shared/statusblock.js',
        },
    ];

    for (const script of contentScriptsToBundle) {
        const entryPath = path.join(projectRoot, script.entry);
        const outfilePath = path.join(projectRoot, script.outfile);

        // Ensure output directory exists
        const outDir = path.dirname(outfilePath);
        await fse.ensureDir(outDir);

        await esbuild.build({
            entryPoints: [entryPath],
            outfile: outfilePath,
            bundle: true,
            minify: false,
            platform: 'browser',
            format: 'iife', // IIFE format for browser extensions
            sourcemap: inlineScripts ? 'inline' : false,
        });

        console.log(`Bundled ${script.entry} -> ${script.outfile}`);
    };
};
const main = async () => {
    await fse.emptyDir(distDir);
    await copyFromRoot();
    await copyHtmlAndDataFiles();
    await copyManifest();

    console.log('Copied assets from root and static files from src into dist/.');

    await bundleContentScripts();

    console.log('Bundled content scripts into dist/.');
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
