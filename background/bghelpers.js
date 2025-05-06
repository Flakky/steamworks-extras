let bghelpers = {}

bghelpers.getPageCreationDate = async (appID, stringify) => {
  const pagesCreationDate = await chrome.storage.local.get("pagesCreationDate");
  const pageCreationDate = new Date(pagesCreationDate.pagesCreationDate[appID]) || new Date(2014, 0, 0);

  if (stringify) return helpers.dateToString(pageCreationDate);

  return pageCreationDate;
}

bghelpers.getAppPackageIDs = async (appID) => {
  const PackageIDsResult = await chrome.storage.local.get("packageIDs");
  const packageIDs = PackageIDsResult.packageIDs[appID] || [];

  return packageIDs;
}

bghelpers.parseDataFromPage = async (url, request) => {
  console.debug(`Getting data "${request}" from URL: ${url}`);

  const response = await fetch(url);

  if (!response.ok) throw new Error('Network response was not ok');

  const htmlText = await response.text();

  const parsedData = await parseDOM(htmlText, request);

  console.debug(`Steamworks extras: Data result from parsing for "${request}": `, parsedData);

  return parsedData;
}

bghelpers.getPackageIDs = async (appID, useBackgroundScript) => {
  const url = `https://partner.steamgames.com/apps/landing/${appID}`;

  console.log(`Fetching package IDs from URL: ${url}`);

  let htmlText;
  if (useBackgroundScript) {
    htmlText = await helpers.sendMessageAsync({ request: 'makeRequest', url: url });
  } else {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    htmlText = await response.text();
  }

  const packageIDs = await parseDOM(htmlText, 'parsePackageID');

  return packageIDs;
}
