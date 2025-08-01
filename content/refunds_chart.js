let refundsChart = undefined;
let chartSplit = "Total";
let chartValueType = "Refund %";

const createRefundsChartBlock = () => {
  const contentBlock = createFlexContentBlock('Refunds chart', 'extra_refunds_chart_block');

  const chartBlockElem = document.createElement('div');
  chartBlockElem.id = 'extras_refunds_chart';

  contentBlock.appendChild(chartBlockElem);
};

const createRefundsChart = () => {
  const chartBlockElem = document.createElement('div');
  chartBlockElem.id = 'extras_refunds_chart';

  setFlexContentBlockContent('extra_refunds_chart_block', chartBlockElem);

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
    updateRefundsChart(chartSplit, chartValueType);
  });

  createChartSelect([
    "Refund %",
    "Total Refunds"
  ], "Data", chartValueType, (select) => {
    console.log(select.value);
    chartValueType = select.value;
    updateRefundsChart(chartSplit, chartValueType);
  });

  const canvas = document.createElement('canvas');
  canvas.id = 'refundsChart';
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

  refundsChart = new Chart(canvas, config);

  updateRefundsChart(chartSplit, chartValueType);
}

const updateRefundsChart = (split, valueType) => {
  if (!refundsChart) return;

  if (typeof salesAllTime === "undefined" || !Array.isArray(salesAllTime)) {
    console.log("Sales data is not yet ready to be used in refunds chart");
    return;
  }

  // Group data by split and month
  const groupMap = {};

  salesAllTime.forEach(element => {
    let groupKey = element[split];
    
    // If grouping by Total, use "Total" as key
    if (split === 'Total') {
      groupKey = "Total";
    }

    if (helpers.isStringEmpty(groupKey)) return;

    // Extract YYYY-MM from Date for monthly grouping
    let monthKey = "Unknown";
    if (element['Date']) {
      const dateObj = new Date(element['Date']);
      monthKey = dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0');
    }

    if (!groupMap[groupKey]) {
      groupMap[groupKey] = {};
    }

    if (!groupMap[groupKey][monthKey]) {
      groupMap[groupKey][monthKey] = {
        grossUnits: 0,
        refunds: 0
      };
    }

    // Accumulate data
    const grossUnits = parseFloat(element["Gross Units Sold"]) || 0;
    const refunds = parseFloat(element["Chargeback/Returns"]) || 0;

    groupMap[groupKey][monthKey].grossUnits += grossUnits;
    groupMap[groupKey][monthKey].refunds += refunds;
  });

  // Get all unique months across all groups
  const allMonths = new Set();
  Object.values(groupMap).forEach(groupData => {
    Object.keys(groupData).forEach(month => {
      if (month !== "Unknown") {
        allMonths.add(month);
      }
    });
  });

  // Sort months chronologically
  const sortedMonths = Array.from(allMonths).sort();

  // Calculate refund percentages and prepare data
  const processedData = {};
  Object.entries(groupMap).forEach(([groupKey, monthData]) => {
    processedData[groupKey] = {
      months: sortedMonths,
      values: sortedMonths.map(month => {
        const data = monthData[month] || { grossUnits: 0, refunds: 0 };
        if (valueType === "Refund %") {
          return data.grossUnits > 0 ? (data.refunds / data.grossUnits) * 100 : 0;
        } else {
          return data.refunds;
        }
      })
    };
  });

  // Filter only top entries by total value
  const entriesWithSum = Object.entries(processedData).map(([key, value]) => {
    let sum;
    if (valueType === "Refund %") {
      const groupMonthData = groupMap[key] || {};
      sum = sortedMonths.reduce((acc, month) => {
        const data = groupMonthData[month] || { grossUnits: 0 };
        return acc + (parseFloat(data.grossUnits) || 0);
      }, 0);
    } else {
      sum = value.values.reduce((acc, cur) => acc + cur, 0);
    }
    return { key, value, sum };
  });

  entriesWithSum.sort((a, b) => b.sum - a.sum);

  const top10Entries = entriesWithSum.slice(0, settings.chartMaxBreakdown);

  const top10EntriesObject = top10Entries.reduce((obj, entry) => {
    obj[entry.key] = entry.value;
    return obj;
  }, {});

  // Fill chart data set
  const datasets = [];

  for (const [key, value] of Object.entries(top10EntriesObject)) {
    const color = chartColors[key] || `rgb(${55 + Math.round(Math.random() * 200)}, ${55 + Math.round(Math.random() * 200)}, ${55 + Math.round(Math.random() * 200)})`;

    datasets.push({
      label: key,
      data: value.values,
      fill: false,
      borderColor: color,
      tension: 0
    });
  }

  console.log(datasets);

  refundsChart.data.labels = sortedMonths;
  refundsChart.data.datasets = datasets;

  refundsChart.config.type = 'line';

  refundsChart.update();
}
