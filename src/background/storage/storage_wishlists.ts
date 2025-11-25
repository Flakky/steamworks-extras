import { DateRangeAction, DateAction, StorageAction, StorageActionSettings } from './storageaction';
import { csvTextToArray, dateToString } from '../../scripts/helpers';
import { waitForDatabaseReady, readData, mergeData } from './db';
import { getPageCreationDate, parseDataFromPage, mapObject } from '../bghelpers';
import { OffscreenManager } from '../offscreen/offscreenmanager';
import { DateRange, getDateRangeArray, isDateInRange } from '../../shared/types/daterange';
import { DateWishlists, dateWishlistsFieldMap } from '../../shared/types/wishlists';

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
    offscreenManager: OffscreenManager;

    constructor(appID: string, date: Date, offscreenManager: OffscreenManager, settings = new StorageActionSettings()) {
        super(appID, settings);
        this.date = date;
        this.offscreenManager = offscreenManager;
    }

    async process() {
        await requestWishlistRegionalData(this.getAppID(), this.date, this.offscreenManager);
    }

    getType() {
        return 'RequestRegionalWishlists';
    }
}

export class StorageActionGetWishlists extends StorageAction implements DateRangeAction {
    dateRange: DateRange;
    returnLackData: boolean;

    constructor(appID: string, dateRange: DateRange, returnLackData: boolean, settings = new StorageActionSettings()) {
        super(appID, settings);
        this.dateRange = dateRange;
        this.returnLackData = returnLackData;
    }

    async process() {
        return await getWishlistData(this.getAppID(), this.dateRange, this.returnLackData);
    }

    getType() {
        return 'GetWishlists';
    }
}

const getWishlistData = async (appID: string, dateRange: DateRange, returnLackData: boolean): Promise<DateWishlists[] | null> => {
    await waitForDatabaseReady();

    let records = await readData(appID, 'Wishlists') as DateWishlists[];

    if (!returnLackData) {
        let datesNoData = getDateRangeArray(dateRange, false, true) as string[];

        for (const record of records) {
            datesNoData = datesNoData.filter((item: string) => item !== record.date);
        }

        if (datesNoData.length > 0) return null;
    }

    const out = records.filter((item: DateWishlists) => {
        const date = new Date(item.date);
        return isDateInRange(date, dateRange);
    });

    return out;
}

const requestAllWishlistData = async (appID: string) => {
    console.debug(`Requesting all wishlist data for app ${appID}`);

    const pageCreationDate = await getPageCreationDate(appID, false) as Date;

    const csvString = await requestGeneralWishlistsCSV(appID, pageCreationDate, new Date());
    if (csvString === null) {
        console.debug(`No wishlists data found in CSV`);
        throw new Error(`No wishlists data found in CSV`);
    }

    const wishlistActions = convertCSVToDateWishlists(csvString);

    await mergeData(appID, 'Wishlists', wishlistActions);

    return wishlistActions;
}

const requestWishlistRegionalData = async (appID: string, date: Date, offscreenManager: OffscreenManager): Promise<DateWishlists> => {
    const pageCreationDate = await getPageCreationDate(appID, false) as Date;

    if (date < pageCreationDate) {
        console.error(`Cannot request wishlist data for date ${date} because it is before page creation date`);
    }

    const formattedDate = dateToString(date);

    const data = await requestRegionalWishlistData(appID, date, offscreenManager);

    // Make sure empty dates also get saved with 'World' so we do not request it again
    if (typeof data !== 'object' || Object.keys(data).length === 0) {

        console.debug(`No wishlist data found for date ${formattedDate}. Writing empty data`);

        const dataToWrite: DateWishlists = {
            date: formattedDate,
            adds: 0,
            deletes: 0,
            gifts: 0,
            activations: 0,
            "World": 0
        };

        await mergeData(appID, 'Wishlists', dataToWrite);

        return dataToWrite;
    }

    const formattedData = convertRegionalWishlistDataToDateWishlists(data, date);

    console.debug(`Wishlist result for app ${appID} for date ${formattedDate}: `, formattedData);

    await mergeData(appID, 'Wishlists', formattedData);

    return formattedData;
}

const requestGeneralWishlistsCSV = async (appID: string, startDate: Date, endDate: Date): Promise<string | null> => {
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
        return null;
    }

    const csvString = lines.join('\n');

    return csvString;
}

const convertCSVToDateWishlists = (csvString: string): DateWishlists[] => {
    const objects: any[] = csvTextToArray(csvString);

    const headers = (objects[0] as string[]).map((header: string) => header.trim());

    // Map each line to an object using the headers as keys
    return objects
        .slice(1)
        .map((obj: any) => {
            return {
                date: obj[headers.indexOf('DateLocal')],
                adds: obj[headers.indexOf('Adds')],
                deletes: obj[headers.indexOf('Deletes')],
                gifts: obj[headers.indexOf('Gifts')],
                activations: obj[headers.indexOf('PurchasesAndActivations')]
            };
        });
}

const requestRegionalWishlistData = async (appID: string, date: Date, offscreenManager: OffscreenManager): Promise<any> => {
    let url = `https://partner.steampowered.com/region/`;
    const params = {
        appID: appID,
        unitType: 'wishlist',
        dateStart: dateToString(date),
        dateEnd: dateToString(date)
    }

    const queryString = new URLSearchParams(params).toString();
    url += `?${queryString}`;

    const data = await parseDataFromPage(url, 'parseWishlistData', offscreenManager);

    return data;
}

const convertRegionalWishlistDataToDateWishlists = (data: any, date: Date): DateWishlists => {
    const formattedData: DateWishlists = Object.keys(data)
        .reduce((acc: any, country: string) => {
            let value = data[country];
            if (typeof value === 'string' && value.startsWith('(') && value.endsWith(')')) {
                value = -parseInt(value.slice(1, -1));
            } else {
                value = parseInt(value) || 0;
            }
            acc[country] = value;
            return acc;
        }, {})
        .map((obj: any) => {
            return mapObject<DateWishlists>(obj, dateWishlistsFieldMap);
        });

    formattedData.date = dateToString(date);

    return formattedData;
}
