import { DateRangeAction, StorageAction, StorageActionSettings } from './storageaction';
import { csvTextToArray, dateToString, isStringEmpty } from '../../scripts/helpers';
import { waitForDatabaseReady, readData, mergeData } from './db';
import { getPageCreationDate } from '../bghelpers';
import { DateRange, getDateRangeArray, isDateInRange } from '../../shared/types/daterange';
import { DateWishlistRegional, DateWishlists, GameWishlists, GameWishlistsWithRegionalData } from '../../shared/types/wishlists';

export class StorageActionRequestWishlists extends StorageAction {
    async process() {
        return await requestAllWishlistData(this.getAppID());
    }

    getType() {
        return 'RequestWishlists';
    }
}

export class StorageActionRequestRegionalWishlists extends StorageAction {

    async process() {
        return await requestAllRegionalWishlistData(this.getAppID());
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

// Get Wishlists

const getWishlistData = async (appID: string, dateRange: DateRange, returnLackData: boolean): Promise<GameWishlists[] | null> => {
    await waitForDatabaseReady();

    let records = await readData(appID, 'Wishlists') as DateWishlists[];
    let regionalRecords = await readData(appID, 'WishlistsRegional') as DateWishlistRegional[];

    if (!returnLackData) {
        let datesNoData = getDateRangeArray(dateRange, false, true) as string[];

        for (const record of records) {
            datesNoData = datesNoData.filter((item: string) => item !== record.date);
        }

        if (datesNoData.length > 0) return null;
    }

    const wishlists: GameWishlists[] = records
        .filter((item: DateWishlists) => {
            const date = new Date(item.date);
            return isDateInRange(date, dateRange);
        })
        .map((item: DateWishlists): GameWishlists => {
            return convertDateWishlistsToGameWishlists(item);
        });

    const out = appendRegionalDataToGameWishlists(wishlists, regionalRecords);

    return out;
}

// Request Wishlists

const requestAllWishlistData = async (appID: string) => {
    console.debug(`Requesting all wishlist data for app ${appID}`);

    const pageCreationDate = await getPageCreationDate(appID, false) as Date;

    const csvString = await requestGeneralWishlistsCSV(appID, new DateRange(pageCreationDate, new Date()));
    if (csvString === null) {
        console.debug(`No wishlists data found in CSV`);
        throw new Error(`No wishlists data found in CSV`);
    }

    const wishlistActions = convertCSVToDateWishlists(csvString);

    await mergeData(appID, 'Wishlists', wishlistActions);

    return wishlistActions;
}

const requestGeneralWishlistsCSV = async (appID: string, dateRange: DateRange): Promise<string | null> => {
    const formattedStartDate = dateToString(dateRange.dateStart);
    const formattedEndDate = dateToString(dateRange.dateEnd);

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

    return readCSVFromResponse(await response.text());
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

// Request Regional Wishlists

const requestAllRegionalWishlistData = async (appID: string): Promise<DateWishlistRegional[]> => {
    console.debug(`Requesting all regional wishlist data for app ${appID}`);

    const pageCreationDate = await getPageCreationDate(appID, false) as Date;

    const csvString = await requestRegionalWishlistDataCSV(appID, new DateRange(pageCreationDate, new Date()));
    if (csvString === null) {
        console.debug(`No wishlists data found in CSV`);
        throw new Error(`No wishlists data found in CSV`);
    }

    const wishlistRegionalActions = convertCSVToDateWishlistRegional(csvString)
        .filter((element: DateWishlistRegional) => {
            return element.country !== undefined && !isStringEmpty(element.date);
        });

    console.log('Regional wishlists: ', wishlistRegionalActions);

    await mergeData(appID, 'WishlistsRegional', wishlistRegionalActions);

    return wishlistRegionalActions;
}

const requestRegionalWishlistDataCSV = async (appID: string, dateRange: DateRange): Promise<string | null> => {

    const formattedStartDate = dateToString(dateRange.dateStart);
    const formattedEndDate = dateToString(dateRange.dateEnd);

    let URL = `https://partner.steampowered.com/report_csv.php`;

    URL += `?file=SteamRegionalWishlists_${appID}_${formattedStartDate}_to_${formattedEndDate}`;
    URL += `&params=query=QueryWishlistActionsByCountryForCSV^appID=${appID}^dateStart=${formattedStartDate}^dateEnd=${formattedEndDate}^interpreter=WishlistCountryReportInterpreter`

    const reqHeaders = {
        'Content-Type': 'application/x-www-form-urlencoded',
    };

    console.debug('Requesting regional wishlists CSV: ', URL);

    const response = await fetch(URL, { method: 'GET', headers: reqHeaders, credentials: 'include' });
    if (!response.ok) throw new Error('Network response was not ok');

    const htmlText = await response.text();

    console.log('Regional wishlists CSV: ', htmlText);

    return readCSVFromResponse(htmlText);
}

const convertCSVToDateWishlistRegional = (csvString: string): DateWishlistRegional[] => {
    const objects: any[] = csvTextToArray(csvString);

    const headers = (objects[0] as string[]).map((header: string) => header.trim());

    // Map each line to an object using the headers as keys
    return objects
        .slice(1)
        .map((obj: any) => {
            return {
                date: obj[headers.indexOf('DateLocal')],
                country: obj[headers.indexOf('CountryCode')],
                region: obj[headers.indexOf('Region')],
                adds: obj[headers.indexOf('Adds')],
                deletes: obj[headers.indexOf('Deletes')],
                gifts: obj[headers.indexOf('Gifts')],
                activations: obj[headers.indexOf('PurchasesAndActivations')]
            };
        });
}

const readCSVFromResponse = async (responseText: string): Promise<string | null> => {
    const htmlText = responseText;

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

const convertDateWishlistsToGameWishlists = (data: DateWishlists): GameWishlists => {
    return {
        date: data.date,
        adds: data.adds,
        deletes: data.deletes,
        gifts: data.gifts,
        activations: data.activations,
        countriesData: {},
        regionsData: {}
    };
}

const appendRegionalDataToGameWishlists = (gameWishlists: GameWishlists[], regionalData: DateWishlistRegional[]): GameWishlists[] => {
    return gameWishlists.map((gameWishlist: GameWishlists) => {
        regionalData.forEach((item: DateWishlistRegional) => {
            if (item.date === gameWishlist.date) {
                gameWishlist.countriesData[item.country] = {
                    adds: item.adds,
                    deletes: item.deletes,
                    gifts: item.gifts,
                    activations: item.activations
                };

                let regionData: GameWishlistsWithRegionalData = gameWishlist.regionsData[item.region] || {
                    adds: 0,
                    deletes: 0,
                    gifts: 0,
                    activations: 0
                };

                regionData = {
                    adds: regionData.adds + item.adds,
                    deletes: regionData.deletes + item.deletes,
                    gifts: regionData.gifts + item.gifts,
                    activations: regionData.activations + item.activations
                };

                gameWishlist.regionsData[item.region] = regionData;
            }
        });

        return gameWishlist;
    });
}
