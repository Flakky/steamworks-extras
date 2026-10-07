/**
 * @jest-environment node
 */
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

type DBModule = typeof import('../src/background/storage/db');

const DATABASE_NAME = 'SteamworksExtras_GameStatsStorage';

// db.ts keeps the connection in module state, so every "service worker start"
// gets a fresh copy of the module while the IndexedDB data stays the same.
const loadDB = (): DBModule => {
    let module: DBModule | undefined;
    jest.isolateModules(() => {
        module = require('../src/background/storage/db');
    });
    return module!;
}

const getDatabaseVersion = async (): Promise<number> => {
    const databases = await indexedDB.databases();
    return databases.find(db => db.name === DATABASE_NAME)?.version ?? 0;
}

beforeEach(() => {
    (globalThis as any).indexedDB = new IDBFactory();
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'debug').mockImplementation(() => { });
    jest.spyOn(console, 'warn').mockImplementation(() => { });
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe('initStorageForAppIDs', () => {
    test('creates stores of all apps in a single upgrade', async () => {
        const db = loadDB();

        await db.initStorageForAppIDs(['1', '2', '3']);
        await db.waitForDatabaseReady();

        expect(await getDatabaseVersion()).toBe(2);

        for (const appID of ['1', '2', '3']) {
            await db.writeData(appID, 'Reviews', [{ recommendationid: `${appID}-a` }]);
            expect(await db.readData(appID, 'Reviews')).toEqual([{ recommendationid: `${appID}-a` }]);
        }
    });

    test('does not upgrade the database again on the next start', async () => {
        const first = loadDB();
        await first.initStorageForAppIDs(['1', '2']);
        await first.writeData('1', 'Sales', [{ key: 0, date: '2026-01-01' }]);
        const version = await getDatabaseVersion();

        const second = loadDB();
        await second.initStorageForAppIDs(['1', '2']);
        await second.waitForDatabaseReady();

        expect(await getDatabaseVersion()).toBe(version);
        expect(await second.readData('1', 'Sales')).toEqual([{ key: 0, date: '2026-01-01' }]);
    });

    test('adds stores for a new app without losing existing data', async () => {
        const first = loadDB();
        await first.initStorageForAppIDs(['1']);
        await first.writeData('1', 'Reviews', [{ recommendationid: 'kept' }]);

        const second = loadDB();
        await second.initStorageForAppIDs(['1', '2']);
        await second.waitForDatabaseReady();

        expect(await second.readData('1', 'Reviews')).toEqual([{ recommendationid: 'kept' }]);
        expect(await second.readData('2', 'Reviews')).toEqual([]);
    });

    test('recreates a store with a wrong key path', async () => {
        await new Promise<void>((resolve, reject) => {
            const request = indexedDB.open(DATABASE_NAME, 1);
            request.onupgradeneeded = () => request.result.createObjectStore('1_Reviews', { keyPath: 'wrong' });
            request.onsuccess = () => { request.result.close(); resolve(); };
            request.onerror = () => reject(request.error);
        });

        const db = loadDB();
        await db.initStorageForAppIDs(['1']);
        await db.waitForDatabaseReady();

        await db.writeData('1', 'Reviews', [{ recommendationid: 'a' }]);
        expect(await db.readData('1', 'Reviews')).toEqual([{ recommendationid: 'a' }]);
    });
});

describe('waitForDatabaseReady', () => {
    test('waits until the storage is initialized', async () => {
        const db = loadDB();

        let ready = false;
        const waiting = db.waitForDatabaseReady().then(() => { ready = true; });

        await new Promise(resolve => setTimeout(resolve, 10));
        expect(ready).toBe(false);

        await db.initStorageForAppIDs(['1']);
        await waiting;

        expect(ready).toBe(true);
    });

    test('rejects when the storage failed to initialize', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => { });
        (globalThis as any).indexedDB = {
            open: () => {
                const request: any = {};
                setTimeout(() => {
                    request.error = new Error('Broken storage');
                    request.onerror?.();
                });
                return request;
            }
        };

        const db = loadDB();
        await db.initStorageForAppIDs(['1']);

        await expect(db.waitForDatabaseReady()).rejects.toThrow('Broken storage');
    });
});

describe('replaceData', () => {
    test('replaces all records', async () => {
        const db = loadDB();
        await db.initStorageForAppIDs(['1']);

        await db.writeData('1', 'Reviews', [{ recommendationid: 'old1' }, { recommendationid: 'old2' }]);
        await db.replaceData('1', 'Reviews', [{ recommendationid: 'new' }]);

        expect(await db.readData('1', 'Reviews')).toEqual([{ recommendationid: 'new' }]);
    });

    test('concurrent readers never see an empty table', async () => {
        const db = loadDB();
        await db.initStorageForAppIDs(['1']);

        await db.writeData('1', 'Reviews', [{ recommendationid: 'old' }]);

        const [, read] = await Promise.all([
            db.replaceData('1', 'Reviews', [{ recommendationid: 'new' }]),
            db.readData('1', 'Reviews'),
        ]);

        expect(read.length).toBe(1);
    });
});
