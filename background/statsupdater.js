const startUpdatingStats = async (appIDs) => {
  for (const appID of appIDs) {
    try {
      await initGameStatsStorage(appID, 1);
    }
    catch (e) {
      console.error(`Steamworks extras: Error while initializing game stats storage for app ${appID}: `, e);
    }
  }

  updateStats(appIDs);

  const updateIntervalObject = await getBrowser().storage.local.get(`statsUpdateInterval`);
  const updateInterval = updateIntervalObject.statsUpdateInterval || 60;
  console.debug(`Steamworks extras: Stats update interval:`, updateInterval);

  setInterval(() => {
    updateStats(appIDs);
  }, updateInterval * 60 * 1000);
}

self.onmessage = (event) => {
  if (event.data === "updateStats") {
    updateStats();
  }
}

const updateStats = async (appIDs) => {
  try {
    for (const appID of appIDs) {
      await fetchAllData(appID);
    }
  }
  catch (error) {
    console.error('Steamworks extras: Error while updating stats: ', error);
  }

}

const fetchAllData = async (appID) => {

  console.log(`Steamworks extras: Fetching data for appID: ${appID}`);

  fetchSalesData(appID);
  fetchReviewsData(appID);
  await fetchTrafficData(appID);
  await fetchWishlistsData(appID);
}

const fetchTrafficData = async (appID) => {
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
        const sameDate = data['Date'] === dateString;
        return sameDate;
      });

      return !hasData;
    });
  }

  console.debug(`Steamworks extras: Missing traffic dates for app ${appID}:`, missingDates);

  for (const date of missingDates) {
    addToQueue(new StorageActionRequestTraffic(appID, date));
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

const fetchWishlistsData = async (appID) => {
  const requestAllWishlists = new StorageActionRequestWishlists(appID);
  await requestAllWishlists.addAndWait(true);

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

  console.debug(`Steamworks extras: Missing wishlist dates for app ${appID}:`, missingDates);

  for (const date of missingDates) {
    addToQueue(new StorageActionRequestRegionalWishlists(appID, date));
  }
}

