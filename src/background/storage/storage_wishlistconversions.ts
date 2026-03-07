import { DateRangeAction, StorageAction, StorageActionSettings } from './storageaction';
import { csvTextToArray, dateToString } from '../../scripts/helpers';
import { waitForDatabaseReady, readData, clearData, writeData } from './db';
import { getPageCreationDate } from '../bghelpers';
import { DateRange, isDateInRange, getDateRangeArray } from '../../shared/types/daterange';
import { DateWishlistConversions, GameWishlistConversions } from '../../shared/types/wishlists';

export class StorageActionRequestWishlistConversions extends StorageAction {
    async process() {
        return await requestWishlistConversionsData(this.getAppID());
    }

    getType() {
        return 'RequestWishlistConversions';
    }
}

export class StorageActionGetWishlistConversions extends StorageAction implements DateRangeAction {
    dateRange: DateRange;
    returnLackData: boolean;

    constructor(appID: string, dateRange: DateRange, returnLackData: boolean, settings = new StorageActionSettings()) {
        super(appID, settings);
        this.dateRange = dateRange;
        this.returnLackData = returnLackData;
    }

    async process() {
        return await getWishlistConversionsData(this.getAppID(), this.dateRange, this.returnLackData);
    }

    getType() {
        return 'GetWishlistConversions';
    }
}

const requestWishlistConversionsData = async (appID: string) => {
    const pageCreationDate = await getPageCreationDate(appID, false) as Date;

    await clearData(appID, 'WishlistConversions');

    const csvString = await requestWishlistConversionsCSV(appID, new DateRange(pageCreationDate, new Date()));

    const result = convertCSVToDateWishlistConversions(csvString);

    console.debug(`Wishlist conversions CSV result:`, result);

    await clearData(appID, 'WishlistConversions');
    await writeData(appID, 'WishlistConversions', result);

    return result;
}

const getWishlistConversionsData = async (appID: string, dateRange: DateRange, returnLackData: boolean): Promise<GameWishlistConversions[] | null> => {
    await waitForDatabaseReady();

    let records = await readData(appID, 'WishlistConversions') as DateWishlistConversions[];

    const filteredRecords = records.filter((item: DateWishlistConversions) => {
        let date = new Date(item.date);
        return isDateInRange(date, dateRange);
    });
    if (!returnLackData) {
        const dateRangeArray = getDateRangeArray(dateRange, false, true) as string[];
        const datesWithData = [...new Set(filteredRecords.map((record: DateWishlistConversions) => record.date))];

        const allDatesHaveData = dateRangeArray.every(date => datesWithData.includes(date));

        if (!allDatesHaveData) return null;
    }

    const wishlistConversions = convertDateWishlistConversionsToGameWishlistConversions(filteredRecords);

    return wishlistConversions;
}

const requestWishlistConversionsCSV = async (appID: string, dateRange: DateRange): Promise<string> => {
    const formattedStartDate = dateToString(dateRange.dateStart);
    const formattedEndDate = dateToString(dateRange.dateEnd);

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
        throw new Error(`No wishlist conversions data found in CSV`);
    }

    const csvString = lines.join('\n');

    return csvString;
}

const convertCSVToDateWishlistConversions = (csvString: string): DateWishlistConversions[] => {
    const objects: any[] = csvTextToArray(csvString);

    const headers = (objects[0] as string[]).map((header: string) => header.trim());

    const result: DateWishlistConversions[] = objects
        .slice(1)
        .map((obj: any) => {
            return {
                date: obj[headers.indexOf('DateLocal')],
                month: obj[headers.indexOf('MonthCohort')],
                purchasesAndActivations: obj[headers.indexOf('PurchasesAndActivations')],
                gifts: obj[headers.indexOf('Gifts')],
                totalConversions: obj[headers.indexOf('TotalConversions')]
            };
        })
        .filter(record => record.date && record.month);

    return result;
}

const convertDateWishlistConversionsToGameWishlistConversions = (data: DateWishlistConversions[]): GameWishlistConversions[] => {
    return data.reduce((acc: GameWishlistConversions[], item: DateWishlistConversions) => {
        let dateRecord = acc.find(game => game.date === item.date);
        if (!dateRecord) {
            dateRecord = {
                date: item.date,
                monthConversions: {}
            };
            acc.push(dateRecord);
        }

        dateRecord.monthConversions[item.month] = {
            totalConversions: item.totalConversions,
            gifts: item.gifts,
            purchasesAndActivations: item.purchasesAndActivations
        };

        return acc;
    }, []);
}
