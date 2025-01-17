const startUpdatingStats = (appIDs) => {
  updateStats(appIDs);

  setInterval(() => {
    updateStats(appIDs);
  }, 30 * 60 * 1000); // 30 minutes
}

const updateStats = async (appIDs) => {
  try {
    for (const appID of appIDs) {
      await initGameStatsStorage(appID, 1);
    }

    appIDs.forEach(appID => {
      fetchAllData(appID);
    });
  }
  catch (error) {
    console.error('Steamworks extras: Error while updating stats: ', error);
  }

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
