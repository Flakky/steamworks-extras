if (typeof browser == "undefined") {
  // Chrome does not support the browser namespace yet.
  globalThis.browser = chrome;

  console.log('Importing scripts');

  importScripts('../data/defaultsettings.js');
  importScripts('../shared/log.js');
  importScripts('../scripts/helpers.js');
  importScripts('offscreen/offscreenmanager.js');
  importScripts('../scripts/parser.js');
  importScripts('bghelpers.js');
  importScripts('status.js');
  importScripts('storage/storage.js');
  importScripts('storage/storagequeue.js');
  importScripts('storage/storage_reviews.js');
  importScripts('storage/storage_sales.js');
  importScripts('storage/storage_traffic.js');
  importScripts('storage/storage_wishlists.js');
  importScripts('storage/storage_wishlistconversions.js');
  importScripts('statsupdater.js');
}

getBrowser().runtime.onInstalled.addListener(async () => {
  getBrowser().storage.local.get(Object.keys(defaultSettings), (storedSettings) => {
    const settingsToStore = {};

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

getBrowser().runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.debug(`Background message: `, message);

  switch (message.request) {
    case "showOptions":
      {
        (async () => {
          showOptions();
          sendResponse();
        })(); break;
      };
    case "makeRequest":
      {
        (async () => {
          const response = await makeRequest(message.url, message.params);
          sendResponse(response);
        })(); break;
      };
    case "getAppIDs":
      {
        (async () => {
          const response = await getAppIDs();
          sendResponse(response);
        })(); break;
      };
    case "getPackageIDs":
      {
        (async () => {
          let result = await getBrowser().storage.local.get("packageIDs");

          sendResponse(result.packageIDs);
        })(); break;
      };
    case "getPageCreationDates":
      {
        (async () => {
          let result = await getBrowser().storage.local.get("pagesCreationDate");

          sendResponse(result);
        })(); break;
      };
    case "getQueueLenght":
      {
        (async () => {
          const length = await getQueueLength();
          sendResponse(length);
        })(); break;
      };
    case "getStatus":
      {
        (async () => {
          console.log('Get status');
          const status = await getStatus();
          sendResponse(status);
        })(); break;
      };
    case "getData":
      {
        (async () => {
          const data = await getDataFromDB(message.type, message.appId, message.dateStart, message.dateEnd, message.returnLackData);
          console.debug(`returning "${message.type}" data from background: `, data);
          sendResponse(data);
        })(); break;
      };
    case "parseDOM":
      {
        (async () => {
          const data = message.htmlText ? await parseDOM(message.htmlText, message.type) : await bghelpers.parseDataFromPage(message.url, message.type);
          console.debug(`returning DOM parsed "${message.type}" data from background: `, data);
          sendResponse(data);
        })(); break;
      };
    case "parsedDOM":
      {
        processParsedDOM(message);
        break;
      }
    case "updateStats":
      {
        (async () => {
          console.log('Update stats');
          const appIDs = await getAppIDs();
          updateStats(appIDs);
          updateStatsStatus();
          return appIDs;
        })(); break;
      };
    default:
      {
        console.debug(`Unknown request "${message.request}" from background`);
        sendResponse({ error: "Unknown request" });
        return false;
      }
  }
  return true;
});

getBrowser().runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (!sender.url.includes("localhost") && !sender.url.includes("127.0.0.1")) {
    sendResponse({ error: "Unauthorized external message request" });
    return;
  }

  console.debug(`External message: `, message);

  (async () => {
    switch (message.request) {
      case "getData": {
        sendResponse(await getDataFromDB(message.type, message.appId, message.dateStart, message.dateEnd));
      }
    }
  })();
});

const showOptions = () => {
  console.log('Show options')
  getBrowser().runtime.openOptionsPage();
}

const getStatus = () => {
  return extensionStatus;
}

