import { DateRangeAction, StorageAction, StorageActionSettings } from './storageaction';
import { dateToString } from '../../scripts/helpers';
import { waitForDatabaseReady, readData, clearData, writeData } from './db';
import { DateRange, getDateRangeArray, isDateInRange } from '../../shared/types/daterange';

export class StorageActionRequestReviews extends StorageAction {

    async process() {
        await requestAllReviewsData(this.getAppID());
    }

    getType() {
        return 'RequestReviews';
    }
}

export class StorageActionGetReviews extends StorageAction implements DateRangeAction {
    dateRange: DateRange;
    returnLackData: boolean;

    constructor(appID: string, dateRange: DateRange, returnLackData: boolean, settings = new StorageActionSettings()) {
        super(appID, settings);
        this.dateRange = dateRange;
        this.returnLackData = returnLackData;
    }

    async process() {
        await getReviewsData(this.getAppID(), this.dateRange, this.returnLackData);
    }

    getType() {
        return 'GetReviews';
    }
}

const getReviewsData = async (appID: string, dateRange: DateRange, returnLackData: boolean) => {
    await waitForDatabaseReady();

    console.debug(`Requesting reviews data for app ${appID}`);

    let records = await readData(appID, 'Reviews');

    if (dateRange.dateStart && dateRange.dateEnd) {
        const filteredRecords = records.filter((item: any) => {
            const date = new Date(item['timestamp_created'] * 1000);
            return isDateInRange(date, dateRange);
        });

        if (!returnLackData) {
            const dateRangeArray = getDateRangeArray(dateRange, false, true) as string[];
            const datesWithData = [...new Set(filteredRecords.map((record: any) => dateToString(new Date(record['timestamp_created'] * 1000))))];

            const allDatesHaveData = dateRangeArray.every(date => datesWithData.includes(date));

            return allDatesHaveData ? filteredRecords : null;
        }

        return filteredRecords;
    } else {
        return records;
    }
}

const requestAllReviewsData = async (appID: string) => {
    // Request documentation: https://partner.steamgames.com/doc/store/getreviews

    let cursor = '*'

    let reviews = [];

    while (true) {
        const request_data: Record<string, string> = {
            'filter': 'recent',
            'language': 'all',
            'review_type': 'all',
            'purchase_type': 'all',
            'num_per_page': '100',
            'cursor': 'cursor',
            'json': '1'
        }

        const params = Object.keys(request_data)
            .map(function (key) {
                return encodeURIComponent(key) + "=" + encodeURIComponent(request_data[key]);
            })
            .join("&");

        const request_url = `https://store.steampowered.com/appreviews/${appID}?${params}`;
        const request_options = {
            'method': 'POST',
            'contentType': 'application/json',
            headers: {
                'Content-Type': 'application/json'
            },
        };

        console.debug(`Sending review request to "${request_url}"`);

        const response = await fetch(request_url, request_options);

        const responseText = await response.text();

        const responseObj = JSON.parse(responseText);

        if (responseObj.reviews === undefined || responseObj.reviews.length == 0) break;

        cursor = responseObj.cursor;

        for (const review of responseObj.reviews) {
            if (review !== undefined) reviews.push(review);
        }
    }

    console.debug(`Reviews result: `, reviews);

    await clearData(appID, 'Reviews');

    await writeData(appID, 'Reviews', reviews);

    return reviews;
}
