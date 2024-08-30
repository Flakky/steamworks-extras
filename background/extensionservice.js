importScripts('../data/defaultsettings.js');

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

chrome.runtime.onMessage.addListener((request) => {
  console.log(request);
  if (request === "showOptions") {
    console.log('Steamworks extras: Show options')
    chrome.runtime.openOptionsPage();
  }

});

console.log("Steamworks extras: Extension service initiated");
