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
  console.log("Steamworks extras: Init");

  settings = await chrome.storage.local.get(defaultSettings);

  await readChartColors();

  createCustomContentBlock();
  moveLinksToTop();
  moveGameTitle();
  moveDateRangeSelectionToTop();
  addStatusBlock();

  moveTotalTableToNewBlock();
  fixLifetimeLayout();

  moveSummaryToNewBlock();

  createWishlistChart();
  createCountryTable();

  moveWishlistConversionRateChartToNewBlock();
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

const hideOriginalMainBlock = () => {
  const elem = document.getElementsByClassName('ContentWrapper')[0];
  elem.style.display = 'none';
}

const getDateRangeOfCurrentPage = () => {
  // URL format:
  // https://partner.steampowered.com/app/details/AppID/?dateStart=2024-08-21&dateEnd=2024-08-27
  const urlObj = new URL(window.location.href);

  const dateStartString = urlObj.searchParams.get('dateStart');
  const dateEndString = urlObj.searchParams.get('dateEnd');

  console.log(dateStartString)
  console.log(dateEndString)

  let today = helpers.getDateNoOffset();
  if (today.getHours() < 7) today.setDate(today.getDate() - 1); // Steam still stands on the previous day until 6am UTC

  let dateStart = today;
  let dateEnd = today;

  if (!helpers.isStringEmpty(dateStartString)) dateStart = new Date(dateStartString);
  if (!helpers.isStringEmpty(dateEndString)) dateEnd = new Date(dateEndString);

  helpers.correctDateRange(dateStart, dateEnd);

  return { dateStart: dateStart, dateEnd: dateEnd };
}

const moveGameTitle = () => {
  const toolbarBlock = getExtraToolbarBlock();

  const titleElem = document.getElementsByTagName('h1')[0];

  toolbarBlock.insertBefore(titleElem, toolbarBlock.firstChild);
}

const readChartColors = async () => {
  const jsonFilePath = chrome.runtime.getURL('data/chartcolors.json');

  const response = await fetch(jsonFilePath);
  chartColors = await response.json();

}

const createCustomContentBlock = () => {
  const newBlockElem = document.createElement('div');
  newBlockElem.id = 'extra_main_block';

  document.body.insertBefore(newBlockElem, document.body.children[2]); // After header toolbar

  const extraToolbarBlock = document.createElement('div');
  extraToolbarBlock.id = 'extra_toolbar_block';

  const contentBlockElem = document.createElement('div');
  contentBlockElem.id = 'extra_main_content_block';

  newBlockElem.appendChild(extraToolbarBlock);
  newBlockElem.appendChild(contentBlockElem);
}

const getCustomMainBlock = () => {
  return document.getElementById('extra_main_block');
}

const getCustomContentBlock = () => {
  return document.getElementById('extra_main_content_block');
}

const getExtraToolbarBlock = () => {
  return document.getElementById('extra_toolbar_block');
}

const createFlexContentBlock = (title, id) => {
  const newBlockElem = document.createElement('div');
  newBlockElem.id = id;
  newBlockElem.classList.add('extra_content_block');

  const titleElem = document.createElement('h2');
  titleElem.textContent = title;

  newBlockElem.appendChild(titleElem);

  getCustomContentBlock().appendChild(newBlockElem);

  return newBlockElem;
}

