// Storage tables
// appID_Reviews
// appID_Traffic
// appID_Sales

let gameStatsStorage;

const initGameStatsStorage = (appID, index) => {
  console.log(`Steamworks Extras: Init database for app ${appID} with index ${index}`);

  const request = indexedDB.open("SteamworksExtras_GameStatsStorage", index);

  request.onsuccess = (event) => {
    gameStatsStorage = event.target.result;

    console.log(`Steamworks Extras: Database initialized for app ${appID} with index ${index}`);
    console.log(gameStatsStorage.objectStoreNames);

    if (!gameStatsStorage.objectStoreNames.contains(`${appID}_Reviews`)) {
      gameStatsStorage.close();
      initGameStatsStorage(appID, index + 1);
      return;
    }
  }

  request.onupgradeneeded = (event) => {
    gameStatsStorage = event.target.result;

    console.log(`Steamworks Extras: Database update for app ${appID} with index ${index}`);

    const reviewsObject = gameStatsStorage.createObjectStore(`${appID}_Reviews`, { keyPath: "date" });
    const salesObject = gameStatsStorage.createObjectStore(`${appID}_Traffic`, { keyPath: "date" });
    const trafficObject = gameStatsStorage.createObjectStore(`${appID}_Sales`, { keyPath: "date" });
  }

  request.onerror = (event) => {
    console.error('Failed to open the database:', event.target.errorCode);
  };
}

const readData = async (appID, type, key) => {
  return new Promise((resolve, reject) => {
    const dbName = `${appID}_${type}`;
    const transaction = gameStatsStorage.transaction(dbName, "readonly");
    const objectStore = transaction.objectStore(dbName);
    const request = key === undefined ? objectStore.getAll() : objectStore.get(key);

    request.onsuccess = (event) => {
      resolve(event.target.result.data);
    };

    request.onerror = (event) => {
      reject('Failed to read the database:', event.target.errorCode);
    };
  });
}

const writeData = async (appID, type, data) => {
  return new Promise((resolve, reject) => {
    const dbName = `${appID}_${type}`;
    var transaction = db.transaction(dbName, "readwrite");
    var objectStore = transaction.objectStore(dbName);
    var request = objectStore.put(data);

    request.onsuccess = function (event) {
      resolve(event.target.result.data);
    };

    request.onerror = (event) => {
      reject('Failed to read the database:', event.target.errorCode);
    };
  });
}
