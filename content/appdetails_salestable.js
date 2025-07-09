let salesTableSplit = "Country";
let salesTableValueType = "Gross Steam Sales (USD)";

const salesTableColumns = [
  { key: "Gross Steam Sales (USD)", label: "Gross $" },
  { key: "Net Steam Sales (USD)", label: "Net $" },
  { key: "Gross Units Sold", label: "Gross units" },
  { key: "Net Units Sold", label: "Net units" },
  { key: "Chargeback/Returns (USD)", label: "Refunds $" },
  { key: "Chargeback/Returns", label: "Refund units" },
  { key: "FinalDevRevenue", label: "Dev revenue" }
];

const createSalesTableBlock = () => {
  const contentBlock = createFlexContentBlock('Sales table', 'extra_sales_table_block');
};

const createSalesTable = () => {
  const tableBlockElem = document.createElement('div');
  tableBlockElem.id = 'extras_sales_table';

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

  createTableSelect([
    "Country",
    "Region",
    "Currency",
    "Platform"
  ], 'View by', salesTableSplit, (select) => {
    salesTableSplit = select.value;
    updateSalesTable(salesTableSplit);
  });

  // Another div is for scrollable table
  const tableContainerElem = document.createElement('div');
  const tableElem = document.createElement('table');

  tableContainerElem.appendChild(tableElem);
  tableBlockElem.appendChild(tableContainerElem);
}

const updateSalesTable = (split) => {
  const tableElem = document.querySelector('#extras_sales_table > div > table');
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

  // Convert to array and sort by Gross USD descending
  const groupArr = Object.entries(groupMap).map(([key, values]) => {
    // Calculate final dev revenue for this group
    const gross = values["Gross Steam Sales (USD)"] || 0;
    const net = values["Net Steam Sales (USD)"] || 0;
    // US Gross: sum of Gross Steam Sales (USD) for US only, if available in group, else 0
    let usGross = 0;
    if (split === "Country" && key === "United States") {
      usGross = gross;
    }
    const rev = getRevenueMap(gross, net, usGross);
    console.log(`Final revenue for ${key}: ${rev.finalRevenue}`);
    return {
      key,
      ...values,
      FinalDevRevenue: rev.finalRevenue
    };
  });

  groupArr.sort((a, b) => b["Gross Steam Sales (USD)"] - a["Gross Steam Sales (USD)"]);

  // Calculate total row
  const totalRow = salesTableColumns.reduce((acc, col) => {
    acc[col.key] = groupArr.reduce((sum, row) => sum + (row[col.key] || 0), 0);
    return acc;
  }, { key: "Total" });

  // Calculate total dev revenue
  const totalGross = totalRow["Gross Steam Sales (USD)"] || 0;
  const totalNet = totalRow["Net Steam Sales (USD)"] || 0;
  let totalUsGross = 0;
  if (split === "Country") {
    const usGroup = groupArr.find(row => row.key === "United States");
    if (usGroup) totalUsGross = usGroup["Gross Steam Sales (USD)"] || 0;
  }
  
  const totalRev = getRevenueMap(totalGross, totalNet, totalUsGross);
  totalRow["FinalDevRevenue"] = totalRev.finalRevenue;

  // Table header
  const thead = tableElem.createTHead();
  const headerRow = thead.insertRow();
  const splitLabel = split;
  const th0 = document.createElement('th');
  th0.textContent = splitLabel;
  headerRow.appendChild(th0);

  salesTableColumns.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col.label;
    headerRow.appendChild(th);
  });

  // Table body
  const tbody = tableElem.createTBody();
  // Add total row first
  const trTotal = tbody.insertRow();
  const tdTotalKey = trTotal.insertCell();
  tdTotalKey.textContent = "Total";
  salesTableColumns.forEach(col => {
    const td = trTotal.insertCell();
    let val = totalRow[col.key];
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

  // Add group rows
  groupArr.forEach(row => {
    const tr = tbody.insertRow();
    const tdKey = tr.insertCell();
    tdKey.textContent = row.key;
    salesTableColumns.forEach(col => {
      const td = tr.insertCell();
      let val = row[col.key];
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
  });
}
