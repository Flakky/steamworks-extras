import { setExtentionStatus } from '../status';


let gameStatsStorage: IDBDatabase | undefined;

const tables = [
  { name: 'Reviews', key: 'recommendationid' },
  { name: 'Wishlists', key: 'Date' }, // Key is a combination of date and country
  { name: 'WishlistConversions', key: ['Date', 'MonthCohort'] },
  { name: 'Refunds', key: 'key' }, // Key is a hash of refund comment
  { name: 'Traffic', key: ['Date', 'PageCategory', 'PageFeature'] },
  { name: 'Sales', key: 'key' } // Key is unique identifier
];

const MAX_RETRY_COUNT = 200;

export const initStorageForAppIDs = async (appIDs: string[]) => {
  for (const appID of appIDs) {
    try {
      await initGameStatsStorage(appID, 1);
    }
    catch (error) {
      console.error(`Error while initializing game stats storage for app ${appID}: `, error);
      setExtentionStatus(103, { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
}

const initGameStatsStorage = (appID: string, index: number): Promise<void> => {
  if (gameStatsStorage) {
    gameStatsStorage.close();
    gameStatsStorage = undefined;
  }

  console.log(`Initializing game stats storage for app ${appID} with index ${index}`);

  return new Promise((resolve, reject) => {
    console.log(`Init database for app ${appID} with index ${index}`);

    gameStatsStorage = undefined;

    if (index > MAX_RETRY_COUNT) {
      console.error(`Max retry count on DB open reached for app ${appID}`);
      reject();
      return;
    }

    let request: IDBOpenDBRequest | undefined = indexedDB.open("SteamworksExtras_GameStatsStorage", index);

    request.onsuccess = (event) => {
      if (request === undefined) return;
      request = undefined;

      console.log(`Database opened with index ${index}`);

      gameStatsStorage = (event.target as IDBOpenDBRequest).result;

      if (!gameStatsStorage) {
        console.debug(`Database is not valid for app ${appID} with index ${index}. Trying next index...`);
        initGameStatsStorage(appID, index + 1).then(resolve).catch(reject);
      }

      // Check for storage correct format
      if (gameStatsStorage.objectStoreNames.length > 0) {
        for (const table of tables) {
          const storeName = `${appID}_${table.name}`;
          if (!isObjectStoreCorrect(gameStatsStorage, storeName, table.key)) {
            console.warn(`Object store "${storeName}" is not correct. Closing and reopening the database...`);
            gameStatsStorage.close();
            gameStatsStorage = undefined;
            initGameStatsStorage(appID, index + 1).then(resolve).catch(reject);
            return;
          }
        }
      }

      console.log(`Database initialized for app ${appID} with index ${index}`);
      console.debug(gameStatsStorage.objectStoreNames);

      resolve();
    }

    request.onupgradeneeded = (event) => {
      if (request === undefined || request === null) return;
      request = undefined;

      gameStatsStorage = (event.target as IDBOpenDBRequest).result;

      console.debug(`Database update for app ${appID} with index ${index}`);

      for (const table of tables) {
        try {
          gameStatsStorage.createObjectStore(`${appID}_${table.name}`, { keyPath: table.key });
        } catch (e) {
          console.debug(`Table "${table.name}" already exists for app ${appID}: `, e);
        }
      }

      gameStatsStorage.close();
      gameStatsStorage = undefined;

      initGameStatsStorage(appID, index).then(resolve).catch(reject);
    }

    request.onerror = (event) => {
      if (request === undefined) return;
      request = undefined;

      console.debug(`Failed to open the database for app ${appID} with index ${index}:`, event);

      gameStatsStorage = (event.target as IDBOpenDBRequest).result;

      if (gameStatsStorage) {
        gameStatsStorage.close();
        gameStatsStorage = undefined;
      }

      return initGameStatsStorage(appID, index + 1).then(resolve).catch(reject);
    }
  });
}

const isObjectStoreCorrect = (storage: IDBDatabase, storeName: string, expectedKeyPath: string | string[]) => {
  if (!storage.objectStoreNames.contains(storeName)) return false;

  const objectStore = storage.transaction(storeName, 'readonly').objectStore(storeName);

  console.debug(`Checking object store "${storeName}" with key path "${objectStore.keyPath}" (Expected: "${expectedKeyPath}")`);

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

export const waitForDatabaseReady = (): Promise<void> => {
  const wait = (resolve: () => void) => {
    setTimeout(() => {
      if (gameStatsStorage !== undefined && gameStatsStorage !== null && !gameStatsStorage.onversionchange) {
        resolve();
        return;
      }
      else console.warn(`Database is not ready, waiting...`);
      wait(resolve);
    }, 1000);
  }

  return new Promise((resolve, reject) => {
    wait(resolve);
  });
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
