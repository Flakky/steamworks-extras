// Storage tables
// appID_Reviews
// appID_Traffic
// appID_Sales

let gameStatsStorage;

const initGameStatsStorage = (appID, index) => {
  return new Promise((resolve, reject) => {
    console.log(`Steamworks Extras: Init database for app ${appID} with index ${index}`);

    const request = indexedDB.open("SteamworksExtras_GameStatsStorage", index);

    request.onsuccess = (event) => {
      gameStatsStorage = event.target.result;

      console.log(`Steamworks Extras: Database initialized for app ${appID} with index ${index}`);
      console.log(gameStatsStorage.objectStoreNames);

      if (!gameStatsStorage.objectStoreNames.contains(`${appID}_Reviews`)) {
        gameStatsStorage.close();
        gameStatsStorage = undefined;
        initGameStatsStorage(appID, index + 1);
        return;
      }

      resolve();
    }

    request.onupgradeneeded = (event) => {
      gameStatsStorage = event.target.result;

      console.log(`Steamworks Extras: Database update for app ${appID} with index ${index}`);

      gameStatsStorage.createObjectStore(`${appID}_Reviews`, { keyPath: "date" });
      gameStatsStorage.createObjectStore(`${appID}_Traffic`, { keyPath: ['Date', 'PageCategory', 'PageFeature'] });
      gameStatsStorage.createObjectStore(`${appID}_Sales`, { keyPath: "key" }); // key is a unique identifier for each row

      resolve();
    }

    request.onerror = (event) => {
      gameStatsStorage = undefined;
      const msg = `Failed to open the database: ${event.target.errorCode}`;
      console.error(msg);
      reject(msg);
    };
  });
}

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

    if (Array.isArray(data)) {
      for (const row of data) {
        objectStore.put(row);
      }
    }
    else {
      objectStore.put(data);
    }

    transaction.oncomplete = function () {
      console.log(`Steamworks extras: Data written to storage`);
      resolve();
    };

    transaction.onerror = (event) => {
      reject('Failed to read the database:', event.target.errorCode);
    };
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

const requestAllTrafficData = async (appID) => {
  await waitForDatabaseReady();
  await initGameStatsStorage(appID, 1);

  let date = new Date();
  date.setDate(date.getDate() - 1);
  while (true) {
    const hasData = await requestTrafficData(appID, date);

    if (!hasData) return;

    date.setDate(date.getDate() - 1);
  }
}

const getlTrafficData = async (appID, dateStart, dateEnd) => {
  await waitForDatabaseReady();

  // TODO: Optimize reading data only for range from DB
  // TODO: Optimize finding dates with no data

  let records = await readData(appID, 'Traffic');

  let datesNoData = helpers.getDateRangeArray(dateStart, dateEnd, true);

  for (const record of records) {
    datesNoData = datesNoData.filter(item => item !== record['Date']);
  }

  if (datesNoData.length > 0) {
    console.log(`Steamworks extras: Some dates are not cached. Requesting...`);
    console.log(datesNoData);

    for (const date of datesNoData) {
      await requestTrafficData(appID, new Date(date));
    }

    records = await readData(appID, 'Traffic');
  }

  console.log(records);

  let endDateWithoutOffset = new Date(dateEnd - dateEnd.getTimezoneOffset() * 60000);

  const out = records.filter(item => {
    const date = new Date(item['Date']);

    console.log(` ${date} >= ${dateStart} && ${date} <= ${endDateWithoutOffset} = ${date >= dateStart && date <= endDateWithoutOffset}`);

    return date >= dateStart && date <= endDateWithoutOffset;
  });

  console.log(out);

  return out;
}

const requestTrafficData = async (appID, date) => {

  const formattedDate = helpers.dateToString(date);

  console.log(`Steamworks extras: Request traffic in CSV for ${formattedDate}`);

  const URL = `https://partner.steamgames.com/apps/navtrafficstats/${appID}?attribution_filter=all&preset_date_range=custom&start_date=${formattedDate}&end_date=${formattedDate}&format=csv`;

  const responseText = await helpers.sendMessageAsync({ request: 'makeRequest', url: URL, params: {} });

  let lines = responseText.split('\n');

  // Ensure that we have lines to process
  if (lines.length === 0) {
    return [];
  }

  const csvString = lines.join('\n');

  lines = helpers.csvTextToArray(csvString);

  if (lines.length === 1) {
    console.log(`Steamworks extras: No traffic results for ${formattedDate}`);
    return false;
  };

  const headers = lines[0].map(header => header.trim());

  console.log(lines);

  let result = lines.slice(1)
    .map(line => {
      const object = {};

      line.forEach((element, index) => {
        object['Date'] = formattedDate;
        object[headers[index].replace(' / ', '')] = element;
      });

      return object;
    })
    .filter(line => { // There should be both because of database indexing
      return line['PageCategory'] !== undefined && line['PageFeature'] !== undefined;
    });

  console.log(`Steamworks extras: Traffic results by category`);
  console.log(result);

  if (result.length === 0) return false;

  await writeData(appID, 'Traffic', result);

  return true;
}