const moveLinksToTop = () => {
  const newLinksBlockElem = document.createElement('div');
  newLinksBlockElem.classList.add('extra_content_block');
  newLinksBlockElem.id = 'extra_links_block';

  const toolbarBlock = getExtraToolbarBlock();
  toolbarBlock.appendChild(newLinksBlockElem);

  const dateUrlParams = new URLSearchParams(window.location.search);
  const dateStart = dateUrlParams.get('dateStart');
  const dateEnd = dateUrlParams.get('dateEnd');
  const dateParamsString = dateStart && dateEnd ? `?dateStart=${dateStart}&dateEnd=${dateEnd}` : '';

  const appID = getAppID();
  const toolbarData = [
    {
      label: 'General',
      links: [
        { text: 'Store page', href: `http://store.steampowered.com/app/${appID}` },
        { text: 'Steamworks page', href: `https://partner.steamgames.com/apps/landing/${appID}` },
        { text: 'Sales', href: `https://partner.steampowered.com/app/details/${appID}/${dateParamsString}` },
        { text: 'Wishlists', href: `https://partner.steampowered.com/app/wishlist/${appID}/${dateParamsString}` },
      ]
    },
    {
      label: 'Regional reports',
      links: [
        { text: 'Regional sales report', href: `https://partner.steampowered.com/region/${appID}/` },
        { text: 'Regional key activations report', href: `https://partner.steampowered.com/cdkeyreport.php?appID=${appID}` },
        { text: 'Downloads by Region', href: `https://partner.steampowered.com/nav_regions.php?downloads=1&appID=${appID}` }
      ]
    },
    {
      label: 'Hardware',
      links: [
        { text: 'Hardware survey', href: `https://partner.steampowered.com/survey2.php?appID=${appID}` },
        { text: 'Controller stats', href: `https://partner.steampowered.com/app/controllerstats/${appID}/` },
        { text: 'Remote Play stats', href: `https://partner.steampowered.com/app/remoteplay/${appID}/` }
      ]
    }
  ];

  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';

  toolbarData.forEach(item => {
    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown';

    const button = document.createElement('button');
    button.textContent = item.label;

    const dropdownContent = document.createElement('div');
    dropdownContent.className = 'dropdown-content';

    item.links.forEach(link => {
      const anchor = document.createElement('a');
      anchor.href = link.href;
      anchor.textContent = link.text;
      dropdownContent.appendChild(anchor);
    });

    // Assemble the dropdown
    dropdown.appendChild(button);
    dropdown.appendChild(dropdownContent);
    toolbar.appendChild(dropdown);
  });

  newLinksBlockElem.appendChild(toolbar);
}

const moveDateRangeSelectionToTop = () => {
  const toolbarBlock = getExtraToolbarBlock();

  const periodSelectBlock = document.getElementsByClassName('PeriodLinks')[0];
  const periodSelectWholeBlock = helpers.findParentByTag(periodSelectBlock, 'div');

  const newDateRangeContainerElem = document.createElement('div');
  newDateRangeContainerElem.classList.add('extra_content_block');
  newDateRangeContainerElem.id = 'extra_period_block';

  newDateRangeContainerElem.appendChild(periodSelectWholeBlock);

  toolbarBlock.appendChild(newDateRangeContainerElem);
}

const moveTotalTableToNewBlock = () => {
  const contentBlock = createFlexContentBlock('Lifetime Overview', 'extra_lifetime_table_block');

  let content = document.getElementsByClassName('lifetimeSummaryCtn')[0];

  contentBlock.appendChild(content);

  // contentBlock.appendChild(content);
}

const addStatusBlock = () => {
  const statusBlock = createStatusBlock();

  const toolbarBlock = getExtraToolbarBlock();
  toolbarBlock.appendChild(statusBlock);
}

const fixLifetimeLayout = () => {
  const table = document.querySelector('table');
  const td = Array.from(table.getElementsByTagName('td')).find(td => td.textContent.includes('Wishlist conversion rate is'));

  if (td) {
    const newTr = document.createElement('tr');
    newTr.appendChild(td);
    table.appendChild(newTr);
  }

  let leftContent = document.getElementById('leftParent');
  let rightContent = document.getElementById('rightParent');

  leftContent.style.width = '50%';
  rightContent.style.width = '50%';
}

const moveWishlistConversionRateChartToNewBlock = () => {
  let content = document.getElementById('percent_of_sales_graph');
  if (!content) return;

  const contentBlock = createFlexContentBlock('Wishlist Conversion Rate', 'extra_conversion_chart_block');

  const description = document.createElement('p');
  description.textContent = 'Wishlist purchases & activations as a percent of all purchases & activations';
  contentBlock.appendChild(description);
  contentBlock.appendChild(content);
}

