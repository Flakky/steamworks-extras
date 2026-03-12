import { getBrowser } from '../shared/browser';
import { OffscreenManager, OffscreenParseResponse } from './offscreen/offscreenmanager';
import { StorageActionsQueue } from './storage/storagequeue';
import { parseDataFromPage, getAppIDs, makeRequest, getPageCreationDate } from './bghelpers';
import { updateStats, updateStatsStatus } from './statsupdater';
import { getStatus } from './status';
import { getDataFromDB } from './storage/storage';
import { DateRange } from '../shared/types/daterange';
import { BackgroundMessage, BackgroundMessageType } from '../shared/types/background_requests';

class InitMessageListenerContext {
    queue: StorageActionsQueue;
    offscreenManager: OffscreenManager;

    constructor(queue: StorageActionsQueue, offscreenManager: OffscreenManager) {
        this.queue = queue;
        this.offscreenManager = offscreenManager;
    }
}

export const initMessageListener = (context: InitMessageListenerContext) => {
    console.log('Initializing message listener');
    getBrowser().runtime.onMessage.addListener((message: BackgroundMessage, sender: any, sendResponse: (response: any) => void) => {

        console.debug(`Background message: `, message);

        switch (message.request) {
            case BackgroundMessageType.showOptions:
                {
                    (async () => {
                        getBrowser().runtime.openOptionsPage();
                        sendResponse({});
                    })(); break;
                };
            case BackgroundMessageType.makeRequest:
                {
                    (async () => {
                        const response = await makeRequest(message.payload.url, message.payload.params);
                        sendResponse(response);
                    })(); break;
                };
            case BackgroundMessageType.getAppIDs:
                {
                    (async () => {
                        const response = await getAppIDs();
                        sendResponse(response);
                    })(); break;
                };
            case BackgroundMessageType.getPackageIDs:
                {
                    (async () => {
                        let result = await getBrowser().storage.local.get("packageIDs");

                        sendResponse(result.packageIDs);
                    })(); break;
                };
            case BackgroundMessageType.getPageCreationDates:
                {
                    (async () => {
                        let result = await getBrowser().storage.local.get("pagesCreationDate");

                        sendResponse(result);
                    })(); break;
                };
            case BackgroundMessageType.getQueueLenght:
                {
                    (async () => {
                        const length = context.queue.getQueueLength();
                        sendResponse(length);
                    })(); break;
                };
            case BackgroundMessageType.getStatus:
                {
                    (async () => {
                        const status = await getStatus();
                        sendResponse(status);
                    })(); break;
                };
            case BackgroundMessageType.getData:
                {
                    (async () => {
                        let dateRange;
                        if (message.payload.dateStart === undefined || message.payload.dateEnd === undefined) {
                            dateRange = new DateRange(await getPageCreationDate(message.payload.appId, false) as Date, new Date());
                        }
                        else {
                            dateRange = new DateRange(new Date(message.payload.dateStart), new Date(message.payload.dateEnd))
                        }
                        const data = await getDataFromDB(context.queue, message.payload.type, message.payload.appId, dateRange, message.payload.returnLackData);
                        console.debug(`Returning "${message.payload.type}" data from background: `, data);
                        sendResponse(data);
                    })(); break;
                };
            case BackgroundMessageType.parseDOM:
                {
                    (async () => {
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
                        sendResponse(data);
                    })(); break;
                };
            case BackgroundMessageType.parsedDOM:
                {
                    context.offscreenManager.processParsedDOM(message.payload as OffscreenParseResponse);
                    break;
                }
            case BackgroundMessageType.updateStats:
                {
                    (async () => {
                        const appIDs = await getAppIDs();
                        await updateStats(appIDs, { queue: context.queue, offscreenManager: context.offscreenManager });
                        updateStatsStatus(context.queue);
                        sendResponse({});
                    })(); break;
                };
            default:
                {
                    console.debug(`Unknown request from background`);
                    sendResponse({ error: "Unknown request" });
                    return false;
                }
        }
        return true;
    });
}