const getDataFromDB = async (type, appId, dateStart, dateEnd, returnLackData = true) => {

  const startDate = dateStart ? new Date(dateStart) : undefined;
  const endDate = dateEnd ? new Date(dateEnd) : undefined;

  switch (type) {
    case "Traffic": {
      const action = new StorageActionGetTraffic(appId, startDate, endDate, returnLackData);
      const result = await action.addAndWait(true);
      console.debug(result);
      return result;
    }
    case "Sales": {
      const action = new StorageActionGetSales(appId, startDate, endDate, returnLackData);
      const result = await action.addAndWait(true);
      console.debug(result);
      return result;
    }
    case "Reviews": {
      const action = new StorageActionGetReviews(appId, startDate, endDate, returnLackData);
      const result = await action.addAndWait(true);
      console.debug(result);
      return result;
    }
    case "Wishlists": {
      const action = new StorageActionGetWishlists(appId, startDate, endDate, returnLackData);
      const result = await action.addAndWait(true);
      console.debug(result);
      return result;
    }
    case "WishlistConversions": {
      const action = new StorageActionGetWishlistConversions(appId, startDate, endDate, returnLackData);
      const result = await action.addAndWait(true);
      console.debug(result);
      return result;
    }
  }
}

const makeRequest = async (url, params) => {
  console.debug(`Make request to ${url}`);

  const response = await fetch(url, params);
  if (!response.ok) throw new Error('Network response was not ok');

  console.log(response);

  const responseText = await response.text();

  console.log(responseText);

  return responseText;
}

const parsePackageIDs = async (appID) => {
  console.log('Parsing PackageIDs for appID: ', appID);

  let result = await getBrowser().storage.local.get("packageIDs");

  let packageIDs = result.packageIDs === undefined ? {} : result.packageIDs;

  const IDs = await bghelpers.getPackageIDs(appID, false);
  console.debug('Package IDs for app ', appID, ': ', IDs);

  if (IDs === undefined || !Array.isArray(IDs)) {
    console.error(`Could not parse package IDs for app ${appID}`);
    return undefined;
  }

  packageIDs[appID] = IDs;

  await getBrowser().storage.local.set({ packageIDs: packageIDs });

  console.log(`Package IDs have been updated for app ${appID}: `, packageIDs);

  return packageIDs;
}

const getPackageIDs = async (appID) => {
  let result = await getBrowser().storage.local.get("packageIDs");

  let packageIDs = undefined;
  if (result === undefined
    || result.packageIDs === undefined
    || result.packageIDs[appID] === undefined) {
    packageIDs = await parsePackageIDs(appID)
  }
  else {
    packageIDs = result.packageIDs[appID];
  }

  return packageIDs;
}

const parseAppIDs = async () => {
  console.log('Parsing AppIDs');

  const appIDs = await bghelpers.parseDataFromPage('https://partner.steampowered.com/nav_games.php', 'parseAppIDs');

  console.log('AppIDs: ', appIDs);

  const nonRedirectedAppIDs = [];

  for (const appID of appIDs) {
    try {
      const response = await fetch(`https://store.steampowered.com/app/${appID}`, { redirect: 'manual' });

      console.log(`Checking appID ${appID} for redirection: `, response.status);

      if (response.status === 200) {
        nonRedirectedAppIDs.push(appID);
      }
    } catch (error) {
      console.error(`Error fetching appID ${appID}:`, error);
    }
  }

  console.debug('Non-redirected AppIDs:', nonRedirectedAppIDs);

  let currentAppIDs = await getBrowser().storage.local.get("appIDs");

  currentAppIDs = currentAppIDs.appIDs || [];
  const mergedAppIDs = [...new Set([...currentAppIDs, ...nonRedirectedAppIDs])];


  await getBrowser().storage.local.set({ appIDs: mergedAppIDs });

  console.log('AppIDs: ', mergedAppIDs);

  return mergedAppIDs;
}

const getAppIDs = async () => {
  console.log('Getting AppIDs');

  let result = await getBrowser().storage.local.get("appIDs");

  console.log('AppIDs: ', result);

  let appIDs = undefined;

  if (result === undefined
    || result.appIDs === undefined
    || result.appIDs.length === 0) {
    appIDs = await parseAppIDs()
  }
  else {
    appIDs = result.appIDs;
  }

  const ignoredResult = await getBrowser().storage.local.get("ignoredAppIDs");
  const ignoredAppIDs = ignoredResult.ignoredAppIDs || [];

  if (ignoredAppIDs.length > 0) {
    appIDs = appIDs.filter(appID => !ignoredAppIDs.includes(appID));
    console.log('Filtered AppIDs (removed ignored): ', appIDs);
  }

  return appIDs;
}

