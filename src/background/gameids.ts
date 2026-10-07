import { getBrowser } from "../shared/browser";
import { getAppIDs, getPageCreationDate, parseDataFromPage } from "./bghelpers";
import { OffscreenManager } from "./offscreen/offscreenmanager";
import { setExtentionStatus } from "./status";
import { clampUntrustedPageDate, makeRecentFallbackDate, parseStoreReleaseDate } from "./pagecreationdate";

const parseTimestampFromKV = (source: string, key: string): number | null => {
    const match = source.match(new RegExp(`"${key}"\\s+"(\\d+)"`));
    if (!match || !match[1]) {
        return null;
    }

    const timestamp = Number(match[1]);
    if (!Number.isFinite(timestamp) || timestamp <= 0) {
        return null;
    }

    return timestamp;
}

const parseRevisionTimestamp = (revisionData: unknown): number | null => {
    if (typeof revisionData !== 'string') {
        return null;
    }

    const primaryTimestamp = parseTimestampFromKV(revisionData, 'last_published_time');
    if (primaryTimestamp !== null) {
        return primaryTimestamp;
    }

    // Some apps do not expose last_published_time.
    const fallbackCandidates = [
        parseTimestampFromKV(revisionData, 'time_created'),
        parseTimestampFromKV(revisionData, 'asset_mtime')
    ].filter((value): value is number => value !== null);

    if (fallbackCandidates.length === 0) {
        return null;
    }

    const nowTimestamp = Math.floor(Date.now() / 1000);
    const nonFutureCandidates = fallbackCandidates.filter(value => value <= nowTimestamp);

    if (nonFutureCandidates.length > 0) {
        return Math.min(...nonFutureCandidates);
    }

    return null;
}

const resolvePageCreationDateFromTimestamp = (timestamp: number | null, appID: string): Date | null => {
    if (timestamp === null) {
        console.warn(`No timestamp found for app ${appID}. Trying another date source.`);
        return null;
    }

    const date = new Date(timestamp * 1000);
    if (Number.isNaN(date.getTime())) {
        console.warn(`Invalid timestamp "${timestamp}" for app ${appID}. Trying another date source.`);
        return null;
    }

    if (date.getTime() > Date.now()) {
        console.warn(`Future timestamp "${timestamp}" for app ${appID}. Trying another date source.`);
        return null;
    }

    return date;
}

const initIDs = async (offscreenManager: OffscreenManager) => {
    console.log('Init AppIDs and PackageIDs');

    const appIDs = await initializeAppIDs(offscreenManager);
    if (!Array.isArray(appIDs) || appIDs.length === 0) {
        console.error('No appIDs found');
        return false;
    }

    // Get filtered appIDs (excluding ignored ones) for package ID initialization
    const filteredAppIDs = await getAppIDs();

    let packageIDs: Record<string, string[]> = {};
    for (const appID of filteredAppIDs) {
        const IDs = await initializePackageIDs(appID, offscreenManager);

        packageIDs[appID] = IDs;
    }

    console.log('AppIDs and PackageIDs have been initialized.', filteredAppIDs, packageIDs);

    return true;
}

export const initIDsWithRetry = async (interval = 5, offscreenManager: OffscreenManager) => {
    let success = false;
    while (!success) {
        try {
            success = await initIDs(offscreenManager);
        } catch (error) {
            console.error('Error during initIDs:', error);
        }
        if (!success) {
            console.log(`Retry initializing in ${interval} seconds...`);
            setExtentionStatus(101);
            await new Promise(resolve => setTimeout(resolve, interval * 1000));
        }
    }
}

