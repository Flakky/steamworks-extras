let bghelpers = {}

/**
 * Returns the page creation date of a given appID.
 *
 * @param {string} appID - AppID of the game
 * @param {boolean} stringify - [Optional] If true, the date will be returned as a string
 * @returns {Date} - Page creation date
 */
bghelpers.getPageCreationDate = async (appID, stringify) => {
  const pagesCreationDate = await getBrowser().storage.local.get("pagesCreationDate");
  const pageCreationDate = new Date(pagesCreationDate.pagesCreationDate[appID]) || new Date(2014, 0, 0);

  if (stringify) return helpers.dateToString(pageCreationDate);

  return pageCreationDate;
}

/**
 * Returns the package IDs of a given appID.
 *
 * @param {string} appID - AppID of the game
 * @returns {Array} - Package IDs
 */
bghelpers.getAppPackageIDs = async (appID) => {
  const PackageIDsResult = await getBrowser().storage.local.get("packageIDs");
  const packageIDs = PackageIDsResult.packageIDs[appID] || [];

  return packageIDs;
}

/**
 * Returns the package IDs of a given appID.
 *
 * @param {string} appID - AppID of the game
 * @returns {Array} - Package IDs
 */
bghelpers.getPackageIDs = async (appID) => {
  const url = `https://store.steampowered.com/api/appdetails?appids=${appID}`;

  console.log(`Fetching package IDs from URL: ${url}`);

  const response = await fetch(url);
  if (!response.ok) throw new Error('Network response was not ok');

  const data = await response.json();
  const appData = data[appID];

  if(!appData || !appData.success || !appData.data || !appData.data.packages){
    throw new Error('Package IDs request returned no data');
  }

  return appData.data.packages;
}

/**
 * Parses data from a given URL.
 *
 * @param {string} url - URL to parse data from
 * @param {string} request - Request type. Must be a valid request type for the parser.parseDocument.
 * @returns {Promise} - Promise with the parsed data
 */
bghelpers.parseDataFromPage = async (url, request) => {
  console.debug(`Getting data "${request}" from URL: ${url}`);

  const response = await fetch(url);

  if (!response.ok) throw new Error('Network response was not ok');

  const htmlText = await response.text();

  const parsedData = await parseDOM(htmlText, request);

  console.debug(`Data result from parsing for "${request}": `, parsedData);

  return parsedData;
}
