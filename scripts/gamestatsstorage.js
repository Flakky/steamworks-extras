
let gameStatsStorage;

const tables = [
  { name: 'Reviews', key: 'recommendationid' },
  { name: 'Wishlists', key: 'key' }, // Key is a combination of date and country
  { name: 'Refunds', key: 'key' }, // Key is a hash of refund comment
  { name: 'Traffic', key: ['Date', 'PageCategory', 'PageFeature'] },
  { name: 'Sales', key: 'key' } // Key is unique identifier
];

const MAX_RETRY_COUNT = 20;

const initGameStatsStorage = (appID, index) => {
  return new Promise((resolve, reject) => {
    console.log(`Steamworks Extras: Init database for app ${appID} with index ${index}`);

    const request = indexedDB.open("SteamworksExtras_GameStatsStorage", index);

    let retries = 0;

    request.onsuccess = (event) => {
      gameStatsStorage = event.target.result;

      for (const table of tables) {
        if (!gameStatsStorage.objectStoreNames.contains(`${appID}_${table.name}`)) {
          gameStatsStorage.close();
          gameStatsStorage = undefined;
          initGameStatsStorage(appID, index + 1).then(resolve).catch(reject);
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
        } catch (e) { }
      }

      reject();
    }

    request.onerror = (event) => {
      gameStatsStorage = undefined;
      const msg = `Failed to open the database: ${event.target.errorCode}`;
      console.error(msg);

      if (retries++ > MAX_RETRY_COUNT) {
        reject();
      }
      else {
        console.log(`Steamworks Extras: Retrying to open database for app ${appID} with index ${index}`);
        return initGameStatsStorage(appID, index + 1).then(resolve).catch(reject);
      }
    }
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

  let records = await readData(appID, 'Traffic');

  let date = new Date();
  date.setDate(date.getDate() - 1);
  while (true) {

    if (date.getDate() < new Date() - 2 // We want to refresh first several days because new data may be available
      && records.some(record => record['Date'] === helpers.dateToString(date))) {

      console.log(`Steamworks extras: Traffic data for ${helpers.dateToString(date)} already cached`);

      date.setDate(date.getDate() - 1);
      continue;
    }

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

  const out = records.filter(item => {
    const date = new Date(item['Date']);

    return helpers.isDateInRange(date, dateStart, dateEnd);
  });

  console.log(out);

  return out;
}

const requestTrafficData = async (appID, date) => {

  const formattedDate = helpers.dateToString(date);

  console.log(`Steamworks extras: Request traffic in CSV for ${formattedDate}`);

  const URL = `https://partner.steamgames.com/apps/navtrafficstats/${appID}?attribution_filter=all&preset_date_range=custom&start_date=${formattedDate}&end_date=${formattedDate}&format=csv`;

  const response = await fetch(URL);

  const responseText = await response.text();

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
const getReviewsData = async (appID, dateStart, dateEnd) => {
  await waitForDatabaseReady();

  console.log(`Steamworks extras: Requesting reviews data for app ${appID}`);

  let records = await readData(appID, 'Reviews');

  console.log(`Steamworks extras: Reviews data found in DB:`, records);

  if (dateStart && dateEnd) {
    return records.filter(item => {
      const date = new Date(item['timestamp_created'] * 1000);
      return helpers.isDateInRange(date, dateStart, dateEnd);
    });

  }
  else {
    return records;
  }
}

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

    const response = await fetch(request_url, request_options);

    const responseText = await response.text();

    const responseObj = JSON.parse(responseText);

    if (responseObj.reviews === undefined || responseObj.reviews.length == 0) break;

    cursor = responseObj.cursor;

    for (const review of responseObj.reviews) {
      if (review !== undefined) reviews.push(review);
    }
  }

  console.log(`Steamworks extras: Reviews result`);
  console.log(reviews);

  await clearData(appID, 'Reviews');

  await writeData(appID, 'Reviews', reviews);

  return reviews;
}

// Wishlists
const getWishlistData = async (appID, dateStart, dateEnd) => {

  let records = await readData(appID, 'Wishlists');

  let datesNoData = helpers.getDateRangeArray(dateStart, dateEnd, true);

  for (const record of records) {
    datesNoData = datesNoData.filter(item => item !== record['Date']);
  }

  if (datesNoData.length > 0) {
    console.log(`Steamworks extras: Some dates are not cached. Requesting...`);
    console.log(datesNoData);

    for (const date of datesNoData) {
      await requestWishlistData(appID, new Date(date));
    }

    records = await readData(appID, 'Wishlists');
  }

  const out = records.filter(item => {
    const date = new Date(item['Date']);
    return helpers.isDateInRange(date, dateStart, dateEnd);
  });

  return out;
}

const requestAllWishlistData = async (appID) => {
  console.log(`Steamworks extras: Requesting all wishlist data for app ${appID}`);

  let records = await readData(appID, 'Wishlists');

  console.log(`Steamworks extras: Wishlist data found in DB:`, records);

  let noDataDates = 0;

  let date = new Date();
  date.setDate(date.getDate() - 1); // Because we do not have wishlists for today.

  const cachedDates = records.map(record => record['Date']);
  console.log(`Steamworks extras: Cached wishlist dates:`, cachedDates);

  while (true) {

    if (date.getDate() < new Date() - 3 // We want to refresh last several days because new data may be available
      && cachedDates.includes(helpers.dateToString(date))) {

      date.setDate(date.getDate() - 1);

      continue;
    }

    const data = await requestWishlistData(appID, date);

    if (!data) {
      if (noDataDates++ > 5) {
        console.log(`Steamworks extras: No wishlist data found for last 5 days. Stop receiving wishlist data...`);
        return;
      }
    }

    date.setDate(date.getDate() - 1);
  }
}

const requestWishlistData = async (appID, date) => {
  const formattedDate = helpers.dateToString(date);

  let url = `https://partner.steampowered.com/region/`;
  const params = {
    appID: appID,
    unitType: 'wishlist',
    dateStart: formattedDate,
    dateEnd: formattedDate
  }

  const queryString = new URLSearchParams(params).toString();
  url += `?${queryString}`;

  console.log(`Sending wishlist request to "${url}"`);

  const response = await fetch(url);

  const htmlText = await response.text();

  const data = await helpers.parseDOM(htmlText, 'parseWishlistData');

  if (typeof data !== 'object' || Object.keys(data).length === 0) {
    console.log(`Steamworks extras: No wishlist data found for date ${formattedDate}`);
    return undefined;
  }

  const formattedData = Object.keys(data).map(wishlist_data => {
    return {
      key: `${formattedDate}_${wishlist_data}`,
      Date: formattedDate,
      Country: wishlist_data,
      Wishlists: data[wishlist_data] || 0
    };
  });

  await writeData(appID, 'Wishlists', formattedData);

  console.log(`Steamworks extras: Wishlist result for date ${formattedDate}: `, data);

  return data;
}

// Sales
const requestSalesData = async (appID) => {
  const startDate = new Date(2020, 0, 0);
  const endDate = new Date();

  const formattedStartDate = helpers.dateToString(startDate);
  const formattedEndDate = helpers.dateToString(endDate);

  console.log(`Steamworks extras: Request sales in CSV between ${formattedStartDate} and ${formattedEndDate}`);

  const packageIDs = await helpers.getPackageIDs(appID, false);

  console.log(`Steamworks extras: Package IDs found for app ${appID}:`, packageIDs);

  if (!packageIDs || packageIDs.length === 0) {
    console.error(`Steamworks extras: No package IDs found for app ${appID}`);
    return;
  }

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

  if (dateStart && dateEnd) {

    return records.filter(item => {
      let date = new Date(item['Date']);

      return helpers.isDateInRange(date, dateStart, dateEnd);
    });
  }
  else {
    return records;
  }
}
