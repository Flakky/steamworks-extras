const updateStats = async (appIDs) => {

  for (const appID of appIDs) {
    await initGameStatsStorage(appID, 1);
  }

  appIDs.forEach(appID => {
    fetchAllData(appID);
  });
}

const fetchAllData = async (appID) => {

  console.log(`Steamworks extras: Fetching data for appID: ${appID}`);

  await fetchSalesData(appID);
  await fetchReviewsData(appID);
  await fetchTrafficData(appID);
  await fetchWishlistsData(appID);
}

const fetchTrafficData = async (appID) => {
  await requestAllTrafficData(appID);
}

const fetchSalesData = async (appID) => {
  await requestSalesData(appID);
}

const fetchReviewsData = async (appID) => {
  await requestAllReviewsData(appID);
}

const fetchWishlistsData = async (appID) => {
  await requestAllWishlistData(appID);
}
