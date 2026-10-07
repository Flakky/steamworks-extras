import { setExtentionStatus } from '../status';

let gameStatsStorage: IDBDatabase | undefined;

const tables = [
    { name: 'Reviews', key: 'recommendationid' },
    { name: 'Wishlists', key: 'date' }, // Key is a combination of date and country
    { name: 'WishlistsRegional', key: ['date', 'country'] },
    { name: 'WishlistConversions', key: ['date', 'month'] },
    { name: 'Refunds', key: 'key' }, // Key is a hash of refund comment
    { name: 'Traffic', key: ['date', 'pageCategory', 'pageFeature'] },
    { name: 'Sales', key: 'key' } // Key is unique identifier
];

const DATABASE_NAME = 'SteamworksExtras_GameStatsStorage';
const DATABASE_READY_TIMEOUT = 60 * 1000;

// Resolved once the database has every object store for all known apps.
// Reads wait for this instead of polling a connection that may still be
// in the middle of a version upgrade.
let resolveStorageReady: () => void = () => { };
let rejectStorageReady: (reason?: any) => void = () => { };
const storageReady: Promise<void> = new Promise((resolve, reject) => {
    resolveStorageReady = resolve;
    rejectStorageReady = reject;
});
storageReady.catch(() => { }); // Rejection is reported to readers through waitForDatabaseReady

export const initStorageForAppIDs = async (appIDs: string[]) => {
    try {
        let db = await openDatabase();

        const storesToFix = getStoresToFix(db, appIDs);

        if (storesToFix.length > 0) {
            console.log(`Upgrading database to create or fix object stores: `, storesToFix.map(store => store.name));

            const newVersion = db.version + 1;
            db.close();

            // All stores of all apps are created in a single upgrade, so the
            // connection is never closed and reopened once per app.
            db = await openDatabase(newVersion, (upgradeDB) => {
                for (const store of storesToFix) {
                    if (upgradeDB.objectStoreNames.contains(store.name)) {
                        upgradeDB.deleteObjectStore(store.name);
                    }
                    upgradeDB.createObjectStore(store.name, { keyPath: store.key });
                }
            });
        }

        db.onversionchange = () => {
            console.warn('Database version change requested elsewhere. Closing the connection.');
            db.close();
            if (gameStatsStorage === db) gameStatsStorage = undefined;
        };

        gameStatsStorage = db;

        console.log(`Database initialized with version ${db.version} for apps: `, appIDs);

        resolveStorageReady();
    }
    catch (error) {
        console.error(`Error while initializing game stats storage: `, error);
        setExtentionStatus(103, { error: error instanceof Error ? error.message : `${error}` });
        rejectStorageReady(error);
    }
}

const openDatabase = (version?: number, upgrade?: (db: IDBDatabase) => void): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = version === undefined ? indexedDB.open(DATABASE_NAME) : indexedDB.open(DATABASE_NAME, version);

        request.onupgradeneeded = () => {
            if (upgrade) upgrade(request.result);
        };

        request.onsuccess = () => resolve(request.result);

        request.onerror = () => reject(request.error);

        request.onblocked = () => console.warn('Database open is blocked by another connection');
    });
}

const getStoresToFix = (db: IDBDatabase, appIDs: string[]): { name: string, key: string | string[] }[] => {
    const result: { name: string, key: string | string[] }[] = [];

    for (const appID of appIDs) {
        for (const table of tables) {
            const storeName = `${appID}_${table.name}`;
            if (!isObjectStoreCorrect(db, storeName, table.key)) {
                result.push({ name: storeName, key: table.key });
            }
        }
    }

    return result;
}

const isObjectStoreCorrect = (storage: IDBDatabase, storeName: string, expectedKeyPath: string | string[]) => {
    if (!storage.objectStoreNames.contains(storeName)) return false;

    const objectStore = storage.transaction(storeName, 'readonly').objectStore(storeName);

    if (Array.isArray(expectedKeyPath) && Array.isArray(objectStore.keyPath)) {
        const keyPath = objectStore.keyPath as string[];

        return expectedKeyPath.length === keyPath.length &&
            expectedKeyPath.every((key, index) => key === keyPath[index]);
    }
    return objectStore.keyPath === expectedKeyPath;
};

const deleteDatabase = async (): Promise<void> => {
    if (gameStatsStorage) {
        gameStatsStorage.close();
        gameStatsStorage = undefined;
    }

    const deleteRequest = indexedDB.deleteDatabase('SteamworksExtras_GameStatsStorage');

    return new Promise((resolve, reject) => {
        deleteRequest.onsuccess = () => {
            console.log("Database deleted successfully.");
            resolve();
        };

        deleteRequest.onerror = (event: Event) => {
            const target = (event.target as IDBOpenDBRequest)
            console.error("Error deleting database:", target.error);
            reject(target.error);
        };

        deleteRequest.onblocked = () => {
            console.warn("Delete blocked: The database is in use by another connection.");
            reject(new Error("Delete blocked"));
        };
    });
};

export const waitForDatabaseReady = async (): Promise<void> => {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    const timeout = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('Database is not ready')), DATABASE_READY_TIMEOUT);
    });

    try {
        await Promise.race([storageReady, timeout]);
    }
    finally {
        clearTimeout(timeoutHandle);
    }

    if (gameStatsStorage === undefined || gameStatsStorage === null) {
        throw new Error('Game stats storage is closed');
    }
}

