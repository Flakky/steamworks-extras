import { getBrowser } from '../../shared/browser';
import { parseDocument } from '../../scripts/parser';

export class OffscreenParseResponse {
    id: string;
    request: string;
    result: string;
    success: boolean;

    constructor(id: string, request: string, result: any, success: boolean) {
        this.id = id;
        this.request = request;
        this.result = result;
        this.success = success;
    }
}

export class OffscreenParsingAction {
    id: string;
    resolve: (result: any) => void;
    reject: (error: any) => void;

    constructor(id: string, resolve: (result: any) => void, reject: (error: any) => void) {
        this.id = id;
        this.resolve = resolve;
        this.reject = reject;
    }
}

export class OffscreenManager {
    parsingQueue: OffscreenParsingAction[];
    offscreenInitialized: boolean;

    constructor() {
        this.parsingQueue = [];
        this.offscreenInitialized = false;
    }

    parseDOM = (htmlText: string, request: string): Promise<any> => {
        return new Promise((resolve, reject) => {

            console.debug('Parsing DOM started: ', request);

            if (getBrowser().offscreen === undefined) {
                try {
                    const result = parseDocument(htmlText, request);

                    console.debug('Parsing DOM completed', result);

                    if (result.success) resolve(result.result);
                    else reject(new Error(result.result));
                }
                catch (error) {
                    reject(error);
                }
            }
            else {
                const id = crypto.randomUUID();
                let settled = false;
                const removeAction = () => {
                    this.parsingQueue = this.parsingQueue.filter(action => action.id !== id);
                };
                const timeoutHandle = setTimeout(() => {
                    if (settled) return;
                    settled = true;
                    removeAction();
                    reject(new Error(`DOM parsing timed out for "${request}"`));
                }, 15000);
                const resolveOnce = (result: any) => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timeoutHandle);
                    resolve(result);
                };
                const rejectOnce = (error: any) => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timeoutHandle);
                    reject(error);
                };

                this.parsingQueue.push(new OffscreenParsingAction(id, resolveOnce, rejectOnce));

                Promise.resolve(getBrowser().runtime.sendMessage({
                    parseDOMId: id,
                    action: request,
                    htmlText: htmlText
                })).catch(error => {
                    removeAction();
                    rejectOnce(error);
                });
            }
        });
    }

    processParsedDOM = (message: OffscreenParseResponse) => {
        console.debug('Processing parsed DOM message: ', message);

        if (message === undefined || message.id === undefined) {
            console.warn('Invalid parsed DOM message received: ', message);
            return;
        }

        console.debug('Parsing DOM completed', message.result);

        const { id, result, success } = message;

        const parsingActionIndex = this.parsingQueue.findIndex(action => action.id === id);
        const parsingAction = this.parsingQueue[parsingActionIndex];
        if (!parsingAction) {
            console.warn('Parsing action not found in queue: ', id);
            return;
        }

        this.parsingQueue.splice(parsingActionIndex, 1);

        if (message.success) parsingAction.resolve(result);
        else parsingAction.reject(new Error(result || `DOM parsing failed for "${message.request}"`));
    }

}

export const initOffscreen = async () => {
    if (getBrowser().offscreen === undefined) {
        console.warn('Offscreen is not supported by this browser');
        return;
    }

    const offscreenUrl = getBrowser().runtime.getURL('background/offscreen/offscreen.html');

    const existingOffscreen = await getBrowser().runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [offscreenUrl]
    });

    console.debug('Existing offscreen contexts: ', existingOffscreen);

    if (existingOffscreen.length > 0) {
        console.warn('Offscreen document already exists, reusing it');
        return;
    }

    try {
        await getBrowser().offscreen.createDocument({
            url: offscreenUrl,
            reasons: [getBrowser().offscreen.Reason.DOM_PARSER],
            justification: 'Parse HTML using DOM in background script'
        });
    }
    catch (error) {
        console.error('Error creating offscreen document: ', error);
        return;
    }

    console.debug('Offscreen document created');
}
