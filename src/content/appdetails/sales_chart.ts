import { Chart, ChartConfiguration, ChartDataset } from "chart.js";
import { createFlexContentBlock, setFlexContentBlockContent } from "../pageblocks";
import { ReviewChartSplit, SalesChartSplit, SalesChartValueType, SalesChartViewSelection, SalesData } from "./types";
import { getCurrentURL, getDateRangeFromURL } from "../site";
import { dateToString, isStringEmpty, selectChartColor } from "../../scripts/helpers";

export const createSalesChartBlock = (doc: Document) => {
    const contentBlock = createFlexContentBlock(doc, 'Sales chart', 'extra_sales_chart_block');

    const chartBlockElem = doc.createElement('div');
    chartBlockElem.id = 'extras_sales_chart';

    contentBlock.appendChild(chartBlockElem);
};

export const createSalesChart = (doc: Document, sales: SalesData, salesChartViewSelection: SalesChartViewSelection, chartColors: Record<string, string>, chartMaxBreakdown: number) => {
    const chartBlockElem = doc.createElement('div');
    chartBlockElem.id = 'extras_sales_chart';

    setFlexContentBlockContent(doc, 'extra_sales_chart_block', chartBlockElem);

    const createChartSelect = (options: string[], name: string, defaultValue: string, onSelect: (select: HTMLSelectElement) => void) => {
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

        chartBlockElem.appendChild(nameElem);
        chartBlockElem.appendChild(selectElem);

        return selectElem;
    }

    const config: ChartConfiguration = {
        type: 'line',
        data: { datasets: [], labels: [] },
        options: {
            plugins: {
                legend: {
                    position: 'top'
                }
            }
        }
    };

    const canvas = doc.createElement('canvas');
    canvas.id = 'salesChart';
    canvas.width = 800;
    canvas.height = 400;

    const chart = new Chart(canvas, config);

    createChartSelect(
        Object.values(SalesChartSplit).map(type => type),
        'View by',
        SalesChartSplit.Total,
        (select) => {
            console.log(select.value);
            salesChartViewSelection.split = select.value as SalesChartSplit;
            updateSalesChart(chart, sales, salesChartViewSelection, chartColors, chartMaxBreakdown);
        }
    );

    createChartSelect(
        Object.values(SalesChartValueType).map(type => type),
        "Data",
        SalesChartValueType.GrossSteamSalesUSD,
        (select) => {
            console.log(select.value);
            salesChartViewSelection.valueType = select.value as SalesChartValueType;
            updateSalesChart(chart, sales, salesChartViewSelection, chartColors, chartMaxBreakdown);
        }
    );

    chartBlockElem.appendChild(canvas);
}

const updateSalesChart = (chart: Chart, sales: SalesData, salesChartViewSelection: SalesChartViewSelection, chartColors: Record<string, string>, chartMaxBreakdown: number) => {
    if (!chart) return;

    if (sales.periodSales === undefined) {
        console.log("Sales for Date Rage are not yet ready to be used in sales chart");
    }

    let dateRange = getDateRangeFromURL(getCurrentURL());
    const oneDay = dateToString(dateRange.dateStart) === dateToString(dateRange.dateEnd);

    // Fill labels (dates) for chart
    let labels: string[] = [];

    let dayLoop = new Date(dateRange.dateStart);
    while (dayLoop <= dateRange.dateEnd) {
        const formattedDate = dateToString(dayLoop);
        labels.push(formattedDate);

        // Move to the next day
        dayLoop.setDate(dayLoop.getDate() + 1);
    }

    // Calculate data entries for chart
    const grossByDateAndSplit: Record<string, { dates: string[], gross: number[] }> = {};

    sales.periodSales.forEach((element: any, index: number) => {
        const splitData = salesChartViewSelection.split === SalesChartSplit.Total ? "Total" : element[salesChartViewSelection.split];

        if (isStringEmpty(splitData)) return;

        if (!grossByDateAndSplit.hasOwnProperty(splitData)) {
            grossByDateAndSplit[splitData] = { dates: labels, gross: new Array(labels.length).fill(0) };
        }

        const date = element['Date'];
        if (isStringEmpty(date)) return;

        const value = parseFloat(element[salesChartViewSelection.valueType]);

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

    const top10Entries = entriesWithSum.slice(0, chartMaxBreakdown);

    const top10EntriesObject: Record<string, { dates: string[], gross: number[] }> =
        top10Entries.reduce((obj: Record<string, { dates: string[], gross: number[] }>, entry) => {
            obj[entry.key] = entry.value;
            return obj;
        }, {});

    // Fill chart data set
    const datasets: ChartDataset[] = [];

    if (oneDay) {
        labels = Object.keys(top10EntriesObject);
        const data = Object.entries(top10EntriesObject).map(([key, value]) => value.gross[0]);
        const colors = Object.entries(top10EntriesObject).map(([key, value]) => {
            return selectChartColor(chartColors, key);
        });

        datasets.push({
            label: salesChartViewSelection.valueType,
            data: data,
            backgroundColor: colors
        });
    }
    else {
        for (const [key, value] of Object.entries(top10EntriesObject)) {

            const color = selectChartColor(chartColors, key);

            datasets.push({
                label: key,
                data: value.gross,
                fill: false,
                borderColor: color,
                tension: 0
            });
        }
    }

    chart.data.labels = labels;
    chart.data.datasets = datasets;

    if (chart.options && 'type' in chart.options) {
        chart.options.type = oneDay ? 'bar' : 'line';
    }

    chart.update();
}
