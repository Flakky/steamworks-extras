let settings = {};
let usRevenue = -1; // -1 means did not receive US share or got an error
let usRevenueForDateRange = -1; // -1 means did not receive US share or got an error
let salesForDateRange = undefined;
let salesAllTime = undefined;
let chartColors = undefined;

const init = async () => {
  console.log('Init');
  
  settings = await getBrowser().storage.local.get(defaultSettings);

  readChartColors();

  // Recreate the page structure
  createCustomContentBlock();
  moveGameTitle();
  hideOldLinks();
  createToolbarBlock(getAppID());
  moveDateRangeSelectionToTop();
  addStatusBlockToPage();

  // Create blocks
  moveSummaryTableToNewBlock();
  createSalesChartBlock();
  createSalesTableBlock();
  createReviewsChartBlock();
  createReviewsTableBlock();
  moveHeatmapNewBlock();
  moveOldChartToNewBlock();

  hideOriginalMainBlock();

  addRefundDataLink();
  addFollowers();

  requestReviews();
  requestSales();
}

const getSummaryTable = () => {
  return document.querySelector('#extra_summary_block table');
}

const getAppID = () => {
  const titleElemWithAppID = document.getElementsByTagName('h1')[0];

  const id = titleElemWithAppID.textContent.match(/\(([^)]+)\)/)[1];

  console.log(id);

  return id;
}

const getSalesTable = () => {
  return document.querySelector('#gameDataLeft table');
}

const getPackageId = () => {
  const salesTable = getSalesTable();

  const rows = salesTable.rows;

  const packageRow = rows[2];

  const packageLink = packageRow.getElementsByTagName('a')[0];
  if (!packageLink) return;

  const id = packageLink.href.match(/\/package\/details\/(\d+)/)[1];

  return id;
}

const getTotalRevenue = (gross) => {
  const table = getSummaryTable();
  if (!table) return;

  const rows = table.rows;
  const revenueCell = rows[gross ? 0 : 1].cells[1];

  let revenue = revenueCell.textContent.split(' ')[0]; // Remove percentage if shown by settings

  revenue = revenue.replace('$', '');
  revenue = revenue.replace(/,/g, '');

  const revenueNumber = parseInt(revenue);

  return revenueNumber;
}

const updateSummaryRowUnderExtend = (index, title, description, calculation) => {
  const cell = helpers.findElementByText('td', title);
  let row = helpers.findParentByTag(cell, 'tr');

  let sumElem, descElem = undefined;

  if (row === undefined) {
    const table = getSummaryTable();
    if (!table) return;

    row = table.insertRow(index); // Insert after net
    row.classList.add('summary-extend-row');
    row.style.display = 'none';

    nameElem = document.createElement('td');
    nameElem.textContent = title;
    nameElem.classList.add('extra_extend_title');

    sumElem = document.createElement('td');

    descElem = document.createElement('td');

    row.appendChild(nameElem);
    row.appendChild(sumElem);
    row.appendChild(descElem);
  }
  else {
    sumElem = row.cells[1];
    descElem = row.cells[2];
  }

  const calculatedAmount = calculation();
  const revenueString = helpers.numberWithCommas(Math.floor(calculatedAmount.summ));

  descElem.textContent = description;

  sumElem.setAttribute('align', 'right')
  sumElem.textContent = `$${revenueString}`

  if (settings.showPercentages) AddPercentageToRevenue(sumElem, calculatedAmount.share, 2);

  console.log(`Updated summary row: ${title} - ${revenueString}`);
}

