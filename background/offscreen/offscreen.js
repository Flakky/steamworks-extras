chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  let result = undefined;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(message.htmlText, 'text/html');

    if (message.action === 'parsePackageID') {
      result = parsePackageIDs(doc);
    }
  }
  catch (error) {
    result = error.toString();
  }

  chrome.runtime.sendMessage({ action: 'parsedDOM', result: result });
});

const parsePackageIDs = (doc) => {
  const table = doc.querySelector('.appLandingStorePackagesCtn');
  if (!table) {
    throw new Error('No table found');
  }

  const packageIDs = [];
  const rows = table.querySelectorAll('.tr');

  if (rows.length === 0) {
    throw new Error('No rows found');
  }

  rows.forEach(row => {
    const link = row.querySelector('a[href^="https://partner.steamgames.com/store/packagelanding/"]');
    if (link) {
      const urlParts = link.href.split('/');
      const packageID = urlParts[urlParts.length - 1];
      packageIDs.push(packageID);
    }
  });

  return packageIDs;
}
