const startUpdatingStats = async (appIDs) => {
  updateStats(appIDs);

  const updateIntervalObject = await getBrowser().storage.local.get(`statsUpdateInterval`);
  const updateInterval = updateIntervalObject.statsUpdateInterval || 60;
  console.debug(`Stats update interval:`, updateInterval);

  setInterval(() => {
    updateStats(appIDs);
  }, updateInterval * 60 * 1000);

  updateStatsStatus();
  setInterval(() => {
    updateStatsStatus();
  }, 3 * 1000);
}

self.onmessage = (event) => {
  if (event.data === "updateStats") {
    updateStats();
  }
}

const updateStats = async (appIDs) => {
  console.log(`Updating stats for apps:`, appIDs);
  try {
      // First handle requests which we can request at once, then daily
    for (const appID of appIDs) {
      fetchSalesData(appID);
    }
    for (const appID of appIDs) {
      fetchReviewsData(appID);
    }
    for (const appID of appIDs) {
      fetchWishlistConversionsData(appID);
    }
    for (const appID of appIDs) {
      fetchGeneralWishlistsData(appID);
    }

    fetchDailyData(appIDs);
  }
  catch (error) {
    console.error('Error while updating stats: ', error);
  }
}

const fetchSalesData = (appID) => {
  // We do not check for missing dates because we can request all sales data at once
  addToQueue(new StorageActionRequestSales(appID));
}

const fetchReviewsData = (appID) => {
  // We do not check for missing dates because reviews cannot be requested for certain dates.
  // We can request all reviews with couple requests in a single action
  addToQueue(new StorageActionRequestReviews(appID));
}

const fetchWishlistConversionsData = (appID) => {
  // We do not check for missing dates because we can request all conversions data at once
  addToQueue(new StorageActionRequestWishlistConversions(appID));
}

const fetchGeneralWishlistsData = async (appID) => {
  const requestAllWishlists = new StorageActionRequestWishlists(appID);
  await requestAllWishlists.addAndWait(true);
}

const fetchDailyData = async (appIDs) => {
  const missingWishlistDates = [];
  const missingTrafficDates = [];

  for (const appID of appIDs) {
    const wishlistDates = await getMissingDatesForWishlists(appID);
    for (const date of wishlistDates) {
      missingWishlistDates.push({ appid: appID, date });
    }
    const trafficDates = await getMissingDatesForTraffic(appID);
    for (const date of trafficDates) {
      missingTrafficDates.push({ appid: appID, date });
    }
  }

  // We sort dates in descending order because we want to request the most recent dates first so the user can use it
  missingWishlistDates.sort((a, b) => new Date(b.date) - new Date(a.date));
  missingTrafficDates.sort((a, b) => new Date(b.date) - new Date(a.date));

  const actionSettings = await makeActionSettings();

  for (const date of missingWishlistDates) {
    addToQueue(new StorageActionRequestRegionalWishlists(date.appid, date.date, actionSettings));
  }
  for (const date of missingTrafficDates) {
    addToQueue(new StorageActionRequestTraffic(date.appid, date.date, actionSettings));
  }
}

const updateStatsStatus = () => {
  const queueLength = queue.filter(item => item.getType().includes("Request")).length;
  console.debug(`Queue length:`, queueLength);
  if (queueLength > 0) {
    setExtentionStatus(11, { queueLength: queueLength });
  }
  else {
    setExtentionStatus(0);
  }
}

const makeActionSettings = async () => {
  const extSettings = await getBrowser().storage.local.get(Object.keys(defaultSettings));
  const actionSettings = new StorageActionSettings();
  actionSettings.minimalExecutionTime = extSettings.requestsMinPeriod || 1000;
  return actionSettings;
}

const getMissingDatesForTraffic = async (appID) => {
  const pageCreationDate = await bghelpers.getPageCreationDate(appID);

  const dates = helpers.getDateRangeArray(pageCreationDate, helpers.getDateNoOffset(), true, false);

  const trafficData = await readData(appID, 'Traffic');

  let missingDates = [];

  if (trafficData === undefined || trafficData.length == 0) {
    missingDates = dates;
  }
  else {
    missingDates = dates.filter(date => {
      const alwaysUpdateDate = new Date();
      alwaysUpdateDate.setDate(alwaysUpdateDate.getDate() - 3);
      if (date > alwaysUpdateDate) {
        return true;
      }

      const dateString = helpers.dateToString(date);

      const hasData = trafficData.some((data) => {
        // If page category is not a string, then the data is not valid or skipped for some reason
        if (typeof data['PageCategory'] !== 'string') {
          return false;
        }
        const sameDate = data['Date'] === dateString;
        return sameDate;
      });

      return !hasData;
    });
  }

  missingDates = filterDatesByRequestedDates(appID, 'RequestTraffic', missingDates);

  return missingDates;
}

const getMissingDatesForWishlists = async (appID) => {
  const pageCreationDate = await bghelpers.getPageCreationDate(appID);

  const dates = helpers.getDateRangeArray(pageCreationDate, helpers.getDateNoOffset(), true, false);

  const wishlistsData = await readData(appID, 'Wishlists');

  let missingDates = [];

  if (wishlistsData === undefined || wishlistsData.length == 0) {
    missingDates = dates;
  }
  else {
    missingDates = dates.filter(date => {
      const dateString = helpers.dateToString(date);

      const hasData = wishlistsData.some((data) => {
        const sameDate = data['Date'] === dateString;
        if (!sameDate) return false;

        if (data['World'] === undefined
          || data['Adds'] === undefined
          || data['Deletes'] === undefined
        ) {
          return false;
        }

        const worldWishlists = data['World'];
        const adds = data['Adds'];
        const deletes = data['Deletes'];

        let dataLooksFinal = (adds !== 0 || deletes !== 0) === (worldWishlists !== 0);

        // Sometimes data may look wrong, but world may actually be zero because of deletes are equal to adds wich makes world zero.
        if (!dataLooksFinal) {
          dataLooksFinal = Math.abs((adds - deletes) - worldWishlists) < 3; // 3 is a threshold. Sometimes adds - deletes are not equal to world.
        }

        return dataLooksFinal;
      });

      return !hasData;
    });
  }

  missingDates = filterDatesByRequestedDates(appID, 'RequestRegionalWishlists', missingDates);

  return missingDates;
}

const filterDatesByRequestedDates = (appID, requestType, dates) => {

  const relevantRequests = getActionsByAppIDAndType(appID, requestType);

  const requestedDatesSet = new Set(
    relevantRequests.map(req => {
      return typeof req.date === 'string' ? req.date : helpers.dateToString(req.date);
    })
  );

  const missingDates = dates.filter(date => {
    const dateString = helpers.dateToString(date);
    return !requestedDatesSet.has(dateString);
  });

  return missingDates;
}