const moveLifetimeChartToNewBlock = () => {
  let content = document.getElementById('lifetime_running_total_graph');
  if (!content) return;

  const contentBlock = createFlexContentBlock('Lifetime Wishlist Actions', 'extra_lifetime_chart_block');

  contentBlock.appendChild(content);
}

const moveWishlistChartToNewBlock = () => {
  let chart = document.getElementById('actions_graph');
  let newChartBlock = document.getElementById('extra_wishlist_chart_block');
  if (!chart || !newChartBlock) return;

  newChartBlock.appendChild(chart);
}

const moveSummaryToNewBlock = () => {
  const h2Elements = document.getElementsByTagName('h2');
  let targetH2 = null;

  for (let h2 of h2Elements) {
    if (h2.textContent.includes('Wishlist Action Summary')) {
      targetH2 = h2;
      break;
    }
  }

  if (!targetH2) return;

  let nextSibling = targetH2.nextElementSibling;
  let firstB = null;
  let firstTable = null;

  while (nextSibling) {

    if (nextSibling.tagName === 'B' && !firstB) {
      firstB = nextSibling;
    }
    if (nextSibling.tagName === 'TABLE' && !firstTable) {
      firstTable = nextSibling;
    }
    if (firstB && firstTable) {
      break;
    }
    nextSibling = nextSibling.nextElementSibling;
  }

  const contentBlock = createFlexContentBlock('Wishlist Action Summary', 'extra_summary_block');

  if (firstB) {
    contentBlock.appendChild(firstB);
  }
  if (firstTable) {
    contentBlock.appendChild(firstTable);
  }
}

const moveNotificationsToNewBlock = () => {
  const h2Elements = document.getElementsByTagName('h2');
  let targetH2 = null;

  for (let h2 of h2Elements) {
    if (h2.textContent.includes('Wishlist Notifications for Period')) {
      targetH2 = h2;
      break;
    }
  }

  if (!targetH2) return;

  let nextSibling = targetH2.nextElementSibling;
  let firstP = null;
  let firstTable = null;

  while (nextSibling) {

    if (nextSibling.tagName === 'P' && !firstP) {
      firstP = nextSibling;
    }
    if (nextSibling.tagName === 'TABLE' && !firstTable) {
      firstTable = nextSibling;
    }
    if (firstP && firstTable) {
      break;
    }
    nextSibling = nextSibling.nextElementSibling;
  }

  const contentBlock = createFlexContentBlock('Wishlist Notifications for Period', 'extra_notifications_block');

  if (firstP) {
    contentBlock.appendChild(firstP);
  }
  if (firstTable) {
    contentBlock.appendChild(firstTable);
  }
}

const moveConversionsToNewBlock = () => {
  const h2Elements = document.getElementsByTagName('h2');
  let targetH2 = null;

  for (let h2 of h2Elements) {
    if (h2.textContent.includes('Wishlist Conversions by Cohort')) {
      targetH2 = h2;
      break;
    }
  }

  if (!targetH2) return;

  let nextSibling = targetH2.nextElementSibling;
  let firstB = null;
  let firstTable = null;

  while (nextSibling) {

    if (nextSibling.tagName === 'B' && !firstB) {
      firstB = nextSibling;
    }
    if (nextSibling.tagName === 'TABLE' && !firstTable) {
      firstTable = nextSibling;
    }
    if (firstB && firstTable) {
      break;
    }
    nextSibling = nextSibling.nextElementSibling;
  }

  const contentBlock = createFlexContentBlock('Wishlist Conversions by Cohort', 'extra_conversions_block');

  if (firstB) {
    contentBlock.appendChild(firstB);
  }
  if (firstTable) {
    contentBlock.appendChild(firstTable);
  }
}

