import { ChartConfiguration, Chart } from "chart.js";
import { RefundsChartSelection, RefundsChartSplitType, RefundsChartValueType } from './types';
import { setFlexContentBlockContent } from '../pageblocks';
import { isStringEmpty } from '../../scripts/helpers';
import { dateSalesFieldMap, DateSales } from '../../shared/types/sales';

export const createRefundsChart = (doc: Document, sales: DateSales[], chartSelection: RefundsChartSelection, chartColors: Record<string, string>, chartMaxBreakdown: number): Chart => {
    const chartBlockElem = doc.createElement('div');
    chartBlockElem.id = 'extras_refunds_chart';

    setFlexContentBlockContent(doc, 'extra_refunds_chart_block', chartBlockElem);

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

        (selectElem as any).value = defaultValue;

        selectElem.addEventListener("change", () => { onSelect(selectElem); });

        chartBlockElem.appendChild(nameElem);
        chartBlockElem.appendChild(selectElem);

        return selectElem;
    }

    const canvas = doc.createElement('canvas');
    (canvas as any).id = 'refundsChart';
    (canvas as any).width = 800;
    (canvas as any).height = 400;

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

    const refundsChart = new Chart(canvas, config);

    createChartSelect(
        Object.values(RefundsChartSplitType).map(type => type),
        'View by',
        chartSelection.split,
        (select) => {
            console.log(select.value);
            chartSelection.split = select.value as RefundsChartSplitType;
            updateRefundsChart(refundsChart, sales, chartSelection, chartColors, chartMaxBreakdown);
        }
    );

    createChartSelect(
        Object.values(RefundsChartValueType).map(type => type),
        "Data",
        chartSelection.valueType,
        (select) => {
            console.log(select.value);
            chartSelection.valueType = select.value as RefundsChartValueType;
            updateRefundsChart(refundsChart, sales, chartSelection, chartColors, chartMaxBreakdown);
        }
    );

    chartBlockElem.appendChild(canvas);

    return refundsChart;
}

export const updateRefundsChart = (chart: Chart, sales: DateSales[], chartSelection: RefundsChartSelection, chartColors: Record<string, string>, chartMaxBreakdown: number): void => {
    if (!chart) return;

    if (typeof sales === "undefined" || !Array.isArray(sales)) {
        console.log("Sales data is not yet ready to be used in refunds chart");
        return;
    }

    // Group data by split and month
    const groupMap = createGroupMap(sales, chartSelection);

    const sortedMonths = getMonthsFromGroupMap(groupMap);

    // Calculate refund percentages and prepare data
    const processedData: any = {};
    Object.entries(groupMap).forEach(([groupKey, monthData]: [string, any]) => {
        processedData[groupKey] = {
            months: sortedMonths,
            values: sortedMonths.map(month => {
                const data = monthData[month] || { grossUnits: 0, refunds: 0 };
                if (chartSelection.valueType === RefundsChartValueType.RefundPercent) {
                    return data.grossUnits > 0 ? (data.refunds / data.grossUnits) * 100 : 0;
                } else {
                    return data.refunds;
                }
            })
        };
    });

    // Filter only top entries by total value
    const entriesWithSum = Object.entries(processedData).map(([key, value]: any) => {
        let sum: number;
        if (chartSelection.valueType === RefundsChartValueType.RefundPercent) {
            const groupMonthData = groupMap[key] || {};
            sum = sortedMonths.reduce((acc: number, month: string) => {
                const data = groupMonthData[month] || { grossUnits: 0 };
                return acc + data.grossUnits;
            }, 0);
        } else {
            sum = value.values.reduce((acc: number, cur: number) => acc + cur, 0);
        }
        return { key, value, sum };
    });

    entriesWithSum.sort((a: any, b: any) => b.sum - a.sum);

    const top10Entries = entriesWithSum.slice(0, chartMaxBreakdown);

    const top10EntriesObject = top10Entries.reduce((obj: any, entry: any) => {
        obj[entry.key] = entry.value;
        return obj;
    }, {} as any);

    // Fill chart data set
    const datasets: any[] = [];

    for (const [key, value] of Object.entries(top10EntriesObject) as any) {
        const color = chartColors[key] || `rgb(${55 + Math.round(Math.random() * 200)}, ${55 + Math.round(Math.random() * 200)}, ${55 + Math.round(Math.random() * 200)})`;

        datasets.push({
            label: key,
            data: (value as any).values,
            fill: false,
            borderColor: color,
            tension: 0
        });
    }

    console.log(datasets);

    chart.data.labels = sortedMonths;
    chart.data.datasets = datasets;

    if (chart.options && 'type' in chart.options) {
        chart.options.type = 'line';
    }

    chart.update();
}

// Group sales data by split and month
const createGroupMap = (sales: DateSales[], chartSelection: RefundsChartSelection): Record<string, Record<string, { grossUnits: number, refunds: number }>> => {

    const groupMap: Record<string, Record<string, { grossUnits: number, refunds: number }>> = {};

    sales.forEach((element: DateSales) => {
        let groupKey = element[dateSalesFieldMap[chartSelection.split]] as string;

        // If grouping by Total, use "Total" as key
        if (chartSelection.split === RefundsChartSplitType.Total) {
            groupKey = RefundsChartSplitType.Total;
        }

        if (isStringEmpty(groupKey)) return;

        // Extract YYYY-MM from Date for monthly grouping
        let monthKey = "Unknown";
        if (element.date) {
            const dateObj = new Date(element.date);
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
        const grossUnits = element.grossUnitsSold;
        const refunds = element.chargebacksOrReturns;

        groupMap[groupKey][monthKey].grossUnits += grossUnits;
        groupMap[groupKey][monthKey].refunds += refunds;
    });

    return groupMap;
}

const getMonthsFromGroupMap = (groupMap: Record<string, Record<string, { grossUnits: number, refunds: number }>>): string[] => {
    const allMonths = new Set<string>();
    Object.values(groupMap).forEach((groupData: any) => {
        Object.keys(groupData).forEach((month: string) => {
            if (month !== "Unknown") {
                allMonths.add(month);
            }
        });
    });

    // Sort months chronologically
    const sortedMonths = Array.from(allMonths).sort();
    return sortedMonths;
}
