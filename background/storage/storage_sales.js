class StorageActionRequestSales extends StorageAction {
  constructor(appID) {
    super();
    this.appID = appID;
  }

  async process() {
    await requestSalesData(this.appID);
  }

  getType() {
    return 'RequestSales';
  }
}

class StorageActionGetSales extends StorageAction {
  constructor(appID, dateStart, dateEnd, returnLackData) {
    super();
    this.appID = appID;
    this.dateStart = dateStart;
    this.dateEnd = dateEnd;
    this.returnLackData = returnLackData;
    this.executeTimeout = 10;
  }

  async process() {
    return await getSalesData(this.appID, this.dateStart, this.dateEnd, this.returnLackData);
  }

  getType() {
    return 'GetSales';
  }
}

const requestSalesData = async (appID) => {
  const pageCreationDate = await bghelpers.getPageCreationDate(appID);

  const startDate = pageCreationDate;
  const endDate = new Date();

  const formattedStartDate = helpers.dateToString(startDate);
  const formattedEndDate = helpers.dateToString(endDate);

  console.log(`Request sales in CSV between ${formattedStartDate} and ${formattedEndDate}`);

  const packageIDs = await bghelpers.getAppPackageIDs(appID);

  console.debug(`Package IDs found for app ${appID}:`, packageIDs);

  if (packageIDs === undefined || !Array.isArray(packageIDs) || packageIDs.length === 0) {
    console.error(`No package IDs found for app ${appID}`);
    return;
  }

  const URL = `https://partner.steampowered.com/report_csv.php`;

  const reqHeaders = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const data = new URLSearchParams();
  data.append('file', 'SalesData');
  let params = `query=QueryPackageSalesForCSV^dateStart=${formattedStartDate}^dateEnd=${formattedEndDate}^interpreter=PartnerSalesReportInterpreter`;

  packageIDs.forEach((pkgID, index) => {
    params += `^pkgID[${index}]=${pkgID}`;
  });
  data.append('params', params);

  const response = await fetch(URL, { method: 'POST', headers: reqHeaders, body: data.toString(), credentials: 'include' });
  if (!response.ok) throw new Error('Network response was not ok');

  const htmlText = await response.text();

  if (htmlText === undefined || htmlText === '') {
    throw new Error(`Received no response instead of CSV while requesting sales data`);
  }

  if (htmlText.includes('<html')) {
    throw new Error('Received HTML response instead of CSV while requesting sales data');
  }

  let lines = htmlText.split('\n');

  lines.splice(0, 3); // Remove first 3 rows because they are not informative and break csv format

  // Ensure that we have lines to process
  if (lines.length === 0) {
    console.log(`No sales data found in CSV`);
    return [];
  }

  await clearData(appID, 'Sales');

  const csvString = lines.join('\n');

  lines = helpers.csvTextToArray(csvString);

  const headers = lines[0].map(header => header.trim());

  // Map each line to an object using the headers as keys
  let index = 0;
  const result = lines.slice(1).map(line => {
    const object = {};

    line.forEach((element, index) => {
      object[headers[index]] = element;
    });

    object.key = index++;

    return object;
  });

  console.log(`Sales CSV result:`, result);

  await writeData(appID, 'Sales', result);
}

const getAllSalesData = async (appID) => {
  await waitForDatabaseReady();
  let records = await readData(appID, 'Sales');

  if (records.length === 0) {
    console.log(`No sales data found in DB. Requesting from server...`);
    await requestSalesData(appID);
    records = await readData(appID, 'Sales');
  }

  return records;
}

const getSalesData = async (appID, dateStart, dateEnd, returnLackData) => {
  await waitForDatabaseReady();

  let records = await readData(appID, 'Sales');

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
