const appID = '2004080';

const updateStats = async () => {
  await initGameStatsStorage(appID, 1);
  await fetchSalesData();
}

const fetchTrafficData = async () => {
  await requestAllTrafficData(appID);
}

const fetchSalesData = async () => {
  await requestSalesData(appID);
}
