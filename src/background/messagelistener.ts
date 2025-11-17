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

export const initMessageListener = (context: InitMessageListenerContext) => {
  console.log('Initializing message listener');
  getBrowser().runtime.onMessage.addListener((message: any, sender: any, sendResponse: (response: any) => void) => {
    console.debug(`Background message: `, message);

    switch (message.request) {
      case "showOptions":
        {
          (async () => {
            getBrowser().runtime.openOptionsPage();
            sendResponse({});
          })(); break;
        };
      case "makeRequest":
        {
          (async () => {
            const response = await makeRequest(message.url, message.params);
            sendResponse(response);
          })(); break;
        };
      case "getAppIDs":
        {
          (async () => {
            const response = await getAppIDs();
            sendResponse(response);
          })(); break;
        };
      case "getPackageIDs":
        {
          (async () => {
            let result = await getBrowser().storage.local.get("packageIDs");

            sendResponse(result.packageIDs);
          })(); break;
        };
      case "getPageCreationDates":
        {
          (async () => {
            let result = await getBrowser().storage.local.get("pagesCreationDate");

            sendResponse(result);
          })(); break;
        };
      case "getQueueLenght":
        {
          (async () => {
            const length = context.queue.getQueueLength();
            sendResponse(length);
          })(); break;
        };
      case "getStatus":
        {
          (async () => {
            const status = await getStatus();
            sendResponse(status);
          })(); break;
        };
      case "getData":
        {
          (async () => {
            const data = await getDataFromDB(message.type, message.appId, message.dateStart, message.dateEnd, message.returnLackData);
            console.debug(`Returning "${message.type}" data from background: `, data);
            sendResponse(data);
          })(); break;
        };
      case "parseDOM":
        {
          (async () => {
            const data = message.htmlText
              ? await context.offscreenManager.parseDOM(message.htmlText, message.type)
              : await parseDataFromPage(message.url, message.type, context.offscreenManager);
            console.debug(`Returning DOM parsed "${message.type}" data from background: `, data);
            sendResponse(data);
          })(); break;
        };
      case "parsedDOM":
        {
          context.offscreenManager.processParsedDOM(message as OffscreenParseResponse);
          break;
        }
      case "updateStats":
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
          console.debug(`Unknown request "${message.request}" from background`);
          sendResponse({ error: "Unknown request" });
          return false;
        }
    }
    return true;
  });
}
