import { getBrowser } from '../shared/browser';
import { OffscreenManager, OffscreenParseResponse } from './offscreen/offscreenmanager';
import { StorageActionsQueue } from './storage/storagequeue';
import { parseDataFromPage, getAppIDs, makeRequest, getPageCreationDate } from './bghelpers';
import { updateStats, updateStatsStatus } from './statsupdater';
import { getStatus } from './status';
import { getDataFromDB } from './storage/storage';
import { DateRange } from '../shared/types/daterange';
import { BackgroundMessage, BackgroundMessageType, BACKGROUND_ERROR_KEY } from '../shared/types/background_requests';

export class InitMessageListenerContext {
    queue: StorageActionsQueue;
    offscreenManager: OffscreenManager;
    offscreenReady: Promise<void>;

    constructor(queue: StorageActionsQueue, offscreenManager: OffscreenManager, offscreenReady: Promise<void>) {
        this.queue = queue;
        this.offscreenManager = offscreenManager;
        this.offscreenReady = offscreenReady;
    }
}

const handleMessage = async (message: BackgroundMessage, context: InitMessageListenerContext): Promise<any> => {
    switch (message.request) {
        case BackgroundMessageType.showOptions:
            getBrowser().runtime.openOptionsPage();
            return {};
        case BackgroundMessageType.makeRequest:
            return await makeRequest(message.payload.url, message.payload.params);
        case BackgroundMessageType.getAppIDs:
            return await getAppIDs();
        case BackgroundMessageType.getPackageIDs:
            return (await getBrowser().storage.local.get("packageIDs")).packageIDs;
        case BackgroundMessageType.getPageCreationDates:
            return await getBrowser().storage.local.get("pagesCreationDate");
        case BackgroundMessageType.getQueueLenght:
            return context.queue.getQueueLength();
        case BackgroundMessageType.getStatus:
            return getStatus();
        case BackgroundMessageType.getData: {
            let dateRange;
            if (message.payload.dateStart === undefined || message.payload.dateEnd === undefined) {
                dateRange = new DateRange(await getPageCreationDate(message.payload.appId, false) as Date, new Date());
            }
            else {
                dateRange = new DateRange(new Date(message.payload.dateStart), new Date(message.payload.dateEnd))
            }
            const data = await getDataFromDB(message.payload.type, message.payload.appId, dateRange, message.payload.returnLackData);
            console.debug(`Returning "${message.payload.type}" data from background: `, data);
            return data;
        }
        case BackgroundMessageType.parseDOM: {
            await context.offscreenReady;
            let data;
            if (message.payload.htmlText) {
                data = await context.offscreenManager.parseDOM(message.payload.htmlText, message.payload.type);
            }
            else if (message.payload.url) {
                data = await parseDataFromPage(message.payload.url, message.payload.type, context.offscreenManager);
            }
            else {
                throw new Error('No HTML text or URL provided to parse DOM');
            }
            console.debug(`Returning DOM parsed "${message.payload.type}" data from background: `, data);
            return data;
        }
        case BackgroundMessageType.updateStats: {
            const appIDs = await getAppIDs();
            await updateStats(appIDs, { queue: context.queue, offscreenManager: context.offscreenManager });
            updateStatsStatus(context.queue);
            return {};
        }
    }
}

/**
 * Must be called synchronously during the service worker startup. When a page
 * wakes up a stopped service worker, Chrome dispatches the message right after
 * the top-level script finishes, so a listener added after any await misses it.
 */
export const initMessageListener = (context: InitMessageListenerContext) => {
    console.log('Initializing message listener');
    getBrowser().runtime.onMessage.addListener((message: BackgroundMessage, sender: any, sendResponse: (response: any) => void) => {

        console.debug(`Background message: `, message);

        if (message.request === BackgroundMessageType.parsedDOM) {
            context.offscreenManager.processParsedDOM(message.payload as OffscreenParseResponse);
            return false;
        }

        if (!Object.values(BackgroundMessageType).includes(message.request)) {
            console.debug(`Unknown request from background`);
            sendResponse({ error: "Unknown request" });
            return false;
        }

        // Always answer, otherwise the page waits for a response forever
        handleMessage(message, context)
            .then(response => sendResponse(response))
            .catch(error => {
                console.error(`Failed to handle background message "${message.request}": `, error);
                sendResponse({ [BACKGROUND_ERROR_KEY]: error instanceof Error ? error.message : `${error}` });
            });

        return true;
    });
}