const createWishlistChart = () => {
  const contentBlock = createFlexContentBlock('Wishlist chart', 'extra_wishlist_chart_block');

  const chartBlockElem = document.createElement('div');
  chartBlockElem.id = 'extras_wishlist_chart';

  contentBlock.appendChild(chartBlockElem);

  const createChartSelect = (options, name, defaultValue, onSelect) => {
    const nameElem = document.createElement("b");
    nameElem.textContent = `${name}: `;
    nameElem.classList.add('extra_chart_select_name');

    const selectElem = document.createElement("select");

    options.forEach(option => {
      const optionElement = document.createElement("option");
      optionElement.value = option;
      optionElement.textContent = option;
      selectElem.appendChild(optionElement);
    });

    selectElem.value = defaultValue;

    selectElem.addEventListener("change", () => { onSelect(selectElem); });

    chartBlockElem.appendChild(nameElem);
    chartBlockElem.appendChild(selectElem);

    return selectElem;
  }

  createChartSelect([
    "Actions",
    "Country",
    "Region"
  ], 'View by', wishlistChartType, (select) => {
    wishlistChartType = select.value;
    updateWishlistChart();
  });

  const data = {};

  const config = {
    type: 'line',
    data: data,
    options: {
      plugins: {
        legend: {
          position: 'top'
        }
      }
    }
  };

  const canvas = document.createElement('canvas');
  canvas.id = 'extras_wishlist_chart_canvas';
  canvas.width = 800;
  canvas.height = 400;

  wishlistChart = new Chart(canvas, config);

  chartBlockElem.appendChild(canvas);
}

const updateWishlistChart = () => {
  if (!wishlistsForDateRange) return;

  console.log('Steamworks extras: Updating wishlist chart');

  const { dateStart, dateEnd } = getDateRangeOfCurrentPage();
  const dateRangeArray = helpers.getDateRangeArray(dateStart, dateEnd, false, true);

  const oneDay = helpers.dateToString(dateStart) === helpers.dateToString(dateEnd);

  let viewByList = [];

  switch (wishlistChartType) {
    case 'Actions': viewByList = ['Adds', 'Deletes', 'Gifts', 'Activations']; break;
    case 'Country': viewByList = selectedCountries; break;
    case 'Region': viewByList = regions; break;
  }

  let labels = oneDay ? viewByList : dateRangeArray;
  let datasets = [];

  console.log(viewByList);
  console.log(chartColors);

  if (oneDay) {

    const dayData = wishlistsForDateRange.find(item => item['Date'] === helpers.dateToString(dateStart));

    const data = viewByList.map((view) => { return dayData ? dayData[view] : 0; });
    const colors = viewByList.map((view) => {
      return helpers.selectChartColor(chartColors, view);
    });

    console.log(dayData);
    console.log(data);

    const dataset = {
      label: wishlistChartType,
      data: data,
      backgroundColor: colors,
    };

    datasets.push(dataset);
  }
  else {
    viewByList.forEach(view => {
      const color = helpers.selectChartColor(chartColors, view);

      let data = [];

      wishlistsForDateRange.forEach(item => {
        data.push(item[view]);
      });

      const dataset = {
        label: view,
        data: data,
        backgroundColor: color,
        borderColor: color,
      };

      datasets.push(dataset);
    });
  }

  wishlistChart.data.labels = labels;
  wishlistChart.data.datasets = datasets;

  wishlistChart.config.type = oneDay ? 'bar' : 'line';

  wishlistChart.update();
}

