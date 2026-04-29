import { getBrowser } from '../shared/browser';
import { setExtentionStatus } from './status';
import { getPageCreationDate, hasPackageIDs } from './bghelpers';
import { getDateNoOffset, dateToString } from '../scripts/helpers';
import { readData } from './storage/db';
import { StorageAction, StorageActionSettings } from './storage/storageaction';
import { StorageActionsQueue } from './storage/storagequeue';
import { defaultSettings } from '../data/defaultsettings';
import { StorageActionRequestSales } from './storage/storage_sales';
import { StorageActionRequestReviews } from './storage/storage_reviews';
import { StorageActionRequestWishlistConversions } from './storage/storage_wishlistconversions';
import { StorageActionRequestWishlists, StorageActionRequestRegionalWishlists } from './storage/storage_wishlists';
import { StorageActionRequestTraffic } from './storage/storage_traffic';
import { OffscreenManager } from './offscreen/offscreenmanager';
import { DateRange, getDateRangeArray } from '../shared/types/daterange';
import { DateTraffic } from '../shared/types/traffic';
import { DateWishlistRegional } from '../shared/types/wishlists';
class UpdateStatsContext {
    queue: StorageActionsQueue;
    offscreenManager: OffscreenManager;

    constructor(queue: StorageActionsQueue, offscreenManager: OffscreenManager) {
        this.queue = queue;
        this.offscreenManager = offscreenManager;
    }
}

export const startUpdatingStats = async (appIDs: string[], context: UpdateStatsContext) => {
    const updateIntervalObject = await getBrowser().storage.local.get(`statsUpdateInterval`);
    const updateInterval = updateIntervalObject.statsUpdateInterval || 60;

    await updateStatsIfNeeded(appIDs, updateInterval, context);

    console.debug(`Stats update interval:`, updateInterval);

    setInterval(async () => {
        await updateStatsIfNeeded(appIDs, updateInterval, context);
    }, updateInterval * 60 * 1000);

    updateStatsStatus(context.queue);
    setInterval(() => {
        updateStatsStatus(context.queue);
    }, 3 * 1000);
}

export const updateStatsIfNeeded = async (appIDs: string[], updateInterval: number, context: UpdateStatsContext) => {
    if (await shouldUpdateStatsByInterval(updateInterval)) {
        updateStats(appIDs, context);
    }
}

export const updateStats = async (appIDs: string[], context: UpdateStatsContext) => {
    console.log(`Updating stats for apps:`, appIDs);

    await recordLastUpdate();

    try {
        // First handle requests which we can request at once, then daily
        for (const appID of appIDs) {
            fetchSalesData(appID, context.queue);
        }
        for (const appID of appIDs) {
            fetchReviewsData(appID, context.queue);
        }
        for (const appID of appIDs) {
            fetchWishlistConversionsData(appID, context.queue);
        }
        for (const appID of appIDs) {
            fetchGeneralWishlistsData(appID, context.queue);
        }
        for (const appID of appIDs) {
            fetchRegionalWishlistsData(appID, context.queue);
        }

        fetchDailyData(appIDs, context.queue, context.offscreenManager);
    }
    catch (error) {
        console.error('Error while updating stats: ', error);
    }
}

const recordLastUpdate = async () => {
    await getBrowser().storage.local.set({ lastUpdate: new Date().getTime() });
}

const shouldUpdateStatsByInterval = async (updateInterval: number) => {
    const lastUpdateObject = await getBrowser().storage.local.get(`lastUpdate`);
    const lastUpdate = lastUpdateObject.lastUpdate || 0;
    const now = new Date().getTime();

    if (now - lastUpdate < updateInterval * 60 * 1000) {
        return false;
    }

    await getBrowser().storage.local.set({ lastUpdate: now });

    return true;
}

export const updateStatsStatus = (queue: StorageActionsQueue) => {
    const queueLength = queue.getQueue().filter(item => item.getType().includes("Request")).length;
    console.debug(`Queue length:`, queueLength);
    if (queueLength > 0) {
        setExtentionStatus(11, { queueLength: queueLength });
    }
    else {
        setExtentionStatus(0);
    }
}

const fetchSalesData = async (appID: string, queue: StorageActionsQueue) => {
    if (!(await hasPackageIDs(appID))) {
        console.log(`No package IDs for app ${appID}. Skipping sales data fetch.`);
        return;
    }

    // We do not check for missing dates because we can request all sales data at once
    queue.addToQueue(new StorageActionRequestSales(appID));
}

const fetchReviewsData = async (appID: string, queue: StorageActionsQueue) => {
    if (!(await hasPackageIDs(appID))) {
        console.log(`No package IDs for app ${appID}. Skipping reviews data fetch.`);
        return;
    }

    // We do not check for missing dates because reviews cannot be requested for certain dates.
    // We can request all reviews with couple requests in a single action
    queue.addToQueue(new StorageActionRequestReviews(appID));
}

const fetchWishlistConversionsData = async (appID: string, queue: StorageActionsQueue) => {
    if (!(await hasPackageIDs(appID))) {
        console.log(`No package IDs for app ${appID}. Skipping wishlist conversions data fetch.`);
        return;
    }

    // We do not check for missing dates because we can request all conversions data at once
    queue.addToQueue(new StorageActionRequestWishlistConversions(appID));
}

