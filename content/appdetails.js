let settings = {};
let usRevenue = -1; // -1 means did not receive US share or got an error
let usRevenueForDateRange = -1; // -1 means did not receive US share or got an error
let salesForDateRange = undefined;
let salesChart = undefined;
let chartSplit = "Country";
let chartValueType = "Gross Steam Sales (USD)";
let chartColors = undefined;

const init = () => {
  console.log("Steamworks extras: Init");

  chrome.storage.local.get(defaultSettings, (result) => {
    settings = result;

    readChartColors();

    createCustomContentBlock();

    moveGameTitle();
    moveLinksToTop();
    moveDateRangeSelectionToTop();

    moveSummaryTableToNewBlock();
    createSalesChart();
    moveSalesTableToNewBlock();
    moveHeatmapNewBlock();
    moveOldChartToNewBlock();

    requestTotalUSRevenue();
    requestUSRevenueForCurrentDateRange();
    requestSales();

    updateSummaryRows();
    updateSalesNetRow();

    addRefundDataLink();

    hideOriginalMainBlock();
  });
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
  return document.querySelector('#extra_sales_table_block table');
}

const getPackageId = () => {
  const salesTable = getSalesTable();

  const rows = salesTable.rows;

  const packageRow = rows[2];

  const packageLink = packageRow.getElementsByTagName('a')[0];

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
  revenue = revenue.replace(',', '');

  return Math.floor(revenue);
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

  console.log(`Steamworks extras: Updated summary row: ${title} - ${revenueString}`);
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
      chrome.runtime.sendMessage("showOptions");
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

  console.log("Steamworks extras: Updated final revenue");
}

const getRevenueMap = (gross, net, usGross) => {
  const grossRevenue = gross || getTotalRevenue(true);
  const netRevenue = net || getTotalRevenue(false);

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
  const grossRevenue = gross || getTotalRevenue(true);
  const netRevenue = net || getTotalRevenue(false);

  const out = {};

  const usRevenueShare = (usGross <= 0 ? 0 : usGross) * (grossRevenue <= 0 ? 0 : 1 / grossRevenue);

  console.log('us share: ' + usRevenueShare);

  out.gross = 1.0;
  out.net = netRevenue / grossRevenue;
  out.royaltyAfterSteamShare = out.net * 0.7;

  console.log('net share: ' + out.net);

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

const updateSalesNetRow = () => {
  const salesTable = getSalesTable();

  const rows = salesTable.rows;

  let revenueRow = undefined;
  let revenueRowIndex = -1;

  for (const row of rows) {
    revenueRowIndex++;

    const bElemWithText = row.getElementsByTagName('b')[0];
    if (!bElemWithText) continue;

    if (bElemWithText.textContent == 'Total revenue') {
      revenueRow = row;
      break;
    }
  }

  if (!revenueRow) {
    console.error('Revenue row was not found!');
    return;
  }

  const revenueCell = revenueRow.cells[2];
  let revenue = revenueCell.textContent;
  revenue = revenue.replace('$', '');
  revenue = revenue.replace(',', '');

  const grossNetRatio = getTotalRevenue(false) / getTotalRevenue(true);

  const { finalRevenue } = getRevenueMap(revenue, revenue * grossNetRatio, usRevenueForDateRange);

  const devRevenueString = helpers.numberWithCommas(Math.floor(finalRevenue));

  const cell = helpers.findElementByText('b', 'Developer revenue');
  let newRow = helpers.findParentByTag(cell, 'tr');

  console.log(newRow);

  if (newRow === undefined) {
    let newRow = salesTable.insertRow(revenueRowIndex + 1); // Insert after total revenue

    const nameElem = document.createElement('td');
    nameElem.innerHTML = '<b>Developer revenue</b>';
    newRow.appendChild(nameElem);

    sumElem = document.createElement('td');
    const spacerElem = document.createElement('td');

    sumElem.setAttribute('align', 'right');

    newRow.appendChild(spacerElem);
    newRow.appendChild(sumElem);

    for (let i = 3; i < revenueRow.cells.length; i++) {
      const cell = document.createElement('td');
      newRow.appendChild(cell);
    }
  }
  else {
    sumElem = newRow.cells[2];
  }

  sumElem.innerHTML = `<b>$${devRevenueString}</b>`;

  console.log("Steamworks extras: Added sales for date range net");
}

const addRefundDataLink = () => {
  const refundCell = helpers.findElementByText('td', 'Lifetime units returned');
  if (!refundCell) return;

  const refundDescCell = refundCell.parentNode.cells[2];

  const packageId = getPackageId();

  refundDescCell.innerHTML += ` (<a href="https://partner.steampowered.com/package/refunds/${packageId}/">Refund data</a>)`;

  console.log("Steamworks extras: Added refund data link");
}

const getDateRangeOfCurrentPage = () => {
  // URL format:
  // https://partner.steampowered.com/app/details/AppID/?dateStart=2024-08-21&dateEnd=2024-08-27
  const urlObj = new URL(window.location.href);

  const dateStartString = urlObj.searchParams.get('dateStart');
  const dateEndString = urlObj.searchParams.get('dateEnd');

  console.log(dateStartString)
  console.log(dateEndString)

  let today = new Date();
  if (today.getUTCHours() < 7) today.setDate(today.getDate() - 1); // Steam still stands on the previous day until 6am UTC

  let dateStart = today;
  let dateEnd = today;

  if (!helpers.isStringEmpty(dateStartString)) dateStart = new Date(dateStartString);
  if (!helpers.isStringEmpty(dateEndString)) dateEnd = new Date(dateEndString);

  return { dateStart: dateStart, dateEnd: dateEnd };
}

const requestUSRevenueForCurrentDateRange = () => {
  const { dateStart, dateEnd } = getDateRangeOfCurrentPage();

  helpers.getCountryRevenue(getAppID(), 'United States', dateStart, dateEnd).then((revenue) => {
    usRevenueForDateRange = revenue;

    updateSalesNetRow();
  });
}

const requestTotalUSRevenue = () => {
  helpers.getCountryRevenue(getAppID(), 'United States').then((revenue) => {
    usRevenue = revenue;

    updateSummaryRows();
  });
}

const requestSales = () => {
  const { dateStart, dateEnd } = getDateRangeOfCurrentPage();
  const packageId = getPackageId();

  helpers.getSaleDataCSV(packageId, dateStart, dateEnd).then((res) => {
    salesForDateRange = res;

    updateSalesChart(chartSplit, chartValueType);
  });
}

const createSalesChart = () => {
  const contentBlock = createFlexContentBlock('Sales chart', 'extra_sales_chart_block');

  const dataElem = document.getElementById('gameDataLeft');
  const oldChartElem = document.getElementById('ChartUnitsHistory');
  const oldChartElemParentDiv = helpers.findParentByTag(oldChartElem, 'div');
  const AllStatsDiv = helpers.findParentByTag(oldChartElemParentDiv, 'div');
  const dateWithCSVLinkElem = AllStatsDiv.children[0];

  AllStatsDiv.style.display = 'none';

  const chartBlockElem = document.createElement('div');
  chartBlockElem.id = 'extras_sales_chart';

  contentBlock.appendChild(chartBlockElem);
  contentBlock.appendChild(dateWithCSVLinkElem);


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
    "Total",
    "Country",
    "Region",
    "Currency",
    "Platform"
  ], 'View by', chartSplit, (select) => {
    console.log(select.value);
    chartSplit = select.value;
    updateSalesChart(chartSplit, chartValueType);
  });

  createChartSelect([
    "Gross Steam Sales (USD)",
    "Net Steam Sales (USD)",
    "Gross Units Sold",
    "Net Units Sold",
    "Chargeback/Returns",
    "Chargeback/Returns (USD)"
  ], "Data", chartValueType, (select) => {
    console.log(select.value);
    chartValueType = select.value;
    updateSalesChart(chartSplit, chartValueType);
  });

  const canvas = document.createElement('canvas');
  canvas.id = 'salesChart';
  canvas.width = 800;
  canvas.height = 400;

  chartBlockElem.appendChild(canvas);

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

  salesChart = new Chart(canvas, config);
}

