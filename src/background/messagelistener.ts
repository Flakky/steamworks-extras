import { getBrowser } from '../shared/browser';
import { OffscreenManager, OffscreenParseResponse } from './offscreen/offscreenmanager';
import { StorageActionsQueue } from './storage/storagequeue';
import { parseDataFromPage, getAppIDs, makeRequest } from './bghelpers';
import { updateStats, updateStatsStatus } from './statsupdater';
import { getStatus } from './status';
import { getDataFromDB } from './storage/storage';

class InitMessageListenerContext {
    queue: StorageActionsQueue;
    offscreenManager: OffscreenManager;

    constructor(queue: StorageActionsQueue, offscreenManager: OffscreenManager) {
        this.queue = queue;
        this.offscreenManager = offscreenManager;
    }
}

export type BackgroundMessage =
    | { request: BackgroundMessageType.showOptions }
    | { request: BackgroundMessageType.makeRequest; url: string; params?: any }
    | { request: BackgroundMessageType.getAppIDs }
    | { request: BackgroundMessageType.getPackageIDs }
    | { request: BackgroundMessageType.getPageCreationDates }
    | { request: BackgroundMessageType.getQueueLenght }
    | { request: BackgroundMessageType.getStatus }
    | {
        request: BackgroundMessageType.getData;
        type: 'Traffic' | 'Sales' | 'Reviews' | 'Wishlists' | 'WishlistConversions';
        appId: string;
        dateStart: string;
        dateEnd: string;
        returnLackData?: boolean;
    }
    | { request: BackgroundMessageType.parseDOM; htmlText?: string; url: string; type: string }
    | { request: BackgroundMessageType.parsedDOM } & OffscreenParseResponse // OffscreenParseResponse - defined in offscreenmanager
    | { request: BackgroundMessageType.updateStats };

export enum BackgroundMessageType {
    showOptions = "showOptions",
    makeRequest = "makeRequest",
    getAppIDs = "getAppIDs",
    getPackageIDs = "getPackageIDs",
    getPageCreationDates = "getPageCreationDates",
    getQueueLenght = "getQueueLenght",
    getStatus = "getStatus",
    getData = "getData",
    parseDOM = "parseDOM",
    parsedDOM = "parsedDOM",
    updateStats = "updateStats"
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
                        const response = await makeRequest(message.url, message.params);
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
                        const data = await getDataFromDB(context.queue, message.type, message.appId, new Date(message.dateStart), new Date(message.dateEnd), message.returnLackData);
                        console.debug(`Returning "${message.type}" data from background: `, data);
                        sendResponse(data);
                    })(); break;
                };
            case BackgroundMessageType.parseDOM:
                {
                    (async () => {
                        const data = message.htmlText
                            ? await context.offscreenManager.parseDOM(message.htmlText, message.type)
                            : await parseDataFromPage(message.url, message.type, context.offscreenManager);
                        console.debug(`Returning DOM parsed "${message.type}" data from background: `, data);
                        sendResponse(data);
                    })(); break;
                };
            case BackgroundMessageType.parsedDOM:
                {
                    context.offscreenManager.processParsedDOM(message as OffscreenParseResponse);
                    break;
                }
            case BackgroundMessageType.updateStats:
                {
                    (async () => {
                        const appIDs = await getAppIDs();
                        updateStats(appIDs, { queue: context.queue, offscreenManager: context.offscreenManager });
                        updateStatsStatus(context.queue);
                        return appIDs;
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