export const readData = (appID: string, type: string, key: string | string[] | undefined = undefined, indexed: boolean = false): Promise<any> => {
    return new Promise((resolve, reject) => {
        if (gameStatsStorage === undefined || gameStatsStorage === null) {
            reject('Game stats storage is not initialized');
            return;
        }

        const dbName = `${appID}_${type}`;
        const transaction = gameStatsStorage.transaction(dbName, "readonly");
        const objectStore = transaction.objectStore(dbName);
        let request;

        if (key === undefined) {
            request = objectStore.getAll();
        }
        else if (indexed) {
            const index = objectStore.index(key as any);
            request = index.get(key);
        }
        else {
            request = objectStore.get(key);
        }

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
            const target = (event.target as IDBOpenDBRequest)
            reject(`Failed to read the database: ${target.error}`);
        };
    });
}

export const readIndexedData = (appID: string, type: string, key: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        if (gameStatsStorage === undefined || gameStatsStorage === null) {
            reject('Game stats storage is not initialized');
            return;
        }

        const dbName = `${appID}_${type}`;
        const transaction = gameStatsStorage.transaction(dbName, "readonly");
        const objectStore = transaction.objectStore(dbName);
        const request = key === undefined ? objectStore.getAll() : objectStore.get(key);

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
            const target = (event.target as IDBOpenDBRequest)
            reject(`Failed to read the database: ${target.error}`);
        };
    });
}

export const writeData = (appID: string, type: string, data: any): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (gameStatsStorage === undefined || gameStatsStorage === null) {
            reject('Game stats storage is not initialized');
            return;
        }

        const dbName = `${appID}_${type}`;
        const transaction = gameStatsStorage.transaction(dbName, "readwrite");
        const objectStore = transaction.objectStore(dbName);

        try {
            if (Array.isArray(data)) {
                for (const row of data) {
                    objectStore.put(row);
                }
            }
            else {
                objectStore.put(data);
            }
        }
        catch (e) {
            console.error(`Failed to write data to storage (${appID})"${type}": `, data, e);
        }

        transaction.oncomplete = () => {
            console.debug(`Data "${type}"(${appID}) written to storage: `, data);
            resolve();
        }

        transaction.onerror = (event) => {
            const target = (event.target as IDBOpenDBRequest)
            reject(`Failed to write to the database: ${target.error}`);
        };
    });
}

/**
 * Replaces all records of a table in a single transaction, so concurrent
 * readers see either the old or the new data and never an empty table.
 */
export const replaceData = (appID: string, type: string, data: any[]): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (gameStatsStorage === undefined || gameStatsStorage === null) {
            reject('Game stats storage is not initialized');
            return;
        }

        const dbName = `${appID}_${type}`;
        const transaction = gameStatsStorage.transaction(dbName, "readwrite");
        const objectStore = transaction.objectStore(dbName);

        objectStore.clear();
        for (const row of data) {
            objectStore.put(row);
        }

        transaction.oncomplete = () => {
            console.debug(`Data "${type}"(${appID}) replaced in storage: `, data);
            resolve();
        }

        transaction.onerror = () => {
            reject(`Failed to replace data in the database: ${transaction.error}`);
        };

        transaction.onabort = () => {
            reject(`Replacing data in the database was aborted: ${transaction.error}`);
        };
    });
}

export const mergeData = (appID: string, type: string, newData: any): Promise<void> => {
    console.debug(`Merging data: `, newData);

    return new Promise((resolve, reject) => {

        const tableType = tables.find(t => t.name === type);
        if (!tableType) {
            reject('Table type not found');
            return;
        }
        const tableKey = tableType.key;

        if (Array.isArray(newData)) {
            readData(appID, type).then(existingData => {
                let mergedData = [];

                for (const data of newData) {
                    const existingRow = existingData.find((d: any) => {
                        if (Array.isArray(tableKey)) {
                            return tableKey.every(key => d[key] === data[key]);
                        }
                        else {
                            return d[tableKey] === data[tableKey];
                        }
                    });

                    if (existingRow !== undefined) {
                        mergedData.push({ ...existingRow, ...data });
                    } else {
                        mergedData.push(data);
                    }
                }
                console.debug(`Merged data: `, mergedData);
                writeData(appID, type, mergedData).then(resolve).catch(reject);
            }).catch(reject);
        }
        else {
            const keys = Array.isArray(tableKey) ? tableKey : [tableKey];
            const keyValues = keys.map(key => newData[key]);
            readData(appID, type, keyValues).then(existingData => {
                const mergedData = { ...existingData, ...newData };
                writeData(appID, type, mergedData).then(resolve).catch(reject);
            });
        }
    });
}

export const clearData = (appID: string, type: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (gameStatsStorage === undefined || gameStatsStorage === null) {
            reject('Game stats storage is not initialized');
            return;
        }

        const dbName = `${appID}_${type}`;
        const transaction = gameStatsStorage.transaction(dbName, "readwrite");
        const objectStore = transaction.objectStore(dbName);
        const request = objectStore.clear();

        request.onsuccess = (event) => {
            resolve();
        };

        request.onerror = (event) => {
            const target = (event.target as IDBOpenDBRequest)
            reject(`Failed to clear the database: ${target.error}`);
        };
    });
}

export const clearAllData = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (gameStatsStorage) {
            gameStatsStorage.close();
            gameStatsStorage = undefined;
        }

        const deleteRequest = indexedDB.deleteDatabase('SteamworksExtras_GameStatsStorage');

        deleteRequest.onsuccess = function (event) {
            resolve();
        };

        deleteRequest.onerror = function (event) {
            const target = (event.target as IDBOpenDBRequest)
            console.error("Error deleting database:", target.error);
            reject(target.error);
        };

        deleteRequest.onblocked = function (event) {
            console.warn("Delete blocked: The database is in use by another connection.");
            reject();
        };
    });
}
