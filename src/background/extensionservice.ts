import { getBrowser } from '../shared/browser';
import { defaultSettings } from '../data/defaultsettings';
import { extensionStatus, setExtentionStatus } from './status';
import { OffscreenManager, initOffscreen } from './offscreen/offscreenmanager';
import { initIDsWithRetry, initPageCreationDatesWithRetry } from './gameids';
import { StorageActionsQueue } from './storage/storagequeue';
import { clearAllData, initStorageForAppIDs } from './storage/db';
import { startUpdatingStats } from './statsupdater';
import { initMessageListener } from './messagelistener';
import { getAppIDs } from './bghelpers';
import '../shared/log';

declare var browser: typeof chrome | undefined;

if (typeof browser == "undefined") {
    // Chrome does not support the browser namespace yet.
    (globalThis as any).browser = chrome;

    // console.log('Importing scripts');
    // importScripts('../data/defaultsettings.js');
    // importScripts('../shared/log.js');
    // importScripts('../scripts/helpers.js');
    // importScripts('offscreen/offscreenmanager.js');
    // importScripts('../scripts/parser.js');
    // importScripts('bghelpers.js');
    // importScripts('status.js');
    // importScripts('storage/storage.js');
    // importScripts('storage/storagequeue.js');
    // importScripts('storage/storage_reviews.js');
    // importScripts('storage/storage_sales.js');
    // importScripts('storage/storage_traffic.js');
    // importScripts('storage/storage_wishlists.js');
    // importScripts('storage/storage_wishlistconversions.js');
    // importScripts('statsupdater.js');
}

const getStartupInit = async () => {
    const result = await getBrowser().storage.local.get('startupInit');
    return result.startupInit;
}

const setStartupInit = async (value: boolean) => {
    await getBrowser().storage.local.set({ startupInit: value });
}

getBrowser().runtime.onInstalled.addListener(async (details: any) => {
    console.debug('On installed details: ', details);

    if (details.reason === "update") {
        const previousVersion = details.previousVersion;
        const currentVersion = getBrowser().runtime.getManifest().version;
        console.log(`Extension updated from ${previousVersion} to ${currentVersion}`);

        if (previousVersion.startsWith('2.')) {
            await clearAllData();
            console.log('All data has been cleared.');
        }
    }

    getBrowser().storage.local.get(Object.keys(defaultSettings), (storedSettings: Record<string, any>) => {
        const settingsToStore: Record<string, any> = {};

        for (const key in defaultSettings) {
            if (storedSettings[key] === undefined) {
                settingsToStore[key] = defaultSettings[key];
            }
        }

        if (Object.keys(settingsToStore).length > 0) {
            getBrowser().storage.local.set(settingsToStore, () => {
                console.log('Default settings have been initialized.');
            });
        }
    });

    await startInit();

    await setStartupInit(true);
});

getBrowser().runtime.onStartup.addListener(async () => {
    await startInit();

    await setStartupInit(true);
});

const startInit = async () => {
    console.log('Start init');

    setExtentionStatus(1);

    // We init those objects temporarily to for the offscreen to be able to send messages to the background script
    // because offscreen is used to parse IDs
    await initOffscreen();
    const offscreenManager = new OffscreenManager();
    const queue = new StorageActionsQueue();
    await initMessageListener({ offscreenManager, queue });

    await initIDsWithRetry(5, offscreenManager);

    await initPageCreationDatesWithRetry(5, offscreenManager);

    console.log('Startup init completed');
}

const waitForStartupInit = async () => {
    while (await getStartupInit() !== true) {
        console.log('Waiting for startup to be initialized...');
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

const init = async () => {
    await waitForStartupInit();

    console.log('Init');

    setExtentionStatus(10);

    await initOffscreen();
    const offscreenManager = new OffscreenManager();

    const queue = new StorageActionsQueue();

    await initMessageListener({ offscreenManager, queue });

    const appIDs = await getAppIDs(false);
    if (appIDs.length === 0) {
        console.error('No appIDs found.');
        return;
    }

    console.log("AppIDs: ", appIDs);

    await initStorageForAppIDs(appIDs);

    console.log("Extension service initiated");

    startUpdatingStats(appIDs, { queue, offscreenManager });
}

init().catch(error => {
    console.error('Error while initializing extension service: ', error);
    setExtentionStatus(100, { error: error.message });
});