const updateSalesChart = (split, valueType) => {
  if (salesForDateRange === undefined) {
    console.log("Steamworks extras: Sales for Date Rage are not yet ready to be used in sales chart");
  }

  let labels = [];

  salesForDateRange.forEach((element, index) => {
    const date = element['Date'];
    if (helpers.isStringEmpty(date)) return;

    if (!labels.includes(element['Date'])) {
      labels.push(element['Date']);
    }
  });

  const grossByDateAndSplit = {};

  salesForDateRange.forEach((element, index) => {
    const splitData = split === "Total" ? "Total" : element[split];

    if (helpers.isStringEmpty(splitData)) return;

    if (!grossByDateAndSplit.hasOwnProperty(splitData)) {
      grossByDateAndSplit[splitData] = { dates: [], gross: [] };
    }

    const date = element['Date'];
    if (helpers.isStringEmpty(date)) return;

    const value = parseFloat(element[valueType]);

    const dateIndex = grossByDateAndSplit[splitData].dates.indexOf(date);
    if (dateIndex >= 0) {
      grossByDateAndSplit[splitData].gross[dateIndex] += value;
    }
    else {

      grossByDateAndSplit[splitData].dates.push(date);
      grossByDateAndSplit[splitData].gross.push(value);
    }
  });

  const entriesWithSum = Object.entries(grossByDateAndSplit).map(([key, value]) => {
    const grossSum = value.gross.reduce((acc, cur) => acc + cur, 0);
    return { key, value, grossSum };
  });

  entriesWithSum.sort((a, b) => b.grossSum - a.grossSum);

  const top10Entries = entriesWithSum.slice(0, settings.chartMaxBreakdown);

  const top10EntriesObject = top10Entries.reduce((obj, entry) => {
    obj[entry.key] = entry.value;
    return obj;
  }, {});

  const { dateStart, dateEnd } = getDateRangeOfCurrentPage();
  const oneDay = dateStart.toISOString().split('T')[0] === dateEnd.toISOString().split('T')[0];

  const datasets = [];

  if (oneDay) {
    labels = Object.keys(top10EntriesObject);
    const data = Object.entries(top10EntriesObject).map(([key, value]) => value.gross);
    const colors = Object.entries(top10EntriesObject).map(([key, value]) => {
      return chartColors[key] || `rgb(${30 + Math.round(Math.random() * 225)}, ${30 + Math.round(Math.random() * 225)}, ${30 + Math.round(Math.random() * 225)})`;
    });

    datasets.push({
      label: valueType,
      data: data,
      backgroundColor: colors
    });
  }
  else {
    for (const [key, value] of Object.entries(top10EntriesObject)) {

      const color = chartColors[key] || `rgb(${55 + Math.round(Math.random() * 200)}, ${55 + Math.round(Math.random() * 200)}, ${55 + Math.round(Math.random() * 200)})`;

      datasets.push({
        label: key,
        data: value.gross,
        fill: false,
        borderColor: color,
        tension: 0
      });
    }
  }

  salesChart.data.labels = labels;
  salesChart.data.datasets = datasets;

  salesChart.config.type = oneDay ? 'bar' : 'line';

  salesChart.update();
}