const createCountryTable = () => {
  const contentBlock = createFlexContentBlock('Wishlists by country', 'extra_country_table_block');

  const scrollableBlock = document.createElement('div');
  scrollableBlock.style.overflow = 'auto';
  scrollableBlock.style.maxHeight = '400px'; // Adjust the max height as needed

  const table = document.createElement('table');
  table.id = 'extra_country_table';

  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  const headers = ['Chart', 'Country', 'Wishlists'];

  headers.forEach(header => {
    const th = document.createElement('th');
    th.textContent = header;
    thead.appendChild(th);
  });

  table.appendChild(thead);
  table.appendChild(tbody);

  scrollableBlock.appendChild(table);
  contentBlock.appendChild(scrollableBlock);

  // Create second table for regions
  const regionsTable = document.createElement('table');
  regionsTable.id = 'extra_regions_table';

  const regionsThead = document.createElement('thead');
  const regionsTbody = document.createElement('tbody');

  const regionsHeaders = ['Regions', 'Wishlists'];

  regionsHeaders.forEach(header => {
    const th = document.createElement('th');
    th.textContent = header;
    regionsThead.appendChild(th);
  });

  regionsTable.appendChild(regionsThead);
  regionsTable.appendChild(regionsTbody);

  scrollableBlock.appendChild(regionsTable);
  contentBlock.appendChild(scrollableBlock);
}

const updateCountryTable = () => {
  console.log('Steamworks extras: Updating wishlist country table');

  const countryTable = document.getElementById('extra_country_table');
  const countryTableBody = countryTable.querySelector('tbody');

  const regionTable = document.getElementById('extra_regions_table');
  const regionTableBody = regionTable.querySelector('tbody');

  countryTableBody.innerHTML = '';
  regionTableBody.innerHTML = '';

  const { dateStart, dateEnd } = getDateRangeOfCurrentPage();
  const dateRangeArray = helpers.getDateRangeArray(dateStart, dateEnd, false, true);

  if (wishlistsForDateRange) {
    const countryData = {};

    dateRangeArray.forEach(date => {
      console.log(date);

      const data = wishlistsForDateRange.find(item => item['Date'] === date);

      if (data) {
        for (const country in data) {
          if (['Adds', 'Date', 'Deletes', 'Gifts', 'Activations'].includes(country)) {
            continue;
          }

          if (!countryData[country]) {
            countryData[country] = 0;
          }

          countryData[country] += data[country];
        }
      }
    });

    const sortedCountries = Object.entries(countryData)
      .filter(([country, value]) => value > 0)
      .sort((a, b) => b[1] - a[1]);

    sortedCountries.forEach(([country, value]) => {
      const row = document.createElement('tr');

      const isRegion = regions.includes(country);

      if (!isRegion) {
        const checkboxCell = document.createElement('td');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';

        if (countryTableBody.children.length < settings.chartMaxBreakdown) {
          checkbox.checked = true;
          selectedCountries.push(country);
        }

        checkbox.addEventListener('change', () => {
          if (checkbox.checked) {
            selectedCountries.push(country);
          }
          else {
            selectedCountries = selectedCountries.filter(c => c !== country);
          }

          if (wishlistChartType === 'Country') updateWishlistChart();
        });

        checkboxCell.appendChild(checkbox);
        row.appendChild(checkboxCell);
      }

      const countryCell = document.createElement('td');
      countryCell.textContent = country;

      const valueCell = document.createElement('td');
      valueCell.textContent = value;

      row.appendChild(countryCell);
      row.appendChild(valueCell);

      const body = isRegion ? regionTableBody : countryTableBody;
      body.appendChild(row);
    });
  }
}

const requestWishlistsForDateRange = async () => {
  const { dateStart, dateEnd } = getDateRangeOfCurrentPage();

  console.log(`Steamworks extras: Requesting wishlist data for date range: ${dateStart} - ${dateEnd}`);

  const errorAction = (error) => {
    console.warn(`Steamworks extras: Some wishlist data in current perioud could not be retrieved from cache.`);

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
      console.log(`Steamworks extras: Received wishlist data for date range: ${dateStart} - ${dateEnd}`, response);

      if (!response) {
        errorAction();
        return;
      }

      wishlistsForDateRange = response;

      updateWishlistChart();
      updateCountryTable();
    }).catch(errorAction);
}

init();