const updateFinalRevenueRow = (index, calculation) => {
  const table = getSummaryTable();
  if (!table) return;

  let row = table.rows[index];
  const rowTitleCell = row.cells[0];

  let sumElem = undefined;

  if (rowTitleCell === undefined || !rowTitleCell.textContent.includes('Final lifetime developer revenue')) {
    row = table.insertRow(index);

    // Title link with extend
    const nameExtendButton = document.createElement('a');
    nameExtendButton.textContent = '► Final lifetime developer revenue';
    nameExtendButton.id = 'revenue_extend';
    nameExtendButton.href = '#';
    nameExtendButton.addEventListener('click', toggleExtraSummaryRows);

    const nameElem = document.createElement('td');
    nameElem.appendChild(nameExtendButton);

    // Description element
    const descElem = document.createElement('td');
    descElem.textContent = 'Final developer revenue after all royalties, payments and taxes. ';

    const optionsLink = document.createElement('a');
    optionsLink.href = '#';
    optionsLink.textContent = 'Setup';
    optionsLink.id = 'ext_options_link';

    descElem.appendChild(optionsLink);

    optionsLink.addEventListener('click', (event) => {
      getBrowser().runtime.sendMessage({ request: "showOptions" }, res => { });
    });

    // Summ element
    sumElem = document.createElement('td');
    sumElem.setAttribute('align', 'right')

    row.appendChild(nameElem);
    row.appendChild(sumElem);
    row.appendChild(descElem);
  }
  else {
    sumElem = row.cells[1];
  }

  const calculatedAmount = calculation();

  const devRevenueString = helpers.numberWithCommas(Math.floor(calculatedAmount.summ));

  sumElem.textContent = `$${devRevenueString}`

  if (settings.showPercentages) AddPercentageToRevenue(sumElem, calculatedAmount.share, 2);

  console.log("Updated final revenue");
}

const getRevenueMap = (gross, net, usGross) => {
  const grossRevenue = gross == undefined ? getTotalRevenue(true) : gross;
  const netRevenue = net == undefined ? getTotalRevenue(false) : net;

  const shareMap = getRevenuePercentageMap(grossRevenue, netRevenue, usGross);

  const out = {};

  out.royaltyAfterSteamShare = grossRevenue * shareMap.royaltyAfterSteamShare;
  out.royaltyAfterUSShare = grossRevenue * shareMap.royaltyAfterUSShare;
  out.royaltyAfterExtraGrossTake = grossRevenue * shareMap.royaltyAfterExtraGrossTake;
  out.royaltyAfterExtraNetTake = grossRevenue * shareMap.royaltyAfterExtraNetTake;
  out.revenueAfterOtherRoyalties = grossRevenue * shareMap.revenueAfterOtherRoyalties;
  out.revenueAfterTax = grossRevenue * shareMap.revenueAfterTax;
  out.finalRevenue = grossRevenue * shareMap.finalRevenue;

  return out;
}

const getRevenuePercentageMap = (gross, net, usGross) => {
  const grossRevenue = gross == undefined ? getTotalRevenue(true) : gross;
  const netRevenue = net == undefined ? getTotalRevenue(false) : net;

  const out = {};

  const usRevenueShare = (usGross <= 0 ? 0 : usGross) * (grossRevenue <= 0 ? 0 : 1 / grossRevenue);

  out.gross = 1.0;
  out.net = netRevenue / grossRevenue;
  out.royaltyAfterSteamShare = out.net * 0.7;

  out.royaltyAfterUSShare = out.royaltyAfterSteamShare - (((out.net * usRevenueShare) * 0.7) * settings.usSalesTax / 100);
  out.royaltyAfterExtraGrossTake = out.royaltyAfterUSShare - (out.gross * (settings.grossRoyalties / 100));
  out.royaltyAfterExtraNetTake = out.royaltyAfterExtraGrossTake - (out.royaltyAfterExtraGrossTake * (settings.netRoyalties / 100));
  out.revenueAfterOtherRoyalties = out.royaltyAfterExtraNetTake - (out.royaltyAfterExtraNetTake * (settings.otherRoyalties / 100));
  out.revenueAfterTax = out.revenueAfterOtherRoyalties - (out.revenueAfterOtherRoyalties * (settings.localTax / 100));
  out.finalRevenue = out.revenueAfterTax - (out.revenueAfterTax * (settings.royaltiesAfterTax / 100));

  return out;
}

