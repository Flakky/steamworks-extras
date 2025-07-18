let refundsTableSplit = "Country";
let refundsTableValueType = "Chargeback/Returns (USD)";

const refundsTableColumns = [
  { key: "GrossUnitsSold", label: "Sales" },
  { key: "Chargeback/Returns", label: "Refunds" },
  { key: "RefundsPercent", label: "Refunds %" },
];

const createRefundsTableBlock = () => {
  createFlexContentBlock('Refunds table', 'extras_refunds_table_block');
};

const createRefundsTable = () => {
  const tableBlockElem = document.createElement('div');

  setFlexContentBlockContent('extras_refunds_table_block', tableBlockElem);

  const createTableSelect = (options, name, defaultValue, onSelect) => {
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

    tableBlockElem.appendChild(nameElem);
    tableBlockElem.appendChild(selectElem);

    return selectElem;
  }

  const viewByOptions = [
    "Month",
    "Country",
    "Region",
    "Currency",
    "Platform"
  ];

  refundsTableSplit = "Month";

  createTableSelect(viewByOptions, 'View by', refundsTableSplit, (select) => {
    refundsTableSplit = select.value;
    updateRefundsTable(refundsTableSplit);
  });

  // Table header outside of scrollable table
  const headerTableElem = document.createElement('table');
  const thead = headerTableElem.createTHead();
  const headerRow = thead.insertRow();
  const th0 = document.createElement('th');
  th0.textContent = refundsTableSplit;
  headerRow.appendChild(th0);

  refundsTableColumns.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col.label;
    headerRow.appendChild(th);
  });
  
  // Wrapper is for margin because tables do not support margin in browsers
  const wrapperDiv = document.createElement('div');
  wrapperDiv.id = 'extras_refunds_table_header';
  wrapperDiv.appendChild(headerTableElem);

  tableBlockElem.appendChild(wrapperDiv);
  
  // Div for scrollable table
  const tableContainerElem = document.createElement('div');
  tableContainerElem.id = 'extras_refunds_table';
  const tableElem = document.createElement('table');
  tableContainerElem.appendChild(tableElem);

  tableBlockElem.appendChild(tableContainerElem);

  updateRefundsTable(refundsTableSplit);
}

const updateRefundsTable = (split) => {
  const tableElem = document.querySelector('#extras_refunds_table table');
  if (!tableElem) return;

  tableElem.innerHTML = "";

  if (typeof salesAllTime === "undefined" || !Array.isArray(salesAllTime)) {
    const row = tableElem.insertRow();
    const cell = row.insertCell();
    cell.colSpan = refundsTableColumns.length + 1;
    cell.textContent = "No refund data available.";
    return;
  }

  // Group data by split
  const groupMap = {};

  salesAllTime.forEach(element => {
    let groupKey = element[split];
    
    // If grouping by Month, extract YYYY-MM from Date
    if (split === 'Month' && element['Date']) {
      const dateObj = new Date(element['Date']);
      groupKey = dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0');
    }

    if (helpers.isStringEmpty(groupKey)) return;

    if (!groupMap[groupKey]) {
      groupMap[groupKey] = {};
      refundsTableColumns.forEach(col => {
        groupMap[groupKey][col.key] = 0;
      });
    }

    // Gross Units Sold
    let grossUnitsVal = element["Gross Units Sold"];
    groupMap[groupKey]["GrossUnitsSold"] += grossUnitsVal;

    // Refunds (units)
    let refundsVal = element["Chargeback/Returns"];
    groupMap[groupKey]["Chargeback/Returns"] += refundsVal;
  });

  // Prepare group array with Refunds %
  const groupArr = Object.entries(groupMap).map(([key, values]) => {
    const refunds = values["Chargeback/Returns"] || 0;
    const grossUnits = values["GrossUnitsSold"] || 0;
    const refundsPercent = grossUnits > 0 ? (refunds / grossUnits) * 100 : 0;
    return {
      key,
      "GrossUnitsSold": grossUnits,
      "Chargeback/Returns": refunds,
      "RefundsPercent": refundsPercent,
    };
  });

  // Sort
  if (split === "Month") {
    groupArr.sort((a, b) => new Date(b.key) - new Date(a.key));
  } else {
    groupArr.sort((a, b) => b["GrossUnitsSold"] - a["GrossUnitsSold"]);
  }

  // Calculate total row
  const totalGrossUnits = groupArr.reduce((sum, row) => sum + (row["GrossUnitsSold"] || 0), 0);
  const totalRefunds = groupArr.reduce((sum, row) => sum + (row["Chargeback/Returns"] || 0), 0);
  const totalRefundsPercent = totalGrossUnits > 0 ? (totalRefunds / totalGrossUnits) * 100 : 0;
  const totalRow = {
    key: "Total",
    "GrossUnitsSold": totalGrossUnits,
    "Chargeback/Returns": totalRefunds,
    "RefundsPercent": totalRefundsPercent,
  };

  // Update the first column label in the header (outside the scrollable table)
  const firstTh = document.querySelector('#extras_refunds_table_header table thead th');
  if (firstTh) {
    firstTh.textContent = split;
  }

  const tbody = tableElem.createTBody();

  const insertRefundsTableRow = (tbody, rowData) => {
    const tr = tbody.insertRow();
    const tdKey = tr.insertCell();
    tdKey.textContent = rowData.key;

    refundsTableColumns.forEach(col => {
      const td = tr.insertCell();
      if (col.key === "RefundsPercent") {
        td.textContent = rowData[col.key].toFixed(2) + "%";
        td.setAttribute('align', 'right');

        const percent = rowData[col.key];
        const { r, g, b } = getRefundPercentageColor(percent);
        td.style.color = `rgb(${r},${g},${b})`;
        
      } else {
        td.textContent = helpers.numberWithCommas(Math.round(rowData[col.key]));
        td.setAttribute('align', 'right');
      }
    });
    
  }

  insertRefundsTableRow(tbody, totalRow);
  groupArr.forEach(row => {
    insertRefundsTableRow(tbody, row);
  });
}


function getRefundPercentageColor(percentage) {
  const startColor = { r: 0, g: 220, b: 0 };
  const endColor = { r: 220, g: 0, b: 0 };
  const min = 8;
  const max = 20;
  const clamped = Math.max(min, Math.min(max, percentage));
  const factor = (clamped - min) / (max - min);
  return {
    r: Math.round(startColor.r + factor * (endColor.r - startColor.r)),
    g: Math.round(startColor.g + factor * (endColor.g - startColor.g)),
    b: Math.round(startColor.b + factor * (endColor.b - startColor.b))
  };
}