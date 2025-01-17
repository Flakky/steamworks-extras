
let gameStatsStorage;

const tables = [
  { name: 'Reviews', key: 'recommendationid' },
  { name: 'Wishlists', key: 'Date' }, // Key is a combination of date and country
  { name: 'Refunds', key: 'key' }, // Key is a hash of refund comment
  { name: 'Traffic', key: ['Date', 'PageCategory', 'PageFeature'] },
  { name: 'Sales', key: 'key' } // Key is unique identifier
];

const MAX_RETRY_COUNT = 200;

const initGameStatsStorage = (appID, index) => {
  return new Promise((resolve, reject) => {
    console.log(`Steamworks Extras: Init database for app ${appID} with index ${index}`);

    if (index > MAX_RETRY_COUNT) {
      console.error(`Steamworks Extras: Max retry count on DB open reached for app ${appID}`);
      reject();
      return;
    }

    const request = indexedDB.open("SteamworksExtras_GameStatsStorage", index);

    request.onsuccess = (event) => {
      gameStatsStorage = event.target.result;

      if (!gameStatsStorage) {
        console.error(`Steamworks Extras: Failed to open database for app ${appID} with index ${index}`);
        initGameStatsStorage(appID, index).then(resolve).catch(reject);
      }

      // Check for storage correct format
      if (gameStatsStorage.objectStoreNames.length > 0) {
        for (const table of tables) {
          const storeName = `${appID}_${table.name}`;
          if (!isObjectStoreCorrect(gameStatsStorage, storeName, table.key)) {
            console.warn(`Steamworks Extras: Object store "${storeName}" is not correct. Closing and reopening the database...`);
            gameStatsStorage.close();
            gameStatsStorage = undefined;
            initGameStatsStorage(appID, index + 1).then(resolve).catch(reject);
            return;
          }
        }
      }

      console.log(`Steamworks Extras: Database initialized for app ${appID} with index ${index}`);
      console.log(gameStatsStorage.objectStoreNames);

      resolve();
    }

    request.onupgradeneeded = (event) => {
      gameStatsStorage = event.target.result;

      console.log(`Steamworks Extras: Database update for app ${appID} with index ${index}`);

      for (const table of tables) {
        try {
          gameStatsStorage.createObjectStore(`${appID}_${table.name}`, { keyPath: table.key });
        } catch (e) {
          console.log(`Steamworks Extras: Table "${table.name}" already exists for app ${appID}: `, e);
        }
      }

      reject();
    }

    request.onerror = (event) => {
      gameStatsStorage = undefined;
      console.error(`Steamworks Extras: Failed to open the database for app ${appID} with index ${index}: ${event.target.errorCode}`);

      return initGameStatsStorage(appID, index + 1).then(resolve).catch(reject);
    }
  });
}

const isObjectStoreCorrect = (storage, storeName, expectedKeyPath) => {
  if (!storage.objectStoreNames.contains(storeName)) return false;

  const objectStore = storage.transaction(storeName, 'readonly').objectStore(storeName);

  console.debug(`Steamworks Extras: Checking object store "${storeName}" with key path "${objectStore.keyPath}" (Expected: "${expectedKeyPath}")`);

  if (Array.isArray(expectedKeyPath) && Array.isArray(objectStore.keyPath)) {
    return expectedKeyPath.length === objectStore.keyPath.length &&
      expectedKeyPath.every((key, index) => key === objectStore.keyPath[index]);
  }
  return objectStore.keyPath === expectedKeyPath;
};

const deleteDatabase = async () => {
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

    deleteRequest.onerror = (event) => {
      console.error("Error deleting database:", event.target.error);
      reject(event.target.error);
    };

    deleteRequest.onblocked = () => {
      console.warn("Delete blocked: The database is in use by another connection.");
      reject(new Error("Delete blocked"));
    };
  });
};

const waitForDatabaseReady = () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (gameStatsStorage !== undefined && gameStatsStorage !== null && !gameStatsStorage.onversionchange) resolve();
      else console.log(`Database is not ready, waiting...`);
    }, 0.5);
  });
}

const readData = (appID, type, key, indexed) => {
  return new Promise((resolve, reject) => {
    const dbName = `${appID}_${type}`;
    const transaction = gameStatsStorage.transaction(dbName, "readonly");
    const objectStore = transaction.objectStore(dbName);
    let request;

    if (key === undefined) {
      request = objectStore.getAll();
    }
    else if (indexed) {
      const index = objectStore.index(key);
      request = index.get(key);
    }
    else {
      request = objectStore.get(key);
    }

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject('Failed to read the database:', event.target.errorCode);
    };
  });
}

const readIndexedData = (appID, type, key) => {
  return new Promise((resolve, reject) => {
    const dbName = `${appID}_${type}`;
    const transaction = gameStatsStorage.transaction(dbName, "readonly");
    const objectStore = transaction.objectStore(dbName);
    const request = key === undefined ? objectStore.getAll() : objectStore.get(key);

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject('Failed to read the database:', event.target.errorCode);
    };
  });
}

const writeData = (appID, type, data) => {
  return new Promise((resolve, reject) => {
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
      console.error(`Steamworks extras: Failed to write data to storage (${appID})"${type}": `, data, e);
    }

    transaction.oncomplete = function () {
      console.debug(`Steamworks extras: Data "${type}"(${appID}) written to storage: `, data);
      resolve();
    };

    transaction.onerror = (event) => {
      reject('Failed to read the database:', event.target.errorCode);
    };
  });
}

const mergeData = (appID, type, key, newData) => {
  return new Promise((resolve, reject) => {
    readData(appID, type, key).then(existingData => {
      const mergedData = { ...existingData, ...newData };
      writeData(appID, type, mergedData).then(resolve).catch(reject);
    }).catch(reject);
  });
}

const clearData = (appID, type) => {
  return new Promise((resolve, reject) => {
    const dbName = `${appID}_${type}`;
    const transaction = gameStatsStorage.transaction(dbName, "readwrite");
    const objectStore = transaction.objectStore(dbName);
    const request = objectStore.clear();

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject('Failed to clear the database:', event.target.errorCode);
    };
  });
}

const clearAllData = () => {
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
      console.error("Error deleting database:", event.target.error);
      reject();
    };

    deleteRequest.onblocked = function (event) {
      console.warn("Delete blocked: The database is in use by another connection.");
      reject();
    };
  });
}