const updateSummaryRows = () => {

  const summ = getRevenueMap(getTotalRevenue(true), getTotalRevenue(false), usRevenue);

  const shares = getRevenuePercentageMap(getTotalRevenue(true), getTotalRevenue(false), usRevenue);

  updateFinalRevenueRow(2, () => { return { summ: summ.finalRevenue, share: shares.finalRevenue } });

  updateSummaryRowUnderExtend(3, "Revenue after Steam share", "(Net revenue * 0.7)", () => { return { summ: summ.royaltyAfterSteamShare, share: shares.royaltyAfterSteamShare } });

  let rowIndex = 4;

  if (settings.showZeroRevenues || summ.royaltyAfterUSShare != summ.royaltyAfterSteamShare) {
    updateSummaryRowUnderExtend(rowIndex, "Revenue after US share", `Revenue after tax (${settings.usSalesTax}%) that is deducted from US sales. ($${helpers.numberWithCommas(usRevenue)})`, () => { return { summ: summ.royaltyAfterUSShare, share: shares.royaltyAfterUSShare } });
    rowIndex++;
  }

  if (settings.showZeroRevenues || summ.royaltyAfterExtraGrossTake != summ.royaltyAfterUSShare) {
    updateSummaryRowUnderExtend(rowIndex, "Revenue after Gross royalties", `Revenue after other royalties (${settings.grossRoyalties}%) you pay from Gross.`, () => { return { summ: summ.royaltyAfterExtraGrossTake, share: shares.royaltyAfterExtraGrossTake } });
    rowIndex++;
  }
  if (settings.showZeroRevenues || summ.royaltyAfterExtraNetTake != summ.royaltyAfterExtraGrossTake) {
    updateSummaryRowUnderExtend(rowIndex, "Revenue after Net royalties", `Revenue after royalties you pay after receiving Net and paying gross royalties. (${settings.netRoyalties}%)`, () => { return { summ: summ.royaltyAfterExtraNetTake, share: shares.royaltyAfterExtraNetTake } });
    rowIndex++;
  }
  if (settings.showZeroRevenues || summ.revenueAfterOtherRoyalties != summ.royaltyAfterExtraNetTake) {
    updateSummaryRowUnderExtend(rowIndex, "Revenue after Other royalties", `Revenue after any other payments (${settings.otherRoyalties}%) you make from what's left but before your local taxes`, () => { return { summ: summ.revenueAfterOtherRoyalties, share: shares.revenueAfterOtherRoyalties } });
    rowIndex++;
  }
  if (settings.showZeroRevenues || summ.revenueAfterTax != summ.revenueAfterOtherRoyalties) {
    updateSummaryRowUnderExtend(rowIndex, "Revenue after local tax", `Revenue after your local income tax (${settings.localTax}%)`, () => { return { summ: summ.revenueAfterTax, share: shares.revenueAfterTax } });
    rowIndex++;
  }

  updateSummaryRowUnderExtend(rowIndex, "Final developer revenue", `Final revenue after extra payments (${settings.royaltiesAfterTax}%) after taxes.`, () => { return { summ: summ.finalRevenue, share: shares.finalRevenue } });

  if (settings.showPercentages) addPercentageToGrossAndNet();
}

const addPercentageToGrossAndNet = () => {
  const table = getSummaryTable();
  if (!table) return;

  const rows = table.rows;
  const grossCell = rows[0].cells[1];
  const netCell = rows[1].cells[1];

  if (grossCell.getElementsByTagName('i').length > 0) return; // Already added

  AddPercentageToRevenue(grossCell, 1.0, 1);
  AddPercentageToRevenue(netCell, getTotalRevenue(false) / getTotalRevenue(true), 2);
}

const AddPercentageToRevenue = (elem, share, fixnum) => {
  elem.textContent += ` `
  shareElem = document.createElement('i');
  shareElem.classList.add('extra_revenue_percentage');
  const percentage = (share * 100).toFixed(fixnum);
  shareElem.textContent = `${percentage}%`;

  elem.appendChild(shareElem);
}

