import { getBrowser } from '../shared/browser';
import { defaultSettings } from '../data/defaultsettings';
import { extensionStatus, setExtentionStatus } from './status';
import { OffscreenManager, initOffscreen } from './offscreen/offscreenmanager';
import { initIDsWithRetry, initPageCreationDatesWithRetry } from './gameids';
import { StorageActionsQueue } from './storage/storagequeue';
import { initStorageForAppIDs } from './storage/db';
import { startUpdatingStats } from './statsupdater';
import { initMessageListener } from './messagelistener';
import { getAppIDs } from './bghelpers';

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

getBrowser().runtime.onInstalled.addListener(async () => {
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
});

const init = async () => {
  console.log('Init');

  setExtentionStatus(10);

  await initOffscreen();
  const offscreenManager = new OffscreenManager();

  const queue = new StorageActionsQueue();

  await initMessageListener({ offscreenManager, queue });

  await initIDsWithRetry(5, offscreenManager);

  const appIDs = await getAppIDs(false);
  if (appIDs.length === 0) {
    console.error('No appIDs found.');
    return;
  }

  console.log("AppIDs: ", appIDs);

  await initPageCreationDatesWithRetry(5, offscreenManager);

  await initStorageForAppIDs(appIDs);

  console.log("Extension service initiated");

  startUpdatingStats(appIDs, { queue, offscreenManager });
}

init().catch(error => {
  console.error('Error while initializing extension service: ', error);
  setExtentionStatus(100, { error: error.message });
});
