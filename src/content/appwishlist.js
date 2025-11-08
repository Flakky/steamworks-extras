let settings = {};
let wishlistChart = undefined;
let wishlistsForDateRange = undefined;
let wishlistChartType = 'Actions';
let chartColors = undefined;
const regions = [
  'World',
  'Western Europe',
  'Asia',
  'North America',
  'Eastern Europe',
  'Central Asia',
  'Middle East',
  'South East Asia',
  'Oceania',
  'Africa',
  'Latin America',
  'South Asia'];
let selectedCountries = [];

const init = async () => {
  console.log("Init");

  settings = await getBrowser().storage.local.get(defaultSettings);

  await readChartColors();

  // Recreate the page structure
  createCustomContentBlock();
  moveGameTitle();
  createToolbarBlock(getAppID());
  moveDateRangeSelectionToTop();
  addStatusBlockToPage();

  // Create blocks
  moveTotalTableToNewBlock();
  moveSummaryToNewBlock();
  createWishlistChartBlock();
  createCountryTableBlock();

  fixLifetimeLayout();

  moveWishlistConversionRateChartToNewBlock();
  initConversionsChart();
  moveConversionsToNewBlock();

  moveLifetimeChartToNewBlock();
  moveNotificationsToNewBlock();

  hideOriginalMainBlock();

  requestWishlistsForDateRange();
}

const getAppID = () => {
  const titleElemWithAppID = document.getElementsByTagName('h1')[0];

  const id = titleElemWithAppID.textContent.match(/\(([^)]+)\)/)[1];

  console.log(id);

  return id;
}

const getDateRangeOfCurrentPage = () => {
  // URL format:
  // https://partner.steampowered.com/app/details/AppID/?dateStart=2024-08-21&dateEnd=2024-08-27
  const urlObj = new URL(window.location.href);

  const dateStartString = urlObj.searchParams.get('dateStart');
  const dateEndString = urlObj.searchParams.get('dateEnd');

  console.log(dateStartString)
  console.log(dateEndString)

  let today = helpers.getCalculationToday();

  let dateStart = today;
  let dateEnd = today;

  if (!helpers.isStringEmpty(dateStartString)) dateStart = new Date(dateStartString);
  if (!helpers.isStringEmpty(dateEndString)) dateEnd = new Date(dateEndString);

  helpers.correctDateRange(dateStart, dateEnd);

  return { dateStart: dateStart, dateEnd: dateEnd };
}

const readChartColors = async () => {
  const jsonFilePath = getBrowser().runtime.getURL('data/chartcolors.json');

  const response = await fetch(jsonFilePath);
  chartColors = await response.json();

}



const requestWishlistsForDateRange = async () => {
  const { dateStart, dateEnd } = getDateRangeOfCurrentPage();

  console.log(`Requesting wishlist data for date range: ${dateStart} - ${dateEnd}`);

  const errorAction = (error) => {
    console.warn(`Some wishlist data in current perioud could not be retrieved from cache.`, error);

    const chartCanvas = document.getElementById('extras_wishlist_chart_canvas');
    chartCanvas.style.display = 'none';

    moveWishlistChartToNewBlock();

    const message = 'Some wishlist data for the current period could not be retrieved from the cache. Wishlists split by region will not be available. Try to refresh the page in a minute.';
    const chartWarningBlock = helpers.createMessageText('warning', message);
    const tableWarningBlock = helpers.createMessageText('warning', message);

    const chartBlock = document.getElementById('extra_wishlist_chart_block');
    const tableBlock = document.getElementById('extra_country_table_block');

    chartBlock.insertBefore(chartWarningBlock, chartBlock.children[1]);
    tableBlock.insertBefore(tableWarningBlock, tableBlock.children[1]);
  }

  helpers.sendMessageAsync({ request: 'getData', type: 'Wishlists', appId: getAppID(), dateStart: dateStart, dateEnd: dateEnd, returnLackData: false })
    .then(response => {
      console.log(`Received wishlist data for date range: ${dateStart} - ${dateEnd}`, response);

      if (!response) {
        errorAction('No response');
        return;
      }

      wishlistsForDateRange = response;

      createWishlistChart();
      createCountryTable();

      updateWishlistChart();
      updateCountryTable();
    }).catch(errorAction);
}

init();
