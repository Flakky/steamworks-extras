import { DateRangeAction, DateAction, StorageAction, StorageActionSettings } from './storageaction';
import { csvTextToArray, dateToString } from '../../scripts/helpers';
import { waitForDatabaseReady, readData, writeData } from './db';
import { getPageCreationDate, mapObject } from '../bghelpers';
import { DateRange, isDateInRange, getDateRangeArray } from '../../shared/types/daterange';
import { DateTraffic, dateTrafficFieldMap, GameTraffic } from '../../shared/types/traffic';

export class StorageActionRequestTraffic extends StorageAction implements DateAction {
    date: Date;

    constructor(appID: string, date: Date, settings = new StorageActionSettings()) {
        super(appID, settings);
        this.date = date;
    }

    async process() {
        return await requestTrafficData(this.getAppID(), this.date);
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

const getTrafficData = async (appID: string, dateRange: DateRange, returnLackData: boolean): Promise<GameTraffic[] | null> => {
    await waitForDatabaseReady();

    // TODO: Optimize reading data only for range from DB
    // TODO: Optimize finding dates with no data

    let records = await readData(appID, 'Traffic') as DateTraffic[];

    const data = records.filter((item: DateTraffic) => {
        const date = new Date(item.date);

        return isDateInRange(date, dateRange);
    });

    if (!returnLackData) {
        const dateRangeArray = getDateRangeArray(dateRange, false, true) as string[];
        const datesWithData = [...new Set(data.map((record: DateTraffic) => record.date))];

        const allDatesHaveData = dateRangeArray.every(date => datesWithData.includes(date));

        if (!allDatesHaveData) return null;
    }

    const gameTraffic = convertDateTrafficToGameTraffic(data);

    return gameTraffic;
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

    console.debug('Traffic results Objects: ', objects);

    let result = constructTrafficDataFromObjects(objects, formattedDate);

    console.debug('Traffic results result: ', result);

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
    const dateString = dateToString(date);
    const URL = `https://partner.steamgames.com/apps/navtrafficstats/${appID}?attribution_filter=all&preset_date_range=custom&start_date=${dateString}&end_date=${dateString}&format=csv`;

    console.debug(`Request traffic in CSV for ${dateString}. URL: ${URL}`);

    const response = await fetch(URL);

    const responseText = await response.text();

    if (responseText === undefined || responseText === '') {
        throw new Error(`Received no response instead of CSV while requesting traffic data for date ${dateString}`);
    }

    if (responseText.includes('<html')) {
        throw new Error(`Received HTML response instead of CSV while requesting traffic data for date ${dateString}`);
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
    const headers = (objects[0] as string[]).map((header: string) => header.trim());

    let result = objects
        .slice(1)
        .map((obj: any) => {
            return {
                date: formattedDate,
                pageCategory: obj[headers.indexOf('Page / Category')],
                pageFeature: obj[headers.indexOf('Page / Feature')],
                impressions: obj[headers.indexOf('Impressions')],
                visits: obj[headers.indexOf('Visits')],
                ownerImpressions: obj[headers.indexOf('Owner Impressions')],
                ownerVisits: obj[headers.indexOf('Owner Visits')]
            };
        })
        // Filter out lines with no page category or feature
        .filter(line => {
            return line.pageCategory !== undefined && line.pageFeature !== undefined;
        });

    return result;
}

const convertDateTrafficToGameTraffic = (data: DateTraffic[]): GameTraffic[] => {
    return data.reduce((acc: GameTraffic[], item: DateTraffic) => {
        let dateRecord = acc.find(game => game.date === item.date);
        if (!dateRecord) {
            dateRecord = {
                date: item.date,
                categories: {}
            };
            acc.push(dateRecord);
        }

        let categoryRecord = dateRecord.categories[item.pageCategory];
        if (!categoryRecord) {
            categoryRecord = {
                impressions: 0,
                visits: 0,
                ownerImpressions: 0,
                ownerVisits: 0,
                featureTraffic: {}
            };
            dateRecord.categories[item.pageCategory] = categoryRecord;
        }

        let featureRecord = categoryRecord.featureTraffic[item.pageFeature];
        if (!featureRecord) {
            featureRecord = {
                impressions: item.impressions,
                visits: item.visits,
                ownerImpressions: item.ownerImpressions,
                ownerVisits: item.ownerVisits
            };
            categoryRecord.featureTraffic[item.pageFeature] = featureRecord;
        }

        categoryRecord.impressions += item.impressions;
        categoryRecord.visits += item.visits;
        categoryRecord.ownerImpressions += item.ownerImpressions;
        categoryRecord.ownerVisits += item.ownerVisits;

        return acc;
    }, []);
}
