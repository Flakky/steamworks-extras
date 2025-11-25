import { DateRangeAction, StorageAction, StorageActionSettings } from './storageaction';
import { csvTextToArray, dateToString } from '../../scripts/helpers';
import { waitForDatabaseReady, readData, clearData, writeData } from './db';
import { getPageCreationDate, getAppPackageIDs } from '../bghelpers';
import { DateSales, dateSalesFieldMap } from '../../shared/types/sales';
import { DateRange, isDateInRange, getDateRangeArray } from '../../shared/types/daterange';

export class StorageActionRequestSales extends StorageAction {

    async process() {
        await requestSalesData(this.getAppID());
    }

    getType() {
        return 'RequestSales';
    }
}

export class StorageActionGetSales extends StorageAction implements DateRangeAction {
    dateRange: DateRange;
    returnLackData: boolean;

    constructor(appID: string, dateRange: DateRange, returnLackData: boolean, settings = new StorageActionSettings()) {
        super(appID, settings);
        this.dateRange = dateRange;
        this.returnLackData = returnLackData;
    }

    async process() {
        return await getSalesData(this.getAppID(), this.dateRange, this.returnLackData);
    }

    getType() {
        return 'GetSales';
    }
}

const requestSalesData = async (appID: string): Promise<DateSales[] | null> => {
    const pageCreationDate = await getPageCreationDate(appID, false) as Date;

    const startDate = pageCreationDate;
    const endDate = new Date();

    const formattedStartDate = dateToString(startDate);
    const formattedEndDate = dateToString(endDate);

    console.debug(`Request sales in CSV between ${formattedStartDate} and ${formattedEndDate}`);

    const packageIDs = await getAppPackageIDs(appID);

    console.debug(`Package IDs found for app ${appID}:`, packageIDs);

    if (packageIDs === undefined || !Array.isArray(packageIDs) || packageIDs.length === 0) {
        console.error(`No package IDs found for app ${appID}`);
        return null;
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
        console.debug(`No sales data found in CSV`);
        return [];
    }

    await clearData(appID, 'Sales');

    const csvString = lines.join('\n');

    const objects: any[] = csvTextToArray(csvString);

    const headers = (objects[0] as string[]).map((header: string) => header.trim());

    // Map each line to an object using the headers as keys
    let index = 0;
    const result = objects
        .slice(1)
        .map((obj: any) => {
            const object: any = {};

            obj.forEach((element: any, i: number) => {
                object[headers[i]] = element;
            });

            object.key = index++;

            return object;
        }).map((obj: any) => {
            const dateSalesObj: any = {};
            Object.keys(obj).forEach((field) => {
                dateSalesObj[dateSalesFieldMap[field] as keyof DateSales] = obj[field];
            });
            return dateSalesObj as DateSales;
        });

    console.debug(`Sales from CSV result:`, result);

    await writeData(appID, 'Sales', result);

    return result;
}

const getAllSalesData = async (appID: string): Promise<DateSales[]> => {
    await waitForDatabaseReady();
    let records = await readData(appID, 'Sales') as DateSales[];

    return records;
}

const getSalesData = async (appID: string, dateRange: DateRange, returnLackData: boolean): Promise<DateSales[] | null> => {
    await waitForDatabaseReady();

    let records = await readData(appID, 'Sales') as DateSales[];

    if (dateRange.dateStart && dateRange.dateEnd) {
        const filteredRecords = records.filter((item: DateSales) => {
            let date = new Date(item.date);
            return isDateInRange(date, dateRange);
        });

        if (!returnLackData) {
            const dateRangeArray = getDateRangeArray(dateRange, false, true) as string[];
            const datesWithData = [...new Set(filteredRecords.map((record: DateSales) => record.date))];

            const allDatesHaveData = dateRangeArray.every(date => datesWithData.includes(date));

            return allDatesHaveData ? filteredRecords : null;
        }

        return filteredRecords;
    }
    else {
        return records;
    }
}