const toggleExtraSummaryRows = () => {
  const table = getSummaryTable();
  if (!table) return;

  const extendButtonElem = table.rows[2].cells[0];
  const extendLinkElem = extendButtonElem.getElementsByTagName('a')[0];

  const sign = extendLinkElem.textContent.split(' ')[0];

  const newShow = sign === '►';

  var rows = document.querySelectorAll('.summary-extend-row');

  rows.forEach(function (row) {
    row.style.display = newShow ? 'table-row' : 'none';
  });

  extendLinkElem.textContent = extendButtonElem.textContent.replace(newShow ? '►' : '▼', newShow ? '▼' : '►');
}

const addFollowers = async () => {
  const summaryTable = getSummaryTable();
  if (!summaryTable) return;

  const lifeTimeUnitsReturnedCell = helpers.findElementByText('td', 'Wishlists');

  const lifetimeUnitsRow = helpers.findParentByTag(lifeTimeUnitsReturnedCell, 'tr');

  const lifetimeUnitsRowIndex = lifetimeUnitsRow.rowIndex;

  let newRow = summaryTable.insertRow(lifetimeUnitsRowIndex + 3); // Insert after wishlists (including extended wishlists rows)

  let followersTitleCell = document.createElement('td');
  followersTitleCell.textContent = 'Followers';
  newRow.appendChild(followersTitleCell);

  let followersValueCell = document.createElement('td');
  followersValueCell.setAttribute('align', 'right')
  newRow.appendChild(followersValueCell);

  const loader = document.createElement('div');
  loader.className = 'loader';
  followersValueCell.appendChild(loader);

  let followersDescriptionCell = document.createElement('td');
  newRow.appendChild(followersDescriptionCell);

  let followers = NaN;

  try{
    const url = `https://steamcommunity.com/games/${getAppID()}/membersManage`;
    console.log(`Requesting followers from `, url);
    followers = await helpers.sendMessageAsync({ request: 'parseDOM', url: url, type: 'followers' });
  }
  catch(e){
    console.error('Failed to get followers:', e);
  }

  if (isNaN(followers) || followers < 0) {
    console.error('Invalid followers count:', followers);

    followersValueCell.innerHTML = `---`;
    followersDescriptionCell.innerHTML = `Failed to get followers. <a target="_blank" rel="noopener noreferrer" href="https://steamcommunity.com/games/${getAppID()}/membersManage">Make sure you have access.</a>`;
    return;
  }

  followersValueCell.innerHTML = followers;
  followersDescriptionCell.innerHTML = `<a target="_blank" rel="noopener noreferrer" href="https://steamcommunity.com/games/${getAppID()}/membersManage">(View & manage followers)</a>`;

}

const addRefundDataLink = () => {
  const refundCell = helpers.findElementByText('td', 'Lifetime units returned');
  if (!refundCell) return;

  const refundDescCell = refundCell.parentNode.cells[2];

  const packageId = getPackageId();

  refundDescCell.innerHTML += ` (<a href="https://partner.steampowered.com/package/refunds/${packageId}/">Refund data</a>)`;

  console.log("Added refund data link");
}

const getDateRangeOfCurrentPage = () => {
  // URL format:
  // https://partner.steampowered.com/app/details/AppID/?dateStart=2024-08-21&dateEnd=2024-08-27
  const urlObj = new URL(window.location.href);

  const urlParams = urlObj.searchParams

  let today = helpers.getCalculationToday();

  let dateStart = today;
  let dateEnd = today;

  const isToday = urlParams.get('specialPeriod') === 'today'
                  ||(!urlParams.has('dateStart') && !urlParams.has('dateEnd'));

  if(!isToday){
    const dateStartString = urlParams.get('dateStart');
    const dateEndString = urlParams.get('dateEnd');

    if (!helpers.isStringEmpty(dateStartString)) dateStart = helpers.dateFromString(dateStartString);
    if (!helpers.isStringEmpty(dateEndString)) dateEnd = helpers.dateFromString(dateEndString);
  }

  ({dateStart, dateEnd} = helpers.correctDateRange(dateStart, dateEnd));

  return { dateStart: dateStart, dateEnd: dateEnd };
}

