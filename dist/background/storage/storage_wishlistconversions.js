class StorageActionRequestWishlistConversions extends StorageAction {
  constructor(appID, settings = new StorageActionSettings()) {
    super(settings);
    this.appID = appID;
  }

  async process() {
    return await requestWishlistConversionsData(this.appID);
  }

  getType() {
    return 'RequestWishlistConversions';
  }
}

class StorageActionGetWishlistConversions extends StorageAction {
  constructor(appID, dateStart, dateEnd, returnLackData, settings = new StorageActionSettings()) {
    super(settings);
    this.appID = appID;
    this.dateStart = dateStart;
    this.dateEnd = dateEnd;
    this.returnLackData = returnLackData;
  }

  async process() {
    return await getWishlistConversionsData(this.appID, this.dateStart, this.dateEnd, this.returnLackData);
  }

  getType() {
    return 'GetWishlistConversions';
  }
}

const requestWishlistConversionsData = async (appID) => {
  const pageCreationDate = await bghelpers.getPageCreationDate(appID);

  const startDate = pageCreationDate;
  const endDate = new Date();

  const formattedStartDate = helpers.dateToString(startDate);
  const formattedEndDate = helpers.dateToString(endDate);

  console.debug(`Request wishlist conversions in CSV between ${formattedStartDate} and ${formattedEndDate}`);

  const URL = `https://partner.steampowered.com/report_csv.php?file=SteamWishlistCohorts_${appID}_${formattedStartDate}_to_${formattedEndDate}&params=query=QueryWishlistCohortForCSV^appID=${appID}^dateStart=${formattedStartDate}^dateEnd=${formattedEndDate}^interpreter=WishlistCohortReportInterpreter`;

  const reqHeaders = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const response = await fetch(URL, { method: 'GET', headers: reqHeaders, credentials: 'include' });
  if (!response.ok) throw new Error('Network response was not ok');

  const htmlText = await response.text();

  if (htmlText === undefined || htmlText === '') {
    throw new Error(`Received no response instead of CSV while requesting wishlist conversions data`);
  }

  if (htmlText.includes('<html')) {
    throw new Error('Received HTML response instead of CSV while requesting wishlist conversions data');
  }

  let lines = htmlText.split('\n');

  lines.splice(0, 3); // Remove first 3 rows because they are not informative and break csv format

  // Ensure that we have lines to process
  if (lines.length === 0) {
    console.warn(`No wishlist conversions data found in CSV`);
    return [];
  }

  await clearData(appID, 'WishlistConversions');

  const csvString = lines.join('\n');

  lines = helpers.csvTextToArray(csvString);

  const headers = lines[0].map(header => header.trim());

  // Map each line to an object using the headers as keys
  let index = 0;
  const result = lines.slice(1).map(line => {
    const object = {};

    line.forEach((element, index) => {
      if(headers[index] === 'DateLocal') {
        object['Date'] = element;
      }
      else object[headers[index]] = element;
    });

    object.key = index++;

    return object;
  });

  // Remove every invalid record
  const filteredResult = result.filter(record => record['Date'] && record['MonthCohort']);
  result.length = 0;
  result.push(...filteredResult);

  console.debug(`Wishlist conversions CSV result:`, result);

  await writeData(appID, 'WishlistConversions', result);

  return result;
}

const getAllWishlistConversionsData = async (appID) => {
  await waitForDatabaseReady();
  let records = await readData(appID, 'WishlistConversions');

  if (records.length === 0) {
    console.debug(`No wishlist conversions data found in DB. Requesting from server...`);
    await requestWishlistConversionsData(appID);
    records = await readData(appID, 'WishlistConversions');
  }

  return records;
}

const getWishlistConversionsData = async (appID, dateStart, dateEnd, returnLackData) => {
  await waitForDatabaseReady();

  let records = await readData(appID, 'WishlistConversions');

  if (dateStart && dateEnd) {
    const filteredRecords = records.filter(item => {
      let date = new Date(item['Date']);
      return helpers.isDateInRange(date, dateStart, dateEnd);
    });

    if (!returnLackData) {
      const dateRange = helpers.getDateRangeArray(dateStart, dateEnd, false, true);
      const datesWithData = [...new Set(filteredRecords.map(record => record['Date']))];

      const allDatesHaveData = dateRange.every(date => datesWithData.includes(date));

      return allDatesHaveData ? filteredRecords : null;
    }

    return filteredRecords;
  }
  else {
    return records;
  }
}
