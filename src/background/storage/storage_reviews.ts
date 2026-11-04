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

export const requestAllReviews = async (appID: string): Promise<Review[]> => {
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

// The store endpoint (store.steampowered.com/appreviews) redirects to the store front page
// since late October 2026. IUserReviewsService is its official Web API replacement; it needs
// no key and returns the same fields wrapped in "response", without "success".
// Documentation: https://partner.steamgames.com/doc/webapi/IUserReviewsService
const FILTER_RECENT = 1;
const REVIEW_TYPE_ALL = 0;
const PURCHASE_TYPE_ALL = 1;

const requestReviews = async (appID: string, cursor: string): Promise<Record<string, any>> => {
    const input = {
        appid: Number(appID),
        filter: FILTER_RECENT,
        languages: ['all'],
        review_type: REVIEW_TYPE_ALL,
        purchase_type: PURCHASE_TYPE_ALL,
        num_per_page: 100,
        cursor: cursor
    };

    const request_url = `https://api.steampowered.com/IUserReviewsService/GetAppReviews/v1/?input_json=${encodeURIComponent(JSON.stringify(input))}`;

    console.debug(`Sending review request to "${request_url}"`);

    const response = await fetch(request_url);
    if (!response.ok) throw new Error(`Reviews request failed with status ${response.status}`);

    const page = (await response.json())?.response;
    if (page === null || typeof page !== 'object') {
        throw new Error(`Steam returned unexpected reviews response for app ${appID}`);
    }

    // The last page has no "reviews" field; keep the old response shape for the caller
    return { success: 1, reviews: [], ...page };
}