const readChartColors = () => {
  const jsonFilePath = chrome.runtime.getURL('data/chartcolors.json');

  console.log(jsonFilePath);

  fetch(jsonFilePath).then(response => {
    if (response.ok) {
      response.json().then(json => {
        chartColors = json;
      });
    }
  });
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
  const contentBlock = document.getElementById('gameDataLeft');
  const linksElem = contentBlock.children[1];
  linksElem.style.display = 'none';

  const newLinksBlockElem = document.createElement('div');
  newLinksBlockElem.classList.add('extra_content_block');
  newLinksBlockElem.id = 'extra_links_block';

  const toolbarBlock = getExtraToolbarBlock();
  toolbarBlock.appendChild(newLinksBlockElem);

  const appID = getAppID();
  const toolbarData = [
    {
      label: 'General',
      links: [
        { text: 'Store page', href: `http://store.steampowered.com/app/${appID}` },
        { text: 'Steamworks page', href: `https://partner.steamgames.com/apps/landing/${appID}` },
      ]
    },
    {
      label: 'Regional reports',
      links: [
        { text: 'Regional sales report', href: `https://partner.steampowered.com/region/${appID}` },
        { text: 'Regional key activations report', href: `https://partner.steampowered.com/cdkeyreport.php?appID=${appID}` },
        { text: 'Downloads by Region', href: `https://partner.steampowered.com/nav_regions.php?downloads=1&appID=${appID}` }
      ]
    },
    {
      label: 'Hardware',
      links: [
        { text: 'Hardware survey', href: `https://partner.steampowered.com/survey2.php?appID=${appID}` },
        { text: 'Controller stats', href: `https://partner.steampowered.com/app/controllerstats/${appID}` },
        { text: 'Remote Play stats', href: `https://partner.steampowered.com/app/remoteplay/${appID}` }
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

const moveSummaryTableToNewBlock = () => {
  const contentBlock = createFlexContentBlock('Lifetime summary', 'extra_summary_block');
  const summaryTable = document.querySelector('.lifetimeSummaryCtn table');

  contentBlock.appendChild(summaryTable);
}

const moveOldChartToNewBlock = () => {
  const contentBlock = createFlexContentBlock('Original chart', 'extra_original_chart_block');

  const oldChartControlsElem = document.getElementsByClassName('graphControls')[0];
  const oldChartElem = helpers.findParentByTag(document.getElementById('ChartUnitsHistory'), 'div');

  contentBlock.appendChild(oldChartControlsElem);
  contentBlock.appendChild(oldChartElem);
}

const moveHeatmapNewBlock = () => {
  const contentBlock = createFlexContentBlock('Sales heatmap', 'extra_sales_heatmap_block');

  const heatmapElem = document.getElementById('heatmapArea');

  contentBlock.appendChild(heatmapElem);
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

const moveSalesTableToNewBlock = () => {
  const contentBlock = createFlexContentBlock('Sales table', 'extra_sales_table_block');

  var parentElement = document.getElementById('gameDataLeft');

  var childElements = parentElement.children;
  var divs = [];

  // Filter out only those children that are divs
  for (var i = 0; i < childElements.length; i++) {
    if (childElements[i].tagName === 'DIV') {
      divs.push(childElements[i]);
    }
  }

  const salesTable = divs[2].children[0];

  contentBlock.appendChild(salesTable);
}

const moveGameTitle = () => {
  const toolbarBlock = getExtraToolbarBlock();

  const titleElem = document.getElementsByTagName('h1')[0];

  toolbarBlock.insertBefore(titleElem, toolbarBlock.firstChild);
}

const hideOriginalMainBlock = () => {
  const elem = document.getElementsByClassName('ContentWrapper')[0];
  elem.style.display = 'none';
}

init();
