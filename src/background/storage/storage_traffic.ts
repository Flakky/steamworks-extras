import { DateRangeAction, DateAction, StorageAction, StorageActionSettings } from './storageaction';
import { csvTextToArray, dateToString } from '../../scripts/helpers';
import { waitForDatabaseReady, readData, writeData } from './db';
import { getPageCreationDate, mapObject } from '../bghelpers';
import { DateRange, isDateInRange } from '../../shared/types/daterange';
import { DateTraffic, dateTrafficFieldMap } from '../../shared/types/traffic';

export class StorageActionRequestTraffic extends StorageAction implements DateAction {
    date: Date;

    constructor(appID: string, date: Date, settings = new StorageActionSettings()) {
        super(appID, settings);
        this.date = date;
    }

    async process() {
        await requestTrafficData(this.getAppID(), this.date);
    }

    getType() {
        return 'RequestTraffic';
    }
}

export class StorageActionGetTraffic extends StorageAction implements DateRangeAction {
    dateRange: DateRange;
    returnLackData: boolean;

    constructor(appID: string, dateRange: DateRange, returnLackData: boolean, settings = new StorageActionSettings()) {
        super(appID, settings);
        this.dateRange = dateRange;
        this.returnLackData = returnLackData;
    }

    async process() {
        return await getTrafficData(this.getAppID(), this.dateRange, this.returnLackData);
    }

    getType() {
        return 'GetTraffic';
    }
}

const getTrafficData = async (appID: string, dateRange: DateRange, returnLackData: boolean) => {
    await waitForDatabaseReady();

    // TODO: Optimize reading data only for range from DB
    // TODO: Optimize finding dates with no data

    let records = await readData(appID, 'Traffic') as DateTraffic[];

    const out = records.filter((item: DateTraffic) => {
        const date = new Date(item.date);

        return isDateInRange(date, dateRange);
    });

    return out;
}

const requestTrafficData = async (appID: string, date: Date) => {
    const pageCreationDate = await getPageCreationDate(appID);

    if (date < pageCreationDate) {
        console.error(`Cannot request traffic data for date ${date} because it is before page creation date`);
        return;
    }

    const formattedDate = dateToString(date);

    const csvString = await requestTrafficCSV(appID, date);

    const objects: any[] = csvTextToArray(csvString);

    if (objects.length <= 1) {
        console.debug(`No traffic results for ${formattedDate}`);
        return false;
    };

    let result = constructTrafficDataFromObjects(objects, formattedDate);

    // Make sure empty dates also get saved so we do not request it again
    if (result.length === 0) {
        result = [{
            date: formattedDate,
            impressions: 0,
            visits: 0,
            ownerImpressions: 0,
            ownerVisits: 0,
            pageCategory: '',
            pageFeature: ''
        }];
    }

    console.debug(`Traffic results for ${formattedDate}`, result);

    await writeData(appID, 'Traffic', result);

    return result;
}

const requestTrafficCSV = async (appID: string, date: Date): Promise<string> => {
    const URL = `https://partner.steamgames.com/apps/navtrafficstats/${appID}?attribution_filter=all&preset_date_range=custom&start_date=${date}&end_date=${date}&format=csv`;

    console.debug(`Request traffic in CSV for ${date}. URL: ${URL}`);

    const response = await fetch(URL);

    const responseText = await response.text();

    if (responseText === undefined || responseText === '') {
        throw new Error(`Received no response instead of CSV while requesting traffic data for date ${date}`);
    }

    if (responseText.includes('<html')) {
        throw new Error(`Received HTML response instead of CSV while requesting traffic data for date ${date}`);
    }

    let lines = responseText.split('\n');

    // Ensure that we have lines to process
    if (lines.length === 0) {
        return '';
    }

    const csvString = lines.join('\n');

    return csvString;
}

const constructTrafficDataFromObjects = (objects: any[], formattedDate: string): DateTraffic[] => {
    let result = objects
        .slice(1)
        .map((obj: any) => {
            return mapObject<DateTraffic>(obj, dateTrafficFieldMap);
        })
        // Filter out lines with no page category or feature
        .filter(line => {
            return line.pageCategory !== undefined && line.pageFeature !== undefined;
        })
        // Add date to every record
        .map((obj: DateTraffic) => {
            obj.date = formattedDate;
            return obj;
        });

    return result;
}