const requestSales = async () => {
  const { dateStart, dateEnd } = getDateRangeOfCurrentPage();

  console.log('Requesting sales data...');

  salesAllTime = await helpers.sendMessageAsync({ request: 'getData', type: 'Sales', appId: getAppID() });
  console.debug('Sales data received: ', salesAllTime);

  // Filter to current date range
  salesForDateRange = salesAllTime.filter(item => {
    if (!item["Date"]) return false;
    const date = new Date(item["Date"]);
    return helpers.isDateInRange(date, dateStart, dateEnd);
  });
  
  // US sales for tax calculation purposes
  usRevenueForDateRange = salesForDateRange
  .filter(item => item["Country"] === "United States")
  .reduce((sum, item) => sum + (item["Gross Steam Sales (USD)"] || 0), 0);
  
  usRevenue = salesAllTime
  .filter(item => item["Country"] === "United States")
  .reduce((sum, item) => sum + (item["Gross Steam Sales (USD)"] || 0), 0);
  
  console.debug('Sales data for range: ', salesForDateRange);
  console.debug('US sales data: ', usRevenue);
  console.debug('US sales data for range: ', usRevenueForDateRange);

  createSalesChart();
  updateSalesChart(chartSplit, chartValueType);

  createSalesTable();
  updateSalesTable(salesTableSplit);

  updateSummaryRows();
}

const readChartColors = () => {
  const jsonFilePath = getBrowser().runtime.getURL('data/chartcolors.json');

  console.log(jsonFilePath);

  fetch(jsonFilePath).then(response => {
    if (response.ok) {
      response.json().then(json => {
        console.log('Chart colors loaded: ', json);
        chartColors = json;
      });
    }
    else {
      console.error('Failed to load chart colors');
    }
  });
}

const hideOldLinks = () => {
  const contentBlock = document.getElementById('gameDataLeft');
  const linksElem = contentBlock.children[1];
  linksElem.style.display = 'none';
}

const moveSummaryTableToNewBlock = () => {
  const summaryTable = document.querySelector('.lifetimeSummaryCtn table');
  if (!summaryTable) return;

  const contentBlock = createFlexContentBlock('Lifetime summary', 'extra_summary_block');

  setFlexContentBlockContentElem(contentBlock, summaryTable);
}

const moveOldChartToNewBlock = () => {
  const oldChartElem = document.getElementById('ChartUnitsHistory');
  if (!oldChartElem) return;

  const oldChartElemParentDiv = helpers.findParentByTag(oldChartElem, 'div');
  if (!oldChartElemParentDiv) return;

  const AllStatsDiv = helpers.findParentByTag(oldChartElemParentDiv, 'div');
  if (!AllStatsDiv || AllStatsDiv.children.length === 0) return;

  const contentBlock = createFlexContentBlock('Original chart', 'extra_original_chart_block');

  const oldChartContainer = document.createElement('div');
  oldChartContainer.id = 'extra_old_chart_container';

  // We only need the first 4 children because this is the part about sales
  for (let i = 0; i < 4; i++) {
    if (AllStatsDiv.children.length > 0) {
      oldChartContainer.appendChild(AllStatsDiv.children[0]);
    }
  }

  setFlexContentBlockContentElem(contentBlock, oldChartContainer);
}

const moveHeatmapNewBlock = () => {
  const heatmapElem = document.getElementById('heatmapArea');
  if (!heatmapElem) return;

  const contentBlock = createFlexContentBlock('Sales heatmap', 'extra_sales_heatmap_block');

  setFlexContentBlockContentElem(contentBlock, heatmapElem);
}

init();
