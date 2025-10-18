import { DateRangeAction, DateAction, StorageAction, StorageActionSettings } from './storageaction';
import { isDateInRange, getDateRangeArray, csvTextToArray, dateToString } from '../../scripts/helpers';
import { waitForDatabaseReady, readData, mergeData, writeData } from './storage';
import { getPageCreationDate, parseDataFromPage } from '../bghelpers';

export class StorageActionRequestWishlists extends StorageAction {
  async process() {
    await requestAllWishlistData(this.getAppID());
  }

  getType() {
    return 'RequestWishlists';
  }
}

export class StorageActionRequestRegionalWishlists extends StorageAction implements DateAction {
  date: Date;

  constructor(appID: string, date: Date, settings = new StorageActionSettings()) {
    super(appID, settings);
    this.date = date;
  }

  async process() {
    await requestWishlistRegionalData(this.getAppID(), this.date);
  }

  getType() {
    return 'RequestRegionalWishlists';
  }
}

export class StorageActionGetWishlists extends StorageAction implements DateRangeAction {
  dateStart: Date;
  dateEnd: Date;
  returnLackData: boolean;

  constructor(appID: string, dateStart: Date, dateEnd: Date, returnLackData: boolean, settings = new StorageActionSettings()) {
    super(appID, settings);
    this.dateStart = dateStart;
    this.dateEnd = dateEnd;
    this.returnLackData = returnLackData;
  }

  async process() {
    return await getWishlistData(this.getAppID(), this.dateStart, this.dateEnd, this.returnLackData);
  }

  getType() {
    return 'GetWishlists';
  }
}

const getWishlistData = async (appID: string, dateStart: Date, dateEnd: Date, returnLackData: boolean) => {
  await waitForDatabaseReady();

  let records = await readData(appID, 'Wishlists');

  if (!returnLackData) {
    let datesNoData = getDateRangeArray(dateStart, dateEnd, false, true);

    for (const record of records) {
      datesNoData = datesNoData.filter((item: any) => item !== record['Date']);
    }

    if (datesNoData.length > 0) return null;
  }

  const out = records.filter((item: any) => {
    const date = new Date(item['Date']);
    return isDateInRange(date, dateStart, dateEnd);
  });

  return out;
}

const requestAllWishlistData = async (appID: string) => {
  console.debug(`Requesting all wishlist data for app ${appID}`);

  const pageCreationDate = await getPageCreationDate(appID, false) as Date;

  const startDate = pageCreationDate;
  const endDate = new Date();

  const formattedStartDate = dateToString(startDate);
  const formattedEndDate = dateToString(endDate);

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

  const objects: any[] = csvTextToArray(csvString);

  const headers = (objects[0] as string[]).map((header: string) => header.trim());

  // Map each line to an object using the headers as keys
  let wishlistActions = objects
    .slice(1)
    .map((obj: any) => {
    return {
      'Date': obj[headers.indexOf('DateLocal')],
      'Adds': obj[headers.indexOf('Adds')],
      'Deletes': obj[headers.indexOf('Deletes')],
      'Gifts': obj[headers.indexOf('Gifts')],
      'Activations': obj[headers.indexOf('PurchasesAndActivations')]
    };
  });

  await mergeData(appID, 'Wishlists', wishlistActions);

  return wishlistActions;
}

const requestWishlistRegionalData = async (appID: string, date: Date) => {
  const pageCreationDate = await getPageCreationDate(appID, false) as Date;

  if (date < pageCreationDate) {
    console.error(`Cannot request wishlist data for date ${date} because it is before page creation date`);
  }

  const formattedDate = dateToString(date);

  let url = `https://partner.steampowered.com/region/`;
  const params = {
    appID: appID,
    unitType: 'wishlist',
    dateStart: formattedDate,
    dateEnd: formattedDate
  }

  const queryString = new URLSearchParams(params).toString();
  url += `?${queryString}`;

  const data = await parseDataFromPage(url, 'parseWishlistData');

  if (typeof data !== 'object' || Object.keys(data).length === 0) {
    console.debug(`No wishlist data found for date ${formattedDate}. Writing empty data`);

    // Make sure empty dates also get saved with 'World' so we do not request it again

    const dataToWrite = { 'Date': formattedDate, 'World': 0 };

    await mergeData(appID, 'Wishlists', dataToWrite);

    return dataToWrite;
  }

  const formattedData = Object.keys(data).reduce((acc: any, country: string) => {
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

  formattedData['Date'] = dateToString(date);

  await mergeData(appID, 'Wishlists', formattedData);

  return formattedData;
}
