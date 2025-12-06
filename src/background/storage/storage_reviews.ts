import { DateRangeAction, StorageAction, StorageActionSettings } from './storageaction';
import { dateToString } from '../../scripts/helpers';
import { waitForDatabaseReady, readData, clearData, writeData } from './db';
import { DateRange, getDateRangeArray, isDateInRange } from '../../shared/types/daterange';
import { Review } from '../../shared/types/review';

export class StorageActionRequestReviews extends StorageAction {

    async process() {
        return await requestAllReviewsData(this.getAppID());
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
        return await getReviewsData(this.getAppID(), this.dateRange, this.returnLackData);
    }

    getType() {
        return 'GetReviews';
    }
}

const getReviewsData = async (appID: string, dateRange: DateRange, returnLackData: boolean) => {
    await waitForDatabaseReady();

    console.debug(`Requesting reviews data for app ${appID}`);

    let records = await readData(appID, 'Reviews') as Review[];

    if (dateRange.dateStart && dateRange.dateEnd) {
        const filteredRecords = records.filter((item: Review) => {
            const date = new Date(item.timestamp_created * 1000);
            return isDateInRange(date, dateRange);
        });

        console.debug('Filtered reviews records: ', filteredRecords);

        if (!returnLackData) {
            const dateRangeArray = getDateRangeArray(dateRange, false, true) as string[];
            const datesWithData = [...new Set(filteredRecords.map((record: Review) => dateToString(new Date(record.timestamp_created * 1000))))];

            const allDatesHaveData = dateRangeArray.every(date => datesWithData.includes(date));

            return allDatesHaveData ? filteredRecords : null;
        }

        console.debug('Filtered reviews records 2: ', filteredRecords);

        return filteredRecords;
    } else {
        return records;
    }
}

const requestAllReviewsData = async (appID: string): Promise<Review[]> => {
    let reviews: Review[] = await requestAllReviews(appID);

    console.debug(`Reviews result: `, reviews);

    await clearData(appID, 'Reviews');

    await writeData(appID, 'Reviews', reviews);

    return reviews;
}

const requestAllReviews = async (appID: string): Promise<Review[]> => {
    let reviews: Review[] = [];

    let cursor: string = '*';

    while (true) {
        const reviewsResponse = await requestReviews(appID, cursor);

        if (reviewsResponse.reviews === undefined || reviewsResponse.reviews.length == 0) break;

        cursor = reviewsResponse.cursor;

        for (const review of reviewsResponse.reviews) {
            if (review !== undefined) reviews.push(review);
        }
    }

    return reviews;
}

const requestReviews = async (appID: string, cursor: string): Promise<Record<string, any>> => {
    // Request documentation: https://partner.steamgames.com/doc/store/getreviews

    const request_data: Record<string, string> = {
        'filter': 'recent',
        'language': 'all',
        'review_type': 'all',
        'purchase_type': 'all',
        'num_per_page': '100',
        'cursor': cursor,
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

    return responseObj;
}
