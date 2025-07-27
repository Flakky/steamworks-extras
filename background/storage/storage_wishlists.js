class StorageActionRequestWishlists extends StorageAction {
  constructor(appID) {
    super();
    this.appID = appID;
  }

  async process() {
    await requestAllWishlistData(this.appID);
  }

  getType() {
    return 'RequestWishlists';
  }
}

class StorageActionRequestRegionalWishlists extends StorageAction {
  constructor(appID, date) {
    super();
    this.appID = appID;
    this.date = date;
  }

  async process() {
    await requestWishlistRegionalData(this.appID, this.date);
  }

  getType() {
    return 'RequestRegionalWishlists';
  }
}

class StorageActionGetWishlists extends StorageAction {
  constructor(appID, dateStart, dateEnd, returnLackData) {
    super();
    this.appID = appID;
    this.dateStart = dateStart;
    this.dateEnd = dateEnd;
    this.returnLackData = returnLackData;
    this.executeTimeout = 10;
  }

  async process() {
    return await getWishlistData(this.appID, this.dateStart, this.dateEnd, this.returnLackData);
  }

  getType() {
    return 'GetWishlists';
  }
}

const getWishlistData = async (appID, dateStart, dateEnd, returnLackData) => {
  await waitForDatabaseReady();

  let records = await readData(appID, 'Wishlists');

  if (!returnLackData) {
    let datesNoData = helpers.getDateRangeArray(dateStart, dateEnd, false, true);

    for (const record of records) {
      datesNoData = datesNoData.filter(item => item !== record['Date']);
    }

    if (datesNoData.length > 0) return null;
  }

  const out = records.filter(item => {
    const date = new Date(item['Date']);
    return helpers.isDateInRange(date, dateStart, dateEnd);
  });

  return out;
}

const requestAllWishlistData = async (appID) => {
  console.debug(`Requesting all wishlist data for app ${appID}`);

  const pageCreationDate = await bghelpers.getPageCreationDate(appID);

  const startDate = pageCreationDate;
  const endDate = new Date();

  const formattedStartDate = helpers.dateToString(startDate);
  const formattedEndDate = helpers.dateToString(endDate);

  const URL = `https://partner.steampowered.com/report_csv.php`;

  const reqHeaders = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  let params = `query=QueryWishlistActionsForCSV^appID=${appID}^dateStart=${formattedStartDate}^dateEnd=${formattedEndDate}^interpreter=WishlistReportInterpreter`;

  const data = new URLSearchParams();
  data.append('file', 'WishlistData');
  data.append('params', params);

  const response = await fetch(URL, { method: 'POST', headers: reqHeaders, body: data.toString(), credentials: 'include' });
  if (!response.ok) throw new Error('Network response was not ok');

  const htmlText = await response.text();

  console.log(htmlText);

  if (htmlText === undefined || htmlText === '') {
    throw new Error(`Received no response instead of CSV while requesting wishlist data`);
  }

  if (htmlText.includes('<html')) {
    throw new Error('Received HTML response instead of CSV while requesting wishlist data');
  }

  let lines = htmlText.split('\n');

  lines.splice(0, 3); // Remove first 3 rows because they are not informative and break csv format

  // Ensure that we have lines to process
  if (lines.length === 0) {
    console.debug(`No wishlists data found in CSV`);
    return;
  }

  const csvString = lines.join('\n');

  lines = helpers.csvTextToArray(csvString);

  const headers = lines[0].map(header => header.trim());

  console.debug(lines);

  // Map each line to an object using the headers as keys
  let wishlistActions = lines.slice(1).map(line => {
    return {
      'Date': line[headers.indexOf('DateLocal')],
      'Adds': line[headers.indexOf('Adds')],
      'Deletes': line[headers.indexOf('Deletes')],
      'Gifts': line[headers.indexOf('Gifts')],
      'Activations': line[headers.indexOf('PurchasesAndActivations')]
    };
  });

  await mergeData(appID, 'Wishlists', wishlistActions);
}

const requestWishlistRegionalData = async (appID, date) => {
  const pageCreationDate = await bghelpers.getPageCreationDate(appID);

  if (date < pageCreationDate) {
    console.error(`Cannot request wishlist data for date ${date} because it is before page creation date`);
  }

  const formattedDate = helpers.dateToString(date);

  let url = `https://partner.steampowered.com/region/`;
  const params = {
    appID: appID,
    unitType: 'wishlist',
    dateStart: formattedDate,
    dateEnd: formattedDate
  }

  const queryString = new URLSearchParams(params).toString();
  url += `?${queryString}`;

  const data = await bghelpers.parseDataFromPage(url, 'parseWishlistData');

  if (typeof data !== 'object' || Object.keys(data).length === 0) {
    console.debug(`No wishlist data found for date ${formattedDate}. Writing empty data`);

    // Make sure empty dates also get saved with 'World' so we do not request it again

    const dataToWrite = { 'Date': formattedDate, 'World': 0 };

    await mergeData(appID, 'Wishlists', dataToWrite);

    return dataToWrite;
  }

  const formattedData = Object.keys(data).reduce((acc, country) => {
    let value = data[country];
    if (typeof value === 'string' && value.startsWith('(') && value.endsWith(')')) {
      value = -parseInt(value.slice(1, -1));
    } else {
      value = parseInt(value) || 0;
    }
    acc[country] = value;
    return acc;
  }, {});

  console.debug(`Wishlist result for app ${appID} for date ${formattedDate}: `, formattedData);

  formattedData['Date'] = helpers.dateToString(date);

  await mergeData(appID, 'Wishlists', formattedData);

  return formattedData;
}
