let salesChart = undefined;
let chartSplit = "Country";
let chartValueType = "Gross Steam Sales (USD)";

const createSalesChartBlock = () => {
  const contentBlock = createFlexContentBlock('Sales chart', 'extra_sales_chart_block');

  const chartBlockElem = document.createElement('div');
  chartBlockElem.id = 'extras_sales_chart';

  contentBlock.appendChild(chartBlockElem);
};

const createSalesChart = () => {
  const chartBlockElem = document.createElement('div');
  chartBlockElem.id = 'extras_sales_chart';

  setFlexContentBlockContent('extra_sales_chart_block', chartBlockElem);

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
  if (!salesChart) return;

  if (salesForDateRange === undefined) {
    console.log("Steamworks extras: Sales for Date Rage are not yet ready to be used in sales chart");
  }

  const { dateStart, dateEnd } = getDateRangeOfCurrentPage();
  const oneDay = helpers.dateToString(dateStart) === helpers.dateToString(dateEnd);

  // Fill labels (dates) for chart
  let labels = [];

  let dayLoop = new Date(dateStart);
  while (dayLoop <= dateEnd) {
    const formattedDate = helpers.dateToString(dayLoop);
    labels.push(formattedDate);

    // Move to the next day
    dayLoop.setDate(dayLoop.getDate() + 1);
  }

  // Calculate data entries for chart
  const grossByDateAndSplit = {};

  salesForDateRange.forEach((element, index) => {
    const splitData = split === "Total" ? "Total" : element[split];

    if (helpers.isStringEmpty(splitData)) return;

    if (!grossByDateAndSplit.hasOwnProperty(splitData)) {
      grossByDateAndSplit[splitData] = { dates: labels, gross: new Array(labels.length).fill(0) };
    }

    const date = element['Date'];
    if (helpers.isStringEmpty(date)) return;

    const value = parseFloat(element[valueType]);

    const dateIndex = grossByDateAndSplit[splitData].dates.indexOf(date);
    if (dateIndex >= 0) {
      grossByDateAndSplit[splitData].gross[dateIndex] += value;
    }
  });

  // Floor all gross values in grossByDateAndSplit
  Object.values(grossByDateAndSplit).forEach(entry => {
    entry.gross = entry.gross.map(val => Math.floor(val));
  });

  // Filter only top entries by total value
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

  // Fill chart data set
  const datasets = [];

  if (oneDay) {
    labels = Object.keys(top10EntriesObject);
    const data = Object.entries(top10EntriesObject).map(([key, value]) => value.gross[0]);
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

  console.log(datasets);

  salesChart.data.labels = labels;
  salesChart.data.datasets = datasets;

  salesChart.config.type = oneDay ? 'bar' : 'line';

  salesChart.update();

}
