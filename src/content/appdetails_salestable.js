let salesTableSplit = "Country";
let salesTableValueType = "Gross Steam Sales (USD)";

const salesTableColumns = [
  { key: "Gross Steam Sales (USD)", label: "Gross" },
  { key: "Net Steam Sales (USD)", label: "Net" },
  { key: "Gross Units Sold", label: "Gross units" },
  { key: "Net Units Sold", label: "Net units" },
  { key: "Chargeback/Returns (USD)", label: "Refunds" },
  { key: "Chargeback/Returns", label: "Refund units" },
  { key: "FinalDevRevenue", label: "Est. revenue" },
];

const createSalesTableBlock = () => {
  const contentBlock = createFlexContentBlock('Sales table', 'extra_sales_table_block');
};

const createSalesTable = () => {
  const tableBlockElem = document.createElement('div');

  setFlexContentBlockContent('extra_sales_table_block', tableBlockElem);

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

  // Get date range to determine if we should show Date filter
  const { dateStart, dateEnd } = getDateRangeOfCurrentPage();
  const isSingleDay = helpers.dateToString(dateStart) === helpers.dateToString(dateEnd);
  
  const viewByOptions = [
    "Country",
    "Region",
    "Currency",
    "Platform"
  ];

  if (!isSingleDay) {
    viewByOptions.unshift("Date");
  }

  salesTableSplit = isSingleDay ? "Country" : "Date";

  createTableSelect(viewByOptions, 'View by', salesTableSplit, (select) => {
    salesTableSplit = select.value;
    updateSalesTable(salesTableSplit);
  });

  // Table header outside of scrollable table
  const headerTableElem = document.createElement('table');
  const thead = headerTableElem.createTHead();
  const headerRow = thead.insertRow();
  const th0 = document.createElement('th');
  th0.textContent = salesTableSplit;
  headerRow.appendChild(th0);

  salesTableColumns.forEach(col => {
    const th = document.createElement('th');
    if (col.key === "FinalDevRevenue") {
      th.innerHTML = `${col.label} <a href="#" class="tooltip">(?)<span>Estimated developer revenue based on gross. We do not calculate it based on net here, because net is deducted by refunds from sales made in previous periods.</span></a>`;
    } else {
      th.textContent = col.label;
    }
    headerRow.appendChild(th);
  });
  
  // Wrapper is for margin because tables do not support margin in browsers
  const wrapperDiv = document.createElement('div');
  wrapperDiv.id = 'extras_sales_table_header';
  wrapperDiv.appendChild(headerTableElem);

  tableBlockElem.appendChild(wrapperDiv);
  
  // Div for scrollable table
  const tableContainerElem = document.createElement('div');
  tableContainerElem.id = 'extras_sales_table';
  const tableElem = document.createElement('table');
  tableContainerElem.appendChild(tableElem);

  tableBlockElem.appendChild(tableContainerElem);
}

const updateSalesTable = (split) => {
  const tableElem = document.querySelector('#extras_sales_table table');
  if (!tableElem) return;

  tableElem.innerHTML = "";

  if (typeof salesForDateRange === "undefined" || !Array.isArray(salesForDateRange)) {
    const row = tableElem.insertRow();
    const cell = row.insertCell();
    cell.colSpan = salesTableColumns.length + 1;
    cell.textContent = "No sales data available.";
    return;
  }

  // Group data by split
  const groupMap = {};

  salesForDateRange.forEach(element => {
    let groupKey = element[split];
    if (helpers.isStringEmpty(groupKey)) return;

    if (!groupMap[groupKey]) {
      groupMap[groupKey] = {};
      salesTableColumns.forEach(col => {
        groupMap[groupKey][col.key] = 0;
      });
    }

    salesTableColumns.forEach(col => {
      let val = element[col.key];
      if (typeof val === "string") val = val.replace(/,/g, "");
      val = parseFloat(val) || 0;
      groupMap[groupKey][col.key] += val;
    });
  });

  const grossNetRatio = getTotalRevenue(false) / getTotalRevenue(true);

  // Add final dev revenue for groups
  const groupArr = Object.entries(groupMap).map(([key, values]) => {
    
    const gross = values["Gross Steam Sales (USD)"] || 0;

    if(gross == 0) return {
      key,
      ...values,
      FinalDevRevenue: 0
    };

    let usGross = 0;
    if (split === "Country" && key === "United States") {
      usGross = gross;
    } else if (split === "Date") {
      usGross = salesForDateRange
        .filter(item => item["Date"] === key && item["Country"] === "United States")
        .reduce((sum, item) => sum + (item["Gross Steam Sales (USD)"] || 0), 0);
    }
    const rev = getRevenueMap(gross, gross * grossNetRatio, usGross);

    return {
      key,
      ...values,
      FinalDevRevenue: rev.finalRevenue
    };
  });

  // Sort
  if (split === "Date") {
    groupArr.sort((a, b) => new Date(b.key) - new Date(a.key));
  } else {
    const sortKey = "Gross Steam Sales (USD)";
    groupArr.sort((a, b) => b[sortKey] - a[sortKey]);
  }

  // Calculate total row
  const totalRow = salesTableColumns.reduce((acc, col) => {
    acc[col.key] = groupArr.reduce((sum, row) => sum + (row[col.key] || 0), 0);
    return acc;
  }, { key: "Total" });

  // Calculate total dev revenue
  const totalGross = totalRow["Gross Steam Sales (USD)"] || 0;
  let totalUsGross = 0;
  if (split === "Country") {
    const usGroup = groupArr.find(row => row.key === "United States");
    if (usGroup) totalUsGross = usGroup["Gross Steam Sales (USD)"] || 0;
  } else if (split === "Date") {
    // For date grouping, sum up all US sales across all dates
    totalUsGross = groupArr.reduce((sum, row) => {
      // Find US sales for this date from the original data
      const dateUsSales = salesForDateRange
        .filter(item => item["Date"] === row.key && item["Country"] === "United States")
        .reduce((dateSum, item) => dateSum + (item["Gross Steam Sales (USD)"] || 0), 0);
      return sum + dateUsSales;
    }, 0);
  }

  const { finalRevenue } = getRevenueMap(totalGross, totalGross * grossNetRatio, totalUsGross);

  totalRow["FinalDevRevenue"] = finalRevenue;

  // Update the first column label in the header (outside the scrollable table)
  const firstTh = document.querySelector('#extras_sales_table_header table thead th');
  if (firstTh) {
    firstTh.textContent = split;
  }

  const tbody = tableElem.createTBody();

  const insertSalesTableRow = (tbody, rowData) => {
    const tr = tbody.insertRow();
    const tdKey = tr.insertCell();
    tdKey.textContent = rowData.key;
    salesTableColumns.forEach(col => {
      const td = tr.insertCell();
      let val = rowData[col.key];
      if (col.key === "FinalDevRevenue") {
        td.textContent = "$" + helpers.numberWithCommas(Math.floor(val));
        td.setAttribute('align', 'right');
      } else if (col.key.includes("USD") || col.key.includes("$")) {
        td.textContent = "$" + helpers.numberWithCommas(val.toFixed(2));
        td.setAttribute('align', 'right');
      } else {
        td.textContent = helpers.numberWithCommas(Math.round(val));
        td.setAttribute('align', 'right');
      }
    });
  }

  insertSalesTableRow(tbody, totalRow);
  groupArr.forEach(row => {
    insertSalesTableRow(tbody, row);
  });
}
