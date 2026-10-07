jest.mock('../src/shared/browser');
jest.mock('../src/background/storage/storage');

import { getBrowser } from '../src/shared/browser';
import { getDataFromDB } from '../src/background/storage/storage';
import { initMessageListener } from '../src/background/messagelistener';
import { OffscreenManager } from '../src/background/offscreen/offscreenmanager';
import { StorageActionsQueue } from '../src/background/storage/storagequeue';
import { BACKGROUND_ERROR_KEY, BackgroundMessageType, GetDataType } from '../src/shared/types/background_requests';

describe('initMessageListener', () => {
    let listener: (message: any, sender: any, sendResponse: (response: any) => void) => boolean;

    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'debug').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });

        (getBrowser as jest.Mock).mockReturnValue({
            runtime: {
                onMessage: { addListener: (callback: any) => { listener = callback; } },
            },
        });

        initMessageListener({
            queue: new StorageActionsQueue(),
            offscreenManager: new OffscreenManager(),
            offscreenReady: Promise.resolve(),
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    const send = (message: any): Promise<any> => {
        return new Promise(resolve => {
            const keepOpen = listener(message, {}, resolve);
            expect(keepOpen).toBe(true);
        });
    }

    const getDataMessage = {
        request: BackgroundMessageType.getData,
        payload: { type: GetDataType.Reviews, appId: '1', dateStart: '2010-01-01', dateEnd: '2099-12-31', returnLackData: true },
    };

    test('responds with data', async () => {
        (getDataFromDB as jest.Mock).mockResolvedValue([{ recommendationid: '1' }]);

        await expect(send(getDataMessage)).resolves.toEqual([{ recommendationid: '1' }]);
    });

    test('responds with an error instead of leaving the page waiting forever', async () => {
        (getDataFromDB as jest.Mock).mockRejectedValue(new Error('Storage action timed out'));

        await expect(send(getDataMessage)).resolves.toEqual({ [BACKGROUND_ERROR_KEY]: 'Storage action timed out' });
    });

    test('responds to unknown requests', () => {
        const sendResponse = jest.fn();

        listener({ request: 'unknown' }, {}, sendResponse);

        expect(sendResponse).toHaveBeenCalledWith({ error: 'Unknown request' });
    });
});
