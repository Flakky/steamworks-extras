import { getBrowser } from "../shared/browser";
import { getAppIDs, getPageCreationDate, parseDataFromPage } from "./bghelpers";
import { OffscreenManager } from "./offscreen/offscreenmanager";
import { setExtentionStatus } from "./status";

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
        console.warn(`No timestamp found for app ${appID}. Falling back to default page creation date.`);
        return null;
    }

    const date = new Date(timestamp * 1000);
    if (Number.isNaN(date.getTime())) {
        console.warn(`Invalid timestamp "${timestamp}" for app ${appID}. Falling back to default page creation date.`);
        return null;
    }

    if (date.getTime() > Date.now()) {
        console.warn(`Future timestamp "${timestamp}" for app ${appID}. Falling back to default page creation date.`);
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

    let result = await getBrowser().storage.local.get("pagesCreationDate");
    let pagesCreationDate = result.pagesCreationDate || {};

    // Get page ID by using redirect to edit page
    const redirect = await fetch(`https://partner.steamgames.com/admin/game/editbyappid/${appID}`);
    const pageID = redirect.url.split('/').pop();

    console.debug(`Page ID for app ${appID}: `, pageID);

    // Get first revision info
    const firstRevisionResponse = await fetch(`https://partner.steamgames.com/admin/game/ajaxgetapprevision/${pageID}/?revision=1`);
    const firstRevisionData = await firstRevisionResponse.json();
    console.debug(`First revision data for app ${appID}: `, firstRevisionData);

    let timestamp = parseRevisionTimestamp(firstRevisionData?.data);
    
    console.debug(`Parsed timestamp for app ${appID}: `, timestamp);

    let date = resolvePageCreationDateFromTimestamp(timestamp, appID);

    if(date === null) {
        date = await findPageCreationDateFromTrafficPage(appID, offscreenManager);
    }
    if(date === null) {
        console.error(`No page creation date found for app ${appID}. Falling back to default page creation date.`);
        date = new Date(Date.UTC(2014, 0, 1));
    }

    pagesCreationDate[appID] = date.toISOString();

    await getBrowser().storage.local.set({ 'pagesCreationDate': pagesCreationDate });

    console.log(`Page creation date for app ${appID}: `, date);

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

export const initPageCreationDatesWithRetry = async (interval = 5, offscreenManager: OffscreenManager) => {
    let success = false;
    while (!success) {
        try {
            await initPageCreationDates(offscreenManager);
            success = true;
        } catch (error) {
            console.error('Error during initPageCreationDates:', error);
            setExtentionStatus(102, { error: error instanceof Error ? error.message : 'Unknown error' });
            await new Promise(resolve => setTimeout(resolve, interval * 1000));
        }
    }
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
    return new Date(pageCreationDate);
}