importScripts('../data/defaultsettings.js');
importScripts('../scripts/helpers.js');
importScripts('bghelpers.js');
importScripts('storage/storage.js');
importScripts('storage/storagequeue.js');
importScripts('storage/storage_reviews.js');
importScripts('storage/storage_sales.js');
importScripts('storage/storage_traffic.js');
importScripts('storage/storage_wishlists.js');
importScripts('statsupdater.js');

chrome.runtime.onInstalled.addListener(async () => {
  chrome.storage.local.get(Object.keys(defaultSettings), (storedSettings) => {
    const settingsToStore = {};

    for (const key in defaultSettings) {
      if (storedSettings[key] === undefined) {
        settingsToStore[key] = defaultSettings[key];
      }
    }

    if (Object.keys(settingsToStore).length > 0) {
      chrome.storage.local.set(settingsToStore, () => {
        console.log('Steamworks extras: Default settings have been initialized.');
      });
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.debug(`Steamworks extras: Background message: `, message);

  (async () => {
    switch (message.request) {
      case "showOptions":
        showOptions();
        sendResponse();
        return;
      case "makeRequest": {
        const response = await makeRequest(message.url, message.params);
        sendResponse(response);
        return;
      }
      case "getAppIDs": {
        const response = await getAppIDs();
        sendResponse(response);
        return;
      }
      case "getPackageIDs": {
        let result = await chrome.storage.local.get("packageIDs");

        sendResponse(result.packageIDs);
        return;
      }
      case "getPageCreationDates": {
        let result = await chrome.storage.local.get("pagesCreationDate");

        sendResponse(result);
        return;
      }
      case "getData": {
        const data = await getDataFromDB(message.type, message.appId, message.dateStart, message.dateEnd, message.returnLackData);
        console.debug(`Steamworks extras: returning "${message.type}" data from background: `, data);
        sendResponse(data);
        return;
      }
    }
  })();
  return true;
});

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (!sender.url.includes("localhost") && !sender.url.includes("127.0.0.1")) {
    sendResponse({ error: "Unauthorized external message request" });
    return;
  }

  console.debug(`Steamworks extras: External message: `, message);

  (async () => {
    switch (message.request) {
      case "getData": {
        sendResponse(await getDataFromDB(message.type, message.appId, message.dateStart, message.dateEnd));
      }
    }
  })();
});

const showOptions = () => {
  console.log('Steamworks extras: Show options')
  chrome.runtime.openOptionsPage();
}

const getDataFromDB = async (type, appId, dateStart, dateEnd, returnLackData = true) => {

  const startDate = dateStart ? new Date(dateStart) : undefined;
  const endDate = dateEnd ? new Date(dateEnd) : undefined;

  switch (type) {
    case "Traffic": {
      return await getTrafficData(appId, startDate, endDate, returnLackData);
    }
    case "Sales": {
      return await getSalesData(appId, startDate, endDate, returnLackData);
    }
    case "Reviews": {
      return await getReviewsData(appId, startDate, endDate, returnLackData);
    }
    case "Wishlists": {
      return await getWishlistData(appId, startDate, endDate, returnLackData);
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
  console.log('Steamworks extras: Parsing PackageIDs for appID: ', appID);

  let result = await chrome.storage.local.get("packageIDs");

  let packageIDs = result.packageIDs === undefined ? {} : result.packageIDs;

  const IDs = await helpers.getPackageIDs(appID, false);
  console.debug('Steamworks extras: Package IDs for app ', appID, ': ', IDs);

  if (IDs === undefined || !Array.isArray(IDs)) {
    console.error(`Steamworks extras: Could not parse package IDs for app ${appID}`);
    return undefined;
  }

  packageIDs[appID] = IDs;

  await chrome.storage.local.set({ packageIDs: packageIDs });

  console.log(`Steamworks extras: Package IDs have been updated for app ${appID}: `, packageIDs);

  return packageIDs;
}

const getPackageIDs = async (appID) => {
  let result = await chrome.storage.local.get("packageIDs");

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
  console.log('Steamworks extras: Parsing AppIDs');

  const appIDs = await helpers.parseDataFromPage('https://partner.steampowered.com/nav_games.php', 'parseAppIDs');

  await chrome.storage.local.set({ appIDs: appIDs });

  console.log('Steamworks extras: AppIDs: ', appIDs);

  return appIDs;
}

const getAppIDs = async () => {
  let result = await chrome.storage.local.get("appIDs");

  console.log(result);

  let appIDs = undefined;

  if (result === undefined
    || result.appIDs === undefined
    || result.appIDs.length === 0) {
    appIDs = await parseAppIDs()
  }
  else {
    appIDs = result.appIDs;
  }

  return appIDs;
}

const parsePageCreationDate = async (appID) => {
  console.log('Steamworks extras: Parsing page creation date for appID: ', appID);

  let result = await chrome.storage.local.get("pagesCreationDate");
  let pagesCreationDate = result.pagesCreationDate || {};

  const date = await helpers.requestPageCreationDate(appID);

  if (date === undefined || !(date instanceof Date)) return undefined;

  pagesCreationDate[appID] = date.toISOString();

  await chrome.storage.local.set({ 'pagesCreationDate': pagesCreationDate });

  console.log(`Steamworks extras: Page creation date for ${appID}: `, date);

  return date;
}

const getPageCreationDate = async (appID) => {
  let result = await chrome.storage.local.get("pagesCreationDate");

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
  console.log('Steamworks extras: Init AppIDs and PackageIDs');

  const appIDs = await getAppIDs();
  if (appIDs === undefined) {
    console.error('Steamworks extras: No appIDs found');
    return;
  }

  let packageIDs = {};
  for (const appID of appIDs) {
    const IDs = await getPackageIDs(appID);

    packageIDs[appID] = IDs;
  }

  console.log('Steamworks extras: AppIDs and PackageIDs have been initialized.', appIDs, packageIDs);
}

const init = async () => {
  console.log('Steamworks extras: Init');

  await initIDs();

  const appIDs = await getAppIDs();
  if (appIDs.length === 0) {
    console.error('Steamworks extras: No appIDs found');
    return;
  }

  for (const appID of appIDs) {
    await getPageCreationDate(appID);
  }

  startUpdatingStats(appIDs);

  console.log("Steamworks extras: Extension service initiated");
}

init();
