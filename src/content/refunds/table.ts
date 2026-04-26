import { setFlexContentBlockContent } from '../pageblocks';
import { RefundsTableSplitType } from './types';
import { getRefundPercentageColor } from './layout';
import { isStringEmpty, numberWithCommas } from '../../scripts/helpers';
import { dateSalesFieldMap, DateSales } from '../../shared/types/sales';

const refundsTableColumns: any[] = [
    { key: "GrossUnitsSold", label: "Sales" },
    { key: "Chargeback/Returns", label: "Refunds" },
    { key: "RefundsPercent", label: "Refunds %" },
];

export const createRefundsTable = (doc: Document, sales: DateSales[], split: RefundsTableSplitType): void => {
    const tableBlockElem = doc.createElement('div');

    setFlexContentBlockContent(doc, 'extras_refunds_table_block', tableBlockElem);

    const createTableSelect = (options: string[], name: string, defaultValue: string, onSelect: (select: RefundsTableSplitType) => void) => {
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

        selectElem.addEventListener("change", () => { onSelect(selectElem.value as RefundsTableSplitType); });

        tableBlockElem.appendChild(nameElem);
        tableBlockElem.appendChild(selectElem);

        return selectElem;
    }

    const viewByOptions = Object.values(RefundsTableSplitType);

    createTableSelect(viewByOptions, 'View by', split, (select: RefundsTableSplitType) => {
        updateRefundsTable(doc, sales, select);
    });

    // Table header outside of scrollable table
    const headerTableElem = doc.createElement('table');
    const thead = headerTableElem.createTHead();
    const headerRow = thead.insertRow();
    const th0 = doc.createElement('th');
    th0.textContent = split;
    headerRow.appendChild(th0);

    refundsTableColumns.forEach(col => {
        const th = doc.createElement('th');
        th.textContent = col.label;
        headerRow.appendChild(th);
    });

    // Wrapper is for margin because tables do not support margin in browsers
    const wrapperDiv = doc.createElement('div');
    wrapperDiv.id = 'extras_refunds_table_header';
    wrapperDiv.appendChild(headerTableElem);

    tableBlockElem.appendChild(wrapperDiv);

    // Div for scrollable table
    const tableContainerElem = doc.createElement('div');
    tableContainerElem.id = 'extras_refunds_table';
    const tableElem = doc.createElement('table');
    tableContainerElem.appendChild(tableElem);

    tableBlockElem.appendChild(tableContainerElem);
}

export const updateRefundsTable = (doc: Document, sales: DateSales[], split: RefundsTableSplitType): void => {
    const tableElem = doc.querySelector('#extras_refunds_table table') as HTMLTableElement | null;
    if (!tableElem) return;

    tableElem.innerHTML = "";

    if (typeof sales === "undefined" || !Array.isArray(sales)) {
        const row = tableElem.insertRow();
        const cell = row.insertCell();
        cell.colSpan = refundsTableColumns.length + 1;
        cell.textContent = "No refund data available.";
        return;
    }

    // Group data by split
    const groupMap: any = {};

    sales.forEach((element: DateSales) => {
        let groupKey = element[dateSalesFieldMap[split]] as string;

        // If grouping by Month, extract YYYY-MM from Date
        if (split === RefundsTableSplitType.Month && element.date) {
            const dateObj = new Date(element.date);
            groupKey = dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0');
        }

        if (isStringEmpty(groupKey)) return;

        if (!groupMap[groupKey]) {
            groupMap[groupKey] = {};
            groupMap[groupKey]["GrossUnitsSold"] = 0;
            groupMap[groupKey]["Chargeback/Returns"] = 0;
        }

        // Gross Units Sold
        let grossUnitsVal = element.grossUnitsSold;
        groupMap[groupKey]["GrossUnitsSold"] += grossUnitsVal;

        // Refunds (units)
        let refundsVal = element.chargebacksOrReturns;
        groupMap[groupKey]["Chargeback/Returns"] += refundsVal;
    });

    console.debug('groupMap: ', groupMap);

    // Prepare group array with Refunds %
    const groupArr = Object.entries(groupMap).map(([key, values]: any) => {
        const grossUnits = values["GrossUnitsSold"] || 0;
        const refunds = values["Chargeback/Returns"] || 0;
        const refundsPercent = grossUnits > 0 ? (refunds / grossUnits) * 100 : 0;
        return {
            key,
            "GrossUnitsSold": grossUnits,
            "Chargeback/Returns": refunds,
            "RefundsPercent": refundsPercent,
        };
    });

    console.debug('groupArr: ', groupArr);

    // Sort
    if (split === RefundsTableSplitType.Month) {
        (groupArr as any).sort((a: any, b: any) => new Date(b.key) as any - (new Date(a.key) as any));
    } else {
        (groupArr as any).sort((a: any, b: any) => b["GrossUnitsSold"] - a["GrossUnitsSold"]);
    }

    // Calculate total row
    const totalGrossUnits = (groupArr as any).reduce((sum: number, row: any) => sum + (row["GrossUnitsSold"] || 0), 0);
    const totalRefunds = (groupArr as any).reduce((sum: number, row: any) => sum + (row["Chargeback/Returns"] || 0), 0);
    const totalRefundsPercent = totalGrossUnits > 0 ? (totalRefunds / totalGrossUnits) * 100 : 0;
    const totalRow: any = {
        key: "Total",
        "GrossUnitsSold": totalGrossUnits,
        "Chargeback/Returns": totalRefunds,
        "RefundsPercent": totalRefundsPercent,
    };

    // Update the first column label in the header (outside the scrollable table)
    const firstTh = doc.querySelector('#extras_refunds_table_header table thead th') as HTMLTableCellElement | null;
    if (firstTh) {
        firstTh.textContent = split;
    }

    const tbody = tableElem.createTBody();

    const insertRefundsTableRow = (tbody: HTMLTableSectionElement, rowData: any) => {
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
                (td.style as any).color = `rgb(${r},${g},${b})`;

            } else {
                td.textContent = numberWithCommas(Math.round(rowData[col.key]));
                td.setAttribute('align', 'right');
            }
        });

    }

    insertRefundsTableRow(tbody, totalRow);
    (groupArr as any).forEach((row: any) => {
        insertRefundsTableRow(tbody, row);
    });
}


