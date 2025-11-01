import { getBrowser } from "../shared/browser";
import { getAppIDs, getPageCreationDate, parseDataFromPage } from "./bghelpers";
import { OffscreenManager } from "./offscreen/offscreenmanager";
import { setExtentionStatus } from "./status";

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
      const IDs = await initializePackageIDs(appID);
  
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
  
    const url = `https://partner.steamgames.com/apps/navtrafficstats/${appID}?attribution_filter=all&preset_date_range=lifetime`;
    const pageCreationDate = await parseDataFromPage(url, 'parsePageCreationDate', offscreenManager);
    const date = new Date(pageCreationDate);
  
    if (date === undefined || !(date instanceof Date)) return undefined;
  
    pagesCreationDate[appID] = date.toISOString();
  
    await getBrowser().storage.local.set({ 'pagesCreationDate': pagesCreationDate });
  
    console.log(`Page creation date for ${appID}: `, date);
  
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

const initializePackageIDs = async (appID: string): Promise<string[]> => {
    console.log('Parsing PackageIDs for appID: ', appID);

    const url = `https://store.steampowered.com/api/appdetails?appids=${appID}`;

    console.log(`Fetching package IDs from URL: ${url}`);

    const response = await fetch(url, { credentials: 'omit' });
    if (!response.ok) throw new Error('Network response was not ok');

    const data = await response.json();
    const appData = data[appID];

    if(!appData || !appData.data || !appData.data.packages){
        throw new Error('Package IDs request returned no data');
    }
  
    let result = await getBrowser().storage.local.get("packageIDs");
  
    let packageIDs = result.packageIDs === undefined ? {} : result.packageIDs;
  
    packageIDs[appID] = appData.data.packages;
  
    await getBrowser().storage.local.set({ packageIDs: packageIDs });
  
    console.log(`Package IDs have been updated for app ${appID}: `, packageIDs[appID]);

    return packageIDs[appID];
}