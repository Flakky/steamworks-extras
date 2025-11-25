import { createFlexContentBlock, setFlexContentBlockContent } from "../pageblocks";
import { RoyaltiesAndTaxesMap, SalesData, SalesTableColumns, SalesTableSplit } from "./types";
import { isStringEmpty, numberWithCommas } from "../../scripts/helpers";
import { getRevenueMap } from "./revenue";
import { DateSales, dateSalesFieldMap } from "../../shared/types/sales";

export const createSalesTable = (doc: Document, sales: SalesData, singleDay: boolean, grossNetRatio: number, salesTableColumns: SalesTableColumns, royaltiesAndTaxes: RoyaltiesAndTaxesMap) => {
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
    let viewByOptions = Object.values(SalesTableSplit).map(type => type)

    if (!singleDay) {
        viewByOptions = viewByOptions.filter(type => type !== SalesTableSplit.Date);;
    }

    const salesTableSplit: SalesTableSplit = singleDay ? SalesTableSplit.Country : SalesTableSplit.Date;

    createTableSelect(
        viewByOptions,
        'View by',
        salesTableSplit,
        (select) => {
            const split = select.value as SalesTableSplit;
            updateSalesTable(doc, sales, grossNetRatio, split, salesTableColumns, royaltiesAndTaxes);
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

const updateSalesTable = (doc: Document, sales: SalesData, grossNetRatio: number, salesTableSplit: SalesTableSplit, salesTableColumns: SalesTableColumns, royaltiesAndTaxes: RoyaltiesAndTaxesMap) => {
    const tableElem = doc.querySelector('#extras_sales_table table') as HTMLTableElement | null;
    if (!tableElem) {
        throw new Error("Table element not found");
    }

    tableElem.innerHTML = "";

    if (typeof sales.periodSales === "undefined" || !Array.isArray(sales.periodSales) || sales.periodSales.length === 0) {
        const row = tableElem.insertRow();
        const cell = row.insertCell();
        cell.colSpan = salesTableColumns.length + 1;
        cell.textContent = "No sales data available.";
        return;
    }

    // Group data by split
    const groupMap = makeGroupMap(sales.periodSales, salesTableSplit, salesTableColumns);

    // Add final dev revenue for groups
    const groupArr = Object.entries(groupMap).map(([key, values]) => {

        const gross = values["Gross Steam Sales (USD)"] || 0;

        if (gross == 0) return {
            key,
            values: { ...values },
            FinalDevRevenue: 0
        };

        let usGross = 0;
        if (salesTableSplit === SalesTableSplit.Country && key === "United States") {
            usGross = gross;
        } else if (salesTableSplit === SalesTableSplit.Date) {
            usGross = sales.periodUsRevenue
        }
        const rev = getRevenueMap(gross, gross * grossNetRatio, usGross, royaltiesAndTaxes);

        return {
            key,
            values: { ...values },
            FinalDevRevenue: rev.finalRevenue
        };
    });

    // Sort
    if (salesTableSplit === SalesTableSplit.Date) {
        groupArr.sort((a, b) => new Date(b.key).getTime() - new Date(a.key).getTime());
    } else {
        const sortKey = "Gross Steam Sales (USD)";
        groupArr.sort((a, b) => b.values[sortKey] - a.values[sortKey]);
    }

    // Calculate total row
    const totalRow: Record<string, number> = salesTableColumns.reduce((acc, col) => {
        acc[col.key] = groupArr.reduce((sum, row) => sum + (row.values[col.key] || 0), 0);
        return acc;
    }, { "Total": 0 } as Record<string, number>);

    // Calculate total dev revenue
    const totalGross = totalRow["Gross Steam Sales (USD)"] || 0;
    let totalUsGross = 0;
    if (salesTableSplit === SalesTableSplit.Country) {
        const usGroup = groupArr.find(row => row.key === "United States");
        if (usGroup) totalUsGross = usGroup.values["Gross Steam Sales (USD)"] || 0;
    }
    else if (salesTableSplit === SalesTableSplit.Date) {
        // For date grouping, sum up all US sales across all dates
        totalUsGross = groupArr.reduce((sum, row) => {
            // Find US sales for this date from the original data
            const dateUsSales = sales.periodSales
                .filter((item: DateSales) => item.date === row.key && item.country === "United States")
                .reduce((dateSum: number, item: DateSales) => dateSum + (item.grossSteamSalesUSD || 0), 0);
            return sum + dateUsSales;
        }, 0);
    }

    const { finalRevenue } = getRevenueMap(totalGross, totalGross * grossNetRatio, totalUsGross, royaltiesAndTaxes);

    totalRow["FinalDevRevenue"] = finalRevenue;

    // Update the first column label in the header (outside the scrollable table)
    const firstTh = doc.querySelector('#extras_sales_table_header table thead th');
    if (firstTh) {
        firstTh.textContent = salesTableSplit;
    }

    const tbody = tableElem.createTBody();

    const insertSalesTableRow = (tbody: HTMLTableSectionElement, rowData: any) => {
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

const makeGroupMap = (periodSales: DateSales[], salesTableSplit: SalesTableSplit, salesTableColumns: SalesTableColumns) => {
    const groupMap: Record<string, Record<string, number>> = {};

    periodSales.forEach((element: DateSales) => {
        let groupKey = element[dateSalesFieldMap[salesTableSplit]] as string;

        if (isStringEmpty(groupKey)) return;

        if (!groupMap[groupKey]) {
            groupMap[groupKey] = {};
            salesTableColumns.forEach(col => {
                groupMap[groupKey][col.key] = 0;
            });
        }

        salesTableColumns.forEach(col => {
            let val = element[col.key as keyof DateSales] as number;
            groupMap[groupKey][col.key] += val;
        });
    });

    return groupMap;
}