const initPageCreationDate = async (appID: string, offscreenManager: OffscreenManager): Promise<Date | undefined> => {
    console.log('Parsing page creation date for appID: ', appID);

    let result = await getBrowser().storage.local.get(["pagesCreationDate", "pagesCreationDateSources"]);
    let pagesCreationDate = result.pagesCreationDate || {};
    let pagesCreationDateSources = result.pagesCreationDateSources || {};

    let date: Date | null = null;
    let dateSource = '';
    let pageID: string | null = null;
    let editPageHTML: string | null = null;

    try {
        // Get page ID by using redirect to edit page
        const redirect = await fetch(`https://partner.steamgames.com/admin/game/editbyappid/${appID}?l=english`);
        if (!redirect.ok) {
            throw new Error(`Edit page request failed with status ${redirect.status}`);
        }

        editPageHTML = await redirect.text();
        pageID = new URL(redirect.url).pathname.split('/').filter(Boolean).pop() || null;
        if (!pageID || !/^\d+$/.test(pageID)) {
            throw new Error(`Could not resolve a valid page ID from ${redirect.url}`);
        }

        console.debug(`Page ID for app ${appID}: `, pageID);
    } catch (error) {
        console.warn(`Could not load the edit page for app ${appID}.`, error);
    }

    if (pageID !== null) {
        try {
            // Get first revision info
            const firstRevisionResponse = await fetch(`https://partner.steamgames.com/admin/game/ajaxgetapprevision/${pageID}/?revision=1`);
            if (!firstRevisionResponse.ok) {
                throw new Error(`First revision request failed with status ${firstRevisionResponse.status}`);
            }

            const firstRevisionData = await firstRevisionResponse.json();
            console.debug(`First revision data for app ${appID}: `, firstRevisionData);

            const timestamp = parseRevisionTimestamp(firstRevisionData?.data);
            console.debug(`Parsed timestamp for app ${appID}: `, timestamp);

            date = resolvePageCreationDateFromTimestamp(timestamp, appID);
            if (date !== null) dateSource = 'first-revision';
        } catch (error) {
            console.warn(`Could not get the first revision date for app ${appID}.`, error);
        }
    }

    if (date === null && editPageHTML !== null) {
        try {
            const historyDate = await offscreenManager.parseDOM(editPageHTML, 'parsePageCreationDateFromHistory');
            const parsedHistoryDate = new Date(historyDate);
            if (!Number.isNaN(parsedHistoryDate.getTime()) && parsedHistoryDate.getTime() <= Date.now()) {
                date = parsedHistoryDate;
                dateSource = 'publish-history';
            }
        } catch (error) {
            console.warn(`Could not get the publish-history date for app ${appID}.`, error);
        }
    }

    if (date === null) {
        try {
            date = await findPageCreationDateFromStoreAPI(appID);
            if (date !== null) dateSource = 'store-release';
        } catch (error) {
            console.warn(`Could not get the Store release date for app ${appID}.`, error);
        }
    }

    if(date === null) {
        try {
            const trafficDate = await findPageCreationDateFromTrafficPage(appID, offscreenManager);
            if (trafficDate !== null) {
                date = clampUntrustedPageDate(trafficDate);
                dateSource = date.getTime() === trafficDate.getTime() ? 'traffic' : 'traffic-capped';
            }
        } catch (error) {
            console.warn(`Could not get the traffic start date for app ${appID}.`, error);
        }
    }
    if(date === null) {
        console.error(`No page creation date found for app ${appID}. Using a bounded recent fallback.`);
        date = makeRecentFallbackDate();
        dateSource = 'recent-fallback';
    }

    pagesCreationDate[appID] = date.toISOString();
    pagesCreationDateSources[appID] = dateSource;

    await getBrowser().storage.local.set({
        'pagesCreationDate': pagesCreationDate,
        'pagesCreationDateSources': pagesCreationDateSources
    });

    console.log(`Page creation date for app ${appID} (${dateSource}): `, date);

    return date;
}

const initPageCreationDates = async (offscreenManager: OffscreenManager) => {
    console.log('Init PageCreationDates');

    const appIDs = await getAppIDs();
    if (appIDs.length === 0) {
        console.error('No appIDs found.');
        return;
    }

    for (const appID of appIDs) {
        await initPageCreationDate(appID, offscreenManager);
    }

    console.log('PageCreationDates have been initialized.');
}

export const initPageCreationDatesWithRetry = async (interval = 5, offscreenManager: OffscreenManager, maxAttempts = 3) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            await initPageCreationDates(offscreenManager);
            return;
        } catch (error) {
            console.error('Error during initPageCreationDates:', error);
            setExtentionStatus(102, { error: error instanceof Error ? error.message : 'Unknown error' });
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, interval * 1000));
            }
        }
    }

    console.error(`Could not initialize page creation dates after ${maxAttempts} attempts. Continuing startup with stored/default dates.`);
}

