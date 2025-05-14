let wishlistConversions = undefined;
let wishlists = undefined;
let conversionsChart = undefined;

const initConversionsChart = async () => {
  console.log("Steamworks extras: Init");

  createConversionsChart();

  const {dateStart, dateEnd} = getDateRangeOfCurrentPage();

  wishlistConversions = await helpers.sendMessageAsync({
    request: 'getData',
    type: 'WishlistConversions',
    dateStart: dateStart,
    dateEnd: dateEnd,
    appId: getAppID()
  });

  wishlists = await helpers.getDataFromStorage(
    'Wishlists',
    getAppID(),
    '2010-01-01', // Request all data from page creation
    dateEnd,
    true
  );

  console.log("Steamworks extras: Wishlist conversions data loaded", wishlistConversions);
  console.log("Steamworks extras: Wishlist data loaded", wishlists);

  updateConversionsChart();
}

const createConversionsChart = () => {
  const contentBlock = createFlexContentBlock('Wishlist cohort chart', 'extra_wishlist_conversions_chart_block');

  const chartBlockElem = document.createElement('div');
  chartBlockElem.id = 'extras_wishlist_conversions_chart';

  contentBlock.appendChild(chartBlockElem);

  const config = {
    type: 'bar',
    options: {
      plugins: {
        legend: {
          position: 'top'
        }
      }
    }
  };

  const canvas = document.createElement('canvas');
  canvas.id = 'extras_wishlist_conversions_chart_canvas';
  canvas.width = 800;
  canvas.height = 400;

  conversionsChart = new Chart(canvas, config);

  conversionsChart.options.scales = { x: { stacked: true }, y: { stacked: true } }

  chartBlockElem.appendChild(canvas);
}

const updateConversionsChart = () => {
  if (!conversionsChart) return;

  let labels = getLabelsForConversionsChart();
  console.log("Steamworks extras: Labels for conversions chart", labels);

  let conversionsData = getConversionRates(labels);
  console.log("Steamworks extras: Rates for conversions chart", conversionsData);

  const {dateStart, dateEnd} = getDateRangeOfCurrentPage();

  const beforeRangeData = [];
  const afterRangeData = [];

  labels.forEach((label, index) => {
    const labelDate = new Date(label);
    const monthStart = new Date(dateStart);
    monthStart.setDate(1);
    if (labelDate < monthStart) {
      afterRangeData.push(0);
      beforeRangeData.push(conversionsData[index]);
    } else {
      beforeRangeData.push(0);
      afterRangeData.push(conversionsData[index]);
    }
  });

  const beforeRangeDataset = {
    label: "Conversion Rate (%)",
    data: beforeRangeData,
    backgroundColor: 'rgb(106, 150, 219)',
  };
  const afterRangeDataset = {
    label: "Conversion Rate within date range (%)",
    data: afterRangeData,
    backgroundColor: 'rgb(219, 166, 106)',
  };

  conversionsChart.data.labels = labels;
  conversionsChart.data.datasets = [beforeRangeDataset, afterRangeDataset];

  conversionsChart.update();
}

const getConversionRates = (labels) => {
  const conversionRates = labels.map(label => {
    const monthStart = new Date(label);
    const monthEnd = new Date(label);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const addsForMonth = wishlists
      .filter(wishlist => {
        const wishlistDate = new Date(wishlist["Date"]);
        return wishlistDate >= monthStart && wishlistDate < monthEnd;
      })
      .reduce((sum, wishlist) => sum + wishlist["Adds"], 0);

    const conversionsForMonth = wishlistConversions
      .filter(conversion => {
        return conversion["MonthCohort"] === label;
      })
      .reduce((sum, conversion) => sum + conversion["TotalConversions"], 0);

    const conversionRate = conversionsForMonth / addsForMonth;

    return conversionRate * 100; // percentage
  });

  return conversionRates;
}

const getLabelsForConversionsChart = () => {
  const labels = [];

  wishlistConversions.forEach(conversion => {
    if (!labels.includes(conversion["MonthCohort"])) {
      labels.push(conversion["MonthCohort"]);
    }
  });

  labels.sort((a, b) => (a > b ? 1 : -1));

  const startDate = new Date(labels[0]);
  const endDate = new Date(labels[labels.length - 1]);

  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const formattedDate = helpers.dateToString(currentDate);
    if (!labels.includes(formattedDate)) {
      labels.push(formattedDate);
    }
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  labels.sort((a, b) => (a > b ? 1 : -1));

  return labels;
}