// Reviews
const requestAllReviewsData = async (appID) => {
  // Request documentation: https://partner.steamgames.com/doc/store/getreviews

  let cursor = '*'

  let reviews = [];

  while (true) {
    const request_data = {
      'filter': 'recent',
      'language': 'all',
      'review_type': 'all',
      'purchase_type': 'all',
      'num_per_page': 100,
      'cursor': cursor,
      'json': 1
    }

    const params = Object.keys(request_data)
      .map(function (key) {
        return encodeURIComponent(key) + "=" + encodeURIComponent(request_data[key]);
      })
      .join("&");

    const request_url = `https://store.steampowered.com/appreviews/${appID}?${params}`;
    const request_options = {
      'method': 'POST',
      'contentType': 'application/json',
      headers: {
        'Content-Type': 'application/json'
      },
    };

    console.log(`Sending review request to "${request_url}"`);

    const responseText = await helpers.sendMessageAsync({ request: 'makeRequest', url: request_url, params: request_options });

    const responseObj = JSON.parse(responseText);

    if (responseObj.reviews === undefined || responseObj.reviews.length == 0) break;

    cursor = responseObj.cursor;

    for (const review of responseObj.reviews) {
      if (review !== undefined) reviews.push(review);
    }
  }

  console.log(`Steamworks extras: Reviews result`);
  console.log(reviews);

  return reviews;
}

const requestSalesData = async (appID) => {
  const startDate = new Date(2020, 0, 0);
  const endDate = new Date();

  const formattedStartDate = helpers.dateToString(startDate);
  const formattedEndDate = helpers.dateToString(endDate);

  const packageIDs = await helpers.getPackageIDs(appID, false);

  console.log(`Steamworks extras: Request sales in CSV between ${formattedStartDate} and ${formattedEndDate}`);

  const URL = `https://partner.steampowered.com/report_csv.php`;

  const reqHeaders = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const data = new URLSearchParams();
  data.append('file', 'SalesData');
  let params = `query=QueryPackageSalesForCSV^dateStart=${formattedStartDate}^dateEnd=${formattedEndDate}^interpreter=PartnerSalesReportInterpreter`;
  packageIDs.forEach((pkgID, index) => {
    params += `^pkgID[${index}]=${pkgID}`;
  });
  data.append('params', params);

  const response = await fetch(URL, { method: 'POST', headers: reqHeaders, body: data.toString(), credentials: 'include' });
  if (!response.ok) throw new Error('Network response was not ok');

  const htmlText = await response.text();
  let lines = htmlText.split('\n');

  console.log(htmlText);

  lines.splice(0, 3); // Remove first 3 rows because they are not informative and break csv format

  // Ensure that we have lines to process
  if (lines.length === 0) {
    console.log(`Steamworks extras: No sales data found in CSV`);
    return [];
  }

  await clearData(appID, 'Sales');

  const csvString = lines.join('\n');

  lines = helpers.csvTextToArray(csvString);

  const headers = lines[0].map(header => header.trim());

  // Map each line to an object using the headers as keys
  let index = 0;
  const result = lines.slice(1).map(line => {
    const object = {};

    line.forEach((element, index) => {
      object[headers[index]] = element;
    });

    object.key = index++;

    return object;
  });

  console.log(`Steamworks extras: Sales CSV result:`, result);

  await writeData(appID, 'Sales', result);
}

const getAllSalesData = async (appID) => {
  await waitForDatabaseReady();
  let records = await readData(appID, 'Sales');

  if (records.length === 0) {
    console.log(`Steamworks extras: No sales data found in DB. Requesting from server...`);
    await requestSalesData(appID);
    records = await readData(appID, 'Sales');
  }

  return records;
}

const getSalesData = async (appID, dateStart, dateEnd) => {
  await waitForDatabaseReady();

  let records = await readData(appID, 'Sales');

  let endDateWithoutOffset = new Date(dateEnd - dateEnd.getTimezoneOffset() * 60000);

  const out = records.filter(item => {
    const date = new Date(item['Date']);

    return date >= dateStart && date <= endDateWithoutOffset;
  });

  console.log(out);

  return out;
}
