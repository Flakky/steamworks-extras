const appID = '2004080';

const updateStats = async () => {
  initGameStatsStorage(appID, 1).finally(async () => {
    await fetchSalesData();
    await fetchReviewsData();
    await fetchWishlistsData();
    await fetchTrafficData();
  });
}

const fetchTrafficData = async () => {
  await requestAllTrafficData(appID);
}

const fetchSalesData = async () => {
  await requestSalesData(appID);
}

const fetchReviewsData = async () => {
  await requestAllReviewsData(appID);
}

const fetchWishlistsData = async () => {
  await requestAllWishlistData(appID);
}
