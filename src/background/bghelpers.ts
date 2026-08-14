import { getBrowser } from '../shared/browser';
import { dateToString } from '../scripts/helpers';
import { OffscreenManager } from './offscreen/offscreenmanager';
import { makeRecentFallbackDate } from './pagecreationdate';


/**
 * Returns the page creation date of a given appID.
 *
 * @param {string} appID - AppID of the game
 * @param {boolean} stringify - [Optional] If true, the date will be returned as a string
 * @returns {Date} - Page creation date
 */
export const getPageCreationDate = async (appID: string, stringify: boolean = false): Promise<Date | string> => {
    const pagesCreationDate = await getBrowser().storage.local.get("pagesCreationDate");
    const storedDate = pagesCreationDate?.pagesCreationDate?.[appID];
    const parsedDate = storedDate ? new Date(storedDate) : new Date(Number.NaN);
    const pageCreationDate = Number.isNaN(parsedDate.getTime()) ? makeRecentFallbackDate() : parsedDate;

    if (stringify) return dateToString(pageCreationDate);

    return pageCreationDate;
}

/**
 * Returns the package IDs of a given appID.
 *
 * @param {string} appID - AppID of the game
 * @returns {Array} - Package IDs
 */
export const getAppPackageIDs = async (appID: string): Promise<string[]> => {
    const PackageIDsResult = await getBrowser().storage.local.get("packageIDs");
    const packageIDs = PackageIDsResult.packageIDs[appID] || [];

    return packageIDs;
}

/**
 * Returns the package IDs of a given appID.
 *
 * @param {string} appID - AppID of the game
 * @returns {Array} - Package IDs
 */
export const getPackageIDs = async (appID: string): Promise<string[]> => {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appID}`;

    console.log(`Fetching package IDs from URL: ${url}`);

    const response = await fetch(url, { credentials: 'omit' });
    if (!response.ok) throw new Error('Network response was not ok');

    const data = await response.json();
    const appData = data[appID];

    if (!appData) {
        throw new Error('Package IDs request returned no data');
    }

    if (appData.data.packages) {
        return appData.data.packages;
    }

    return [];
}

/**
 * Checks if the app has package IDs.
 *
 * @param {string} appID - AppID of the game
 * @returns {boolean} - True if the app has package IDs, false otherwise
 */
export const hasPackageIDs = async (appID: string): Promise<boolean> => {
    const packageIDs = await getAppPackageIDs(appID);
    return packageIDs !== undefined && Array.isArray(packageIDs) && packageIDs.length > 0;
}

/**
 * Returns the app IDs.
 *
 * @returns {Array} - App IDs
 */
export const getAppIDs = async (includeIgnored: boolean = false): Promise<string[]> => {
    let result = await getBrowser().storage.local.get("appIDs");

    let appIDs = result.appIDs || [];

    if (includeIgnored) {
        return appIDs;
    }

    const ignoredResult = await getBrowser().storage.local.get("ignoredAppIDs");
    const ignoredAppIDs: string[] = ignoredResult.ignoredAppIDs || [];

    if (ignoredAppIDs.length > 0) {
        appIDs = appIDs.filter((appID: string) => !ignoredAppIDs.includes(appID));
    }

    return appIDs;
}

/**
 * Parses data from a given URL.
 *
 * @param {string} url - URL to parse data from
 * @param {string} request - Request type. Must be a valid request type for the parser.parseDocument.
 * @returns {Promise} - Promise with the parsed data
 */
export const parseDataFromPage = async (url: string, request: string, offscreenManager: OffscreenManager): Promise<any> => {
    console.debug(`Getting data "${request}" from URL: ${url}`);

    const response = await fetch(url);

    if (!response.ok) throw new Error('Network response was not ok');

    const htmlText = await response.text();

    const parsedData = await offscreenManager.parseDOM(htmlText, request);

    console.debug(`Data result from parsing for "${request}": `, parsedData);

    return parsedData;
}

export const makeRequest = async (url: string, params: RequestInit): Promise<string> => {
    console.debug(`Make request to ${url}`);

    const response = await fetch(url, params);
    if (!response.ok) throw new Error('Network response was not ok');

    console.log(response);

    const responseText = await response.text();

    console.log(responseText);

    return responseText;
}

/**
 * Map object fields to a new object using a field map.
 *
 * @param {any} obj - Object to map
 * @param {Record<string, keyof T>} fieldMap - Field map
 * @returns {T} Mapped object
 */
export const mapObject = <T>(obj: any, fieldMap: Record<string, keyof T>): T => {
    const result: any = obj;
    Object.keys(obj).forEach((key) => {

        if (key in fieldMap) {
            result[fieldMap[key] as keyof T] = obj[key];
            delete result[key];
        }
        else {
            result[key] = obj[key];
        }
    });
    return result as T;
}
