import { createFlexContentBlock, setFlexContentBlockContent } from "../pageblocks";
import { SalesData, SalesTableColumns, SalesTableSplit } from "./types";
import { isStringEmpty, numberWithCommas } from "../../scripts/helpers";
import { getRevenueMap } from "./revenue";

export const createSalesTableBlock = (doc: Document) => {
    createFlexContentBlock(doc, 'Sales table', 'extra_sales_table_block');
};

const createSalesTable = (doc: Document, sales: SalesData, salesTableColumns: SalesTableColumns) => {
    const tableBlockElem = doc.createElement('div');

    setFlexContentBlockContent(doc, 'extra_sales_table_block', tableBlockElem);

    const createTableSelect = (options: string[], name: string, defaultValue: string, onSelect: (select: HTMLSelectElement) => void) => {
        const nameElem = doc.createElement("b");
        nameElem.textContent = `${name}: `;
        nameElem.classList.add('extra_chart_select_name');

        const selectElem = doc.createElement("select");

        options.forEach(option => {
            const optionElement = doc.createElement("option");
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

    let viewByOptions = Object.values(SalesTableSplit).map(type => type)

    if (!isSingleDay) {
        viewByOptions = viewByOptions.filter(type => type !== SalesTableSplit.Date);;
    }

    const salesTableSplit: SalesTableSplit = isSingleDay ? SalesTableSplit.Country : SalesTableSplit.Date;

    createTableSelect(
        viewByOptions,
        'View by',
        salesTableSplit,
        (select) => {
            const split = select.value as SalesTableSplit;
            updateSalesTable(doc, sales, split, salesTableColumns);
        }
    );

    // Table header outside of scrollable table
    const headerTableElem = doc.createElement('table');
    const thead = headerTableElem.createTHead();
    const headerRow = thead.insertRow();
    const th0 = doc.createElement('th');
    th0.textContent = salesTableSplit;
    headerRow.appendChild(th0);

    salesTableColumns.forEach(col => {
        const th = doc.createElement('th');
        if (col.key === "FinalDevRevenue") {
            th.innerHTML = `${col.label} <a href="#" class="tooltip">(?)<span>Estimated developer revenue based on gross. We do not calculate it based on net here, because net is deducted by refunds from sales made in previous periods.</span></a>`;
        } else {
            th.textContent = col.label;
        }
        headerRow.appendChild(th);
    });

    // Wrapper is for margin because tables do not support margin in browsers
    const wrapperDiv = doc.createElement('div');
    wrapperDiv.id = 'extras_sales_table_header';
    wrapperDiv.appendChild(headerTableElem);

    tableBlockElem.appendChild(wrapperDiv);

    // Div for scrollable table
    const tableContainerElem = doc.createElement('div');
    tableContainerElem.id = 'extras_sales_table';
    const tableElem = doc.createElement('table');
    tableContainerElem.appendChild(tableElem);

    tableBlockElem.appendChild(tableContainerElem);
}

const updateSalesTable = (doc: Document, sales: SalesData, salesTableSplit: SalesTableSplit, salesTableColumns: SalesTableColumns) => {
    const tableElem = doc.querySelector('#extras_sales_table table') as HTMLTableElement | null;
    if (!tableElem) {
        throw new Error("Table element not found");
    }

    tableElem.innerHTML = "";

    if (typeof sales.periodSales === "undefined" || !Array.isArray(sales.periodSales)) {
        const row = tableElem.insertRow();
        const cell = row.insertCell();
        cell.colSpan = salesTableColumns.length + 1;
        cell.textContent = "No sales data available.";
        return;
    }

    // Group data by split
    const groupMap: Record<string, Record<string, number>> = {};

    sales.periodSales.forEach(element => {
        let groupKey = element[salesTableSplit];

        if (isStringEmpty(groupKey)) return;

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

        if (gross == 0) return {
            key,
            ...values,
            FinalDevRevenue: 0
        };

        let usGross = 0;
        if (salesTableSplit === SalesTableSplit.Country && key === "United States") {
            usGross = gross;
        } else if (salesTableSplit === SalesTableSplit.Date) {
            usGross = sales.periodUsRevenue
        }
        const rev = getRevenueMap(gross, gross * grossNetRatio, usGross);

        return {
            key,
            ...values,
            FinalDevRevenue: rev.finalRevenue
        };
    });

    // Sort
    if (salesTableSplit === SalesTableSplit.Date) {
        groupArr.sort((a, b) => new Date(b.key).getTime() - new Date(a.key).getTime());
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
    if (salesTableSplit === "Country") {
        const usGroup = groupArr.find(row => row.key === "United States");
        if (usGroup) totalUsGross = usGroup["Gross Steam Sales (USD)"] || 0;
    } else if (salesTableSplit === "Date") {
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
    const firstTh = doc.querySelector('#extras_sales_table_header table thead th');
    if (firstTh) {
        firstTh.textContent = salesTableSplit;
    }

    const tbody = tableElem.createTBody();

    const insertSalesTableRow = (tbody: HTMLTableSectionElement, rowData: Record<string, number>) => {
        const tr = tbody.insertRow();
        const tdKey = tr.insertCell();
        tdKey.textContent = rowData.key.toString();
        salesTableColumns.forEach(col => {
            const td = tr.insertCell();
            let val = rowData[col.key];
            if (col.key === "FinalDevRevenue") {
                td.textContent = "$" + numberWithCommas(Math.floor(val));
                td.setAttribute('align', 'right');
            } else if (col.key.includes("USD") || col.key.includes("$")) {
                td.textContent = "$" + numberWithCommas(Number(val.toFixed(2)));
                td.setAttribute('align', 'right');
            } else {
                td.textContent = numberWithCommas(Math.round(val));
                td.setAttribute('align', 'right');
            }
        });
    }

    insertSalesTableRow(tbody, totalRow);
    groupArr.forEach(row => {
        insertSalesTableRow(tbody, row);
    });
}