const fetchGeneralWishlistsData = async (appID: string, queue: StorageActionsQueue) => {
    const requestAllWishlists = new StorageActionRequestWishlists(appID);
    queue.addToQueue(requestAllWishlists);
}

const fetchRegionalWishlistsData = async (appID: string, queue: StorageActionsQueue) => {
    const pageCreationDate = await getPageCreationDate(appID, false) as Date;

    const now = new Date();
    const totalDays = Math.ceil((now.getTime() - pageCreationDate.getTime()) / (1000 * 60 * 60 * 24));
    const numRanges = 10;
    const daysPerRange = Math.ceil(totalDays / numRanges);

    for (let i = 0; i < numRanges; i++) {
        const start = new Date(pageCreationDate.getTime());
        start.setDate(pageCreationDate.getDate() + i * daysPerRange);
        let end = new Date(start.getTime());
        end.setDate(start.getDate() + daysPerRange - 1);
        if (end > now) end = new Date(now.getTime());

        const requestAllRegionalWishlists = new StorageActionRequestRegionalWishlists(appID, new DateRange(start, end));
        queue.addToQueue(requestAllRegionalWishlists);

        if (end >= now) return;
    }
}

const fetchDailyData = async (appIDs: string[], queue: StorageActionsQueue, offscreenManager: OffscreenManager) => {
    const missingTrafficDates: { appid: string, date: Date }[] = [];

    for (const appID of appIDs) {
        const trafficDates = await getMissingDatesForTraffic(appID, queue);

        for (const date of trafficDates) {
            missingTrafficDates.push({ appid: appID, date });
        }
    }

    // We sort dates in descending order because we want to request the most recent dates first so the user can use it
    missingTrafficDates.sort((a, b) => b.date.getTime() - a.date.getTime());

    console.debug(`Missing traffic dates:`, missingTrafficDates);

    const actionSettings = await makeActionSettings();

    for (const date of missingTrafficDates) {
        queue.addToQueue(new StorageActionRequestTraffic(date.appid, date.date, actionSettings));
    }
}

const makeActionSettings = async () => {
    const extSettings = await getBrowser().storage.local.get(Object.keys(defaultSettings));
    const actionSettings = new StorageActionSettings();
    actionSettings.minimalExecutionTime = extSettings.requestsMinPeriod || 1000;
    return actionSettings;
}

const getMissingDatesForTraffic = async (appID: string, queue: StorageActionsQueue) => {
    const pageCreationDate = await getPageCreationDate(appID, false) as Date;

    const dates = getDateRangeArray(new DateRange(pageCreationDate, getDateNoOffset()), true, false) as Date[];

    const trafficData = await readData(appID, 'Traffic') as DateTraffic[];

    let missingDates = [];

    if (trafficData === undefined || trafficData.length == 0) {
        missingDates = dates;
    }
    else {
        missingDates = dates.filter(date => {
            const alwaysUpdateDate = new Date();
            alwaysUpdateDate.setDate(alwaysUpdateDate.getDate() - 3);
            if (date > alwaysUpdateDate) {
                return true;
            }

            const dateString = dateToString(date);

            const hasData = trafficData.some((data: DateTraffic) => {
                // If page category is not a string, then the data is not valid or skipped for some reason
                if (typeof data.pageCategory !== 'string') {
                    return false;
                }
                const sameDate = data.date === dateString;
                return sameDate;
            });

            return !hasData;
        });
    }

    missingDates = filterDatesByRequestedDates(appID, 'RequestTraffic', missingDates, queue);

    return missingDates;
}

const getMissingDatesForRegionalWishlist = async (appID: string, queue: StorageActionsQueue) => {
    const pageCreationDate = await getPageCreationDate(appID, false) as Date;

    const dates = getDateRangeArray(new DateRange(pageCreationDate, getDateNoOffset()), true, false) as Date[];

    const regionalWishlistData = await readData(appID, 'WishlistsRegional') as DateWishlistRegional[];

    const alwaysUpdateDate = new Date();
    alwaysUpdateDate.setDate(alwaysUpdateDate.getDate() - 3);

    let missingDates = dates.filter(date => {
        if (date > alwaysUpdateDate) {
            return true;
        }

        const dateString = dateToString(date);
        return !regionalWishlistData.some((data: DateWishlistRegional) => {
            return data.date === dateString;
        });
    });


    return missingDates;
}

const filterDatesByRequestedDates = (appID: string, requestType: string, dates: Date[], queue: StorageActionsQueue) => {

    const relevantRequests = queue.getActionsByAppIDAndType(appID, requestType);

    const requestedDatesSet = new Set(
        relevantRequests.map((req: StorageAction) => {
            if (!('date' in req) || req.date === undefined) return undefined;
            return dateToString(req.date as Date);
        })
    );

    const missingDates = dates.filter(date => {
        const dateString = dateToString(date);
        return !requestedDatesSet.has(dateString);
    });

    return missingDates;
}