const initializeAppIDs = async (offscreenManager: OffscreenManager): Promise<string[]> => {
    console.log('Parsing AppIDs');

    const appIDs = await parseDataFromPage('https://partner.steampowered.com/nav_games.php', 'parseAppIDs', offscreenManager);

    console.debug('All AppIDs from partner panel: ', appIDs);

    const nonRedirectedAppIDs = [];

    for (const appID of appIDs) {
        try {
            const response = await fetch(`https://store.steampowered.com/app/${appID}`, { redirect: 'manual' });

            console.log(`Checking appID ${appID} for redirection: `, response.status);

            if (response.status === 200) {
                nonRedirectedAppIDs.push(appID);
            }
        } catch (error) {
            console.error(`Error fetching appID ${appID}:`, error);
        }
    }

    console.debug('Non-redirected AppIDs:', nonRedirectedAppIDs);

    let currentAppIDs = await getBrowser().storage.local.get("appIDs");

    currentAppIDs = currentAppIDs.appIDs || [];
    const mergedAppIDs = [...new Set([...currentAppIDs, ...nonRedirectedAppIDs])];

    await getBrowser().storage.local.set({ appIDs: mergedAppIDs });

    console.log('AppIDs: ', mergedAppIDs);

    return mergedAppIDs;
}

const initializePackageIDs = async (appID: string, offscreenManager: OffscreenManager): Promise<string[]> => {
    console.log('Parsing PackageIDs for appID: ', appID);

    let packageIDsFound: string[] = [];

    try {
        packageIDsFound = await findPackageIDsFromAPI(appID);
    } catch (error) {
        console.error('Error getting package IDs from API:', error);
        try {
            packageIDsFound = await findPackageIDsFromPartnerPanel(appID, offscreenManager);
        } catch (error) {
            console.error('Error getting package IDs from partner panel:', error);
            return [];
        }
    }

    let result = await getBrowser().storage.local.get("packageIDs");

    let packageIDs = result.packageIDs === undefined ? {} : result.packageIDs;

    packageIDs[appID] = packageIDsFound;

    await getBrowser().storage.local.set({ packageIDs: packageIDs });

    console.log(`Package IDs have been updated for app ${appID}: `, packageIDs[appID]);

    return packageIDs;
}

const findPackageIDsFromAPI = async (appID: string): Promise<string[]> => {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appID}`;

    console.log(`Fetching package IDs from URL: ${url}`);

    const response = await fetch(url, { credentials: 'omit' });
    if (!response.ok) throw new Error('Network response was not ok');

    const data = await response.json();
    const appData = data[appID];

    if (!appData || !appData.data || !appData.data.packages) {
        throw new Error('Package IDs request returned no data');
    }

    return appData.data.packages;
}

const findPackageIDsFromPartnerPanel = async (appID: string, offscreenManager: OffscreenManager): Promise<string[]> => {
    const url = `https://partner.steamgames.com/apps/associated/${appID}`;

    const packageIDs = await parseDataFromPage(url, 'parsePackageIDs', offscreenManager);

    if (packageIDs.length === 0) {
        throw new Error('No package IDs found from partner panel');
    }

    return packageIDs;
}

const findPageCreationDateFromTrafficPage = async (appID: string, offscreenManager: OffscreenManager): Promise<Date | null> => {
    console.log(`Fetching page creation date from traffic page for appID: ${appID}`);

    const url = `https://partner.steamgames.com/apps/navtrafficstats/${appID}?attribution_filter=all&preset_date_range=lifetime`;
    const pageCreationDate = await parseDataFromPage(url, 'parsePageCreationDate', offscreenManager);
    const date = pageCreationDate instanceof Date ? pageCreationDate : new Date(pageCreationDate);

    if (Number.isNaN(date.getTime()) || date.getTime() > Date.now()) {
        return null;
    }

    return date;
}

const findPageCreationDateFromStoreAPI = async (appID: string): Promise<Date | null> => {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appID}&l=english&cc=us`;
    const response = await fetch(url, { credentials: 'omit' });
    if (!response.ok) {
        throw new Error(`Store API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return parseStoreReleaseDate(data?.[appID]?.data?.release_date);
}
