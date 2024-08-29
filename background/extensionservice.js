chrome.runtime.onMessage.addListener((request) => {
  console.log(request);
  if (request === "showOptions") {
    console.log('Steamworks extras: Show options')
    chrome.runtime.openOptionsPage();
  }

});

console.log("Steamworks extras: Extension service initiated");
