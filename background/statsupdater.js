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

  setInterval(() => {
    updateStats(appIDs);
  }, 30 * 60 * 1000); // 30 minutes
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
      const dateString = helpers.dateToString(date);
      const hasData = trafficData.some((data) => {
        return data['Date'] === dateString;
      });

      return !hasData;
    });
  }

  console.debug('Steamworks extras: Missing traffic dates:', missingDates);

  for (const date of missingDates) {
    addToQueue(new StorageActionRequestTraffic(appID, date));
  }
}

const fetchSalesData = (appID) => {
  addToQueue(new StorageActionRequestSales(appID));
}

const fetchReviewsData = (appID) => {
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

        const worldWishlists = data['World'] || 0;
        const adds = data['Adds'] || 0;
        const deletes = data['Deletes'] || 0;

        let dataLooksFinal = (adds !== 0 || deletes !== 0) === (worldWishlists !== 0);
        if (!dataLooksFinal) {
          dataLooksFinal = (adds - deletes) === worldWishlists; // Sometimes data may look wrong, but world may actually be zero because of adds and deletes
        }

        return dataLooksFinal;
      });

      return !hasData;
    });
  }

  console.debug('Steamworks extras: Missing wishlist dates:', missingDates);

  for (const date of missingDates) {
    addToQueue(new StorageActionRequestRegionalWishlists(appID, date));
  }
}