const parsePageCreationDate = async (appID) => {
  console.log('Parsing page creation date for appID: ', appID);

  let result = await getBrowser().storage.local.get("pagesCreationDate");
  let pagesCreationDate = result.pagesCreationDate || {};

  const url = `https://partner.steamgames.com/apps/navtrafficstats/${appID}?attribution_filter=all&preset_date_range=lifetime`;
  const pageCreationDate = await bghelpers.parseDataFromPage(url, 'parsePageCreationDate');
  const date = new Date(pageCreationDate);

  if (date === undefined || !(date instanceof Date)) return undefined;

  console.log(`Page creation date for ${appID}: `, date);

  pagesCreationDate[appID] = date.toISOString();

  await getBrowser().storage.local.set({ 'pagesCreationDate': pagesCreationDate });

  console.log(`Page creation date for ${appID}: `, date);

  return date;
}

const getPageCreationDate = async (appID) => {
  let result = await getBrowser().storage.local.get("pagesCreationDate");

  console.log(result);

  let creationDate = undefined;

  if (result === undefined
    || result.pagesCreationDate === undefined
    || result.pagesCreationDate[appID] === undefined) {
    creationDate = await parsePageCreationDate(appID);
  }
  else {
    creationDate = result.pagesCreationDate[appID];
  }

  return creationDate;
}

const initIDs = async () => {
  console.log('Init AppIDs and PackageIDs');

  const appIDs = await parseAppIDs();
  if (!Array.isArray(appIDs) || appIDs.length === 0) {
    console.error('No appIDs found');
    return false;
  }

  // Get filtered appIDs (excluding ignored ones) for package ID initialization
  const filteredAppIDs = await getAppIDs();

  let packageIDs = {};
  for (const appID of filteredAppIDs) {
    const IDs = await getPackageIDs(appID);

    packageIDs[appID] = IDs;
  }

  console.log('AppIDs and PackageIDs have been initialized.', filteredAppIDs, packageIDs);
  return true;
}

const initIDsWithRetry = async (interval = 5) => {
  let success = false;
  while (!success) {
    try {
      success = await initIDs();
    } catch (error) {
      console.error('Error during initIDs:', error);
    }
    if (!success) {
      console.log(`Retry initializing in ${interval} seconds...`);
      setExtentionStatus(101);
      await new Promise(resolve => setTimeout(resolve, interval * 1000));
    }
  }
}

const initPageCreationDates = async () => {
  console.log('Init PageCreationDates');

  const appIDs = await getAppIDs();
  if (appIDs.length === 0) {
    console.error('No appIDs found.');
    return;
  }

  for (const appID of appIDs) {
    await getPageCreationDate(appID);
  }

  console.log('PageCreationDates have been initialized.');
}

const initPageCreationDatesWithRetry = async (interval = 5) => {
  let success = false;
  while (!success) {
    try {
      await initPageCreationDates();
      success = true;
    } catch (error) {
      console.error('Error during initPageCreationDates:', error);
      setExtentionStatus(102, { error: error.message });
      await new Promise(resolve => setTimeout(resolve, interval * 1000));
    }
  }
}

const init = async () => {
  console.log('Init');

  setExtentionStatus(10);

  await initOffscreen();

  await initIDsWithRetry();

  const appIDs = await getAppIDs();
  if (appIDs.length === 0) {
    console.error('No appIDs found.');
    return;
  }

  await initPageCreationDatesWithRetry();

  await initStorageForAppIDs(appIDs);

  startUpdatingStats(appIDs);

  console.log("Extension service initiated");
}

init().catch(error => {
  console.error('Error while initializing extension service: ', error);
  setExtentionStatus(100, { error: error.message });
});
