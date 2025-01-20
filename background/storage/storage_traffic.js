class StorageActionRequestTraffic extends StorageAction {
  constructor(appID, date) {
    super();
    this.appID = appID;
    this.date = date;
  }

  async process() {
    await requestTrafficData(this.appID, this.date);
  }

  getType() {
    return 'RequestTraffic';
  }
}

class StorageActionGetTraffic extends StorageAction {
  constructor(appID, dateStart, dateEnd, returnLackData) {
    super();
    this.appID = appID;
    this.dateStart = dateStart;
    this.dateEnd = dateEnd;
    this.returnLackData = returnLackData;
    this.executeTimeout = 10;
  }

  async process() {
    return await getTrafficData(this.appID, this.dateStart, this.dateEnd, this.returnLackData);
  }

  getType() {
    return 'GetTraffic';
  }
}

const requestAllTrafficData = async (appID) => {
  console.log(`Steamworks extras: Requesting all traffic data for app ${appID}`);

  let records = await readData(appID, 'Traffic');

  const cachedDates = [...new Set(records.map(record => record['Date']))];

  const pageCreationDate = await bghelpers.getPageCreationDate(appID);

  console.log(`Steamworks extras: Cached traffic dates:`, cachedDates)

  let date = new Date();
  date.setDate(date.getDate() - 1);
  while (true) {

    if (date < pageCreationDate) {
      console.log(`Steamworks extras: Stop receiving traffic data because we reached page creation date`);
      return;
    }

    if (date.getDate() < new Date() - 2 // We want to refresh first several days because new data may be available
      && cachedDates.includes(helpers.dateToString(date))) {

      date.setDate(date.getDate() - 1);
      continue;
    }

    const hasData = await requestTrafficData(appID, date);

    if (!hasData) return;

    date.setDate(date.getDate() - 1);
  }
}

const getTrafficData = async (appID, dateStart, dateEnd, returnLackData) => {
  await waitForDatabaseReady();

  // TODO: Optimize reading data only for range from DB
  // TODO: Optimize finding dates with no data

  let records = await readData(appID, 'Traffic');

  const out = records.filter(item => {
    const date = new Date(item['Date']);

    return helpers.isDateInRange(date, dateStart, dateEnd);
  });

  return out;
}

const requestTrafficData = async (appID, date) => {
  const pageCreationDate = await bghelpers.getPageCreationDate(appID);

  if (date < pageCreationDate) {
    console.error(`Steamworks extras: Cannot request traffic data for date ${date} because it is before page creation date`);
    return;
  }

  const formattedDate = helpers.dateToString(date);


  const URL = `https://partner.steamgames.com/apps/navtrafficstats/${appID}?attribution_filter=all&preset_date_range=custom&start_date=${formattedDate}&end_date=${formattedDate}&format=csv`;

  console.debug(`Steamworks extras: Request traffic in CSV for ${formattedDate}. URL: ${URL}`);

  const response = await fetch(URL);

  const responseText = await response.text();

  if (responseText === undefined || responseText === '') {
    throw new Error(`Steamworks extras: Received no response instead of CSV while requesting traffic data for date ${formattedDate}`);
  }

  if (responseText.includes('<html>')) {
    throw new Error(`Steamworks extras: Received HTML response instead of CSV while requesting traffic data for date ${formattedDate}`);
  }

  let lines = responseText.split('\n');

  // Ensure that we have lines to process
  if (lines.length === 0) {
    return [];
  }

  const csvString = lines.join('\n');

  lines = helpers.csvTextToArray(csvString);

  if (lines.length === 1) {
    console.log(`Steamworks extras: No traffic results for ${formattedDate}`);
    return false;
  };

  console.debug(lines);

  let headers = lines[0]
    .map(header => header.trim())
    .map(header => header.replace(' / ', ''));

  let result = lines.slice(1)
    .map(line => {
      const object = {};

      line.forEach((element, index) => {
        object['Date'] = formattedDate;
        object[headers[index].replace(' / ', '')] = element;
      });

      return object;
    })
    .filter(line => { // There should be both because of database indexing
      return line['PageCategory'] !== undefined && line['PageFeature'] !== undefined;
    });

  console.debug(`Steamworks extras: Traffic results for ${formattedDate}`, result);

  // Make sure empty dates also get saved so we do not request it again
  if (result.length === 0) {
    result = [{ 'Date': formattedDate }];
    headers.forEach(header => {
      result[0][header.replace(' / ', '')] = 0;
    });
  }

  console.log(`Steamworks extras: Writing traffic data for ${formattedDate}`, result);

  await writeData(appID, 'Traffic', result);

  return true;
}
