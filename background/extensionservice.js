importScripts('../data/defaultsettings.js');
importScripts('../scripts/helpers.js');
importScripts('../scripts/gamestatsstorage.js');
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
  console.log(`Steamworks extras: Background message: `, message);

  (async () => {
    switch (message.request) {
      case "showOptions":
        showOptions();
        sendResponse();
        return;
      case "makeRequest": {
        const response = await makeRequest(message.url, message.params);
        console.log('RESP');
        sendResponse(response);
        return;
      }
      case "getData": {
        const data = await getDataFromDB(message.type, message.appId, message.dateStart, message.dateEnd);
        console.log(`Steamworks extras: returning "${message.type}" data from background: `, data);
        sendResponse(data);
        return;
      }
    }
  })();
  return true;
});

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log(`Steamworks extras: External message: `, message);

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

const getDataFromDB = async (type, appId, dateStart, dateEnd) => {

  const startDate = dateStart ? new Date(dateStart) : undefined;
  const endDate = dateEnd ? new Date(dateEnd) : undefined;

  switch (type) {
    case "Traffic": {
      return await getTrafficData(appId, startDate, endDate);
    }
    case "Sales": {
      return await getSalesData(appId, startDate, endDate);
    }
    case "Reviews": {
      return await getReviewsData(appId, startDate, endDate);
    }
    case "Wishlists": {
      return await getWishlistData(appId, startDate, endDate);
    }
  }
}

const makeRequest = async (url, params) => {
  console.log(`Make request to ${url}`);

  const response = await fetch(url, params);
  if (!response.ok) throw new Error('Network response was not ok');

  console.log(response);

  const responseText = await response.text();

  console.log(responseText);

  return responseText;
}

const init = async () => {
  console.log('Steamworks extras: Init');

  await updateStats();
  console.log("Steamworks extras: Extension service initiated");
}

init();
