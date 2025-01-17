self.onmessage = (event) => {
  if (event.data === "updateStats") {
    updateStats();
  }
}

const updateStats = async (appIDs) => {
  for (const appID of appIDs) {
    await initGameStatsStorage(appID, 1);
  }

  for (const appID of appIDs) {
    await fetchAllData(appID);
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
    missingDates = dates.filter(date => !trafficData.some(data => data['Date'] === helpers.dateToString(date)));
  }

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
  addToQueue(new StorageActionRequestWishlists(appID));

  const pageCreationDate = await bghelpers.getPageCreationDate(appID);

  const dates = helpers.getDateRangeArray(pageCreationDate, helpers.getDateNoOffset(), true, false);

  const wishlistsData = await readData(appID, 'Wishlists');

  console.log(wishlistsData);

  let missingDates = [];

  if (trafficData === undefined || wishlistsData.length == 0) {
    missingDates = dates;
  }
  else {
    missingDates = dates.filter(date => !wishlistsData.some(data => data['Date'] === helpers.dateToString(date)));
  }

  for (const date of missingDates) {
    addToQueue(new StorageActionRequestRegionalWishlists(appID, date));
  }
}

