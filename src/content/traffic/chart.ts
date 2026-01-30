import { getDateRangeArray } from "../../shared/types/daterange";
import { TrafficChartDataType, TrafficCategorySelection, TrafficTypeSelection } from "./types";
import { getPageContentElem } from "./layout";
import { Chart, ChartConfiguration, ChartDataset } from "chart.js";
import { selectChartColor } from "../../scripts/helpers";
import { getDateRangeOfCurrentPage } from "./apptraffic"
import { GameTraffic } from "../../shared/types/traffic";

export const createChart = (doc: Document, trafficData: GameTraffic[], dataType: TrafficTypeSelection, categorySelection: TrafficCategorySelection, chartColors: Record<string, string>): Chart => {
    const chartBlockElem = doc.createElement('div');
    chartBlockElem.id = 'extras_chart';

    const pageContentElem = getPageContentElem(doc);
    pageContentElem.insertBefore(chartBlockElem, pageContentElem.children[18]);

    const createChartSelect = (options: string[], name: string, type: TrafficChartDataType, onSelect: (select: HTMLSelectElement) => void) => {
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

        selectElem.value = type;

        selectElem.addEventListener("change", () => { onSelect(selectElem); });

        chartBlockElem.appendChild(nameElem);
        chartBlockElem.appendChild(selectElem);

        return selectElem;
    }

    const canvas = document.createElement('canvas');
    canvas.id = 'extra_trafficChart';
    canvas.width = 800;
    canvas.height = 400;

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

    const trafficChart = new Chart(canvas, config);

    createChartSelect(
        Object.values(TrafficChartDataType).map(type => type),
        'View by',
        dataType.type,
        (select) => {
            console.log(select.value);
            const selectedDataType = select.value as TrafficChartDataType;
            dataType.type = selectedDataType;
            updateTrafficChart(doc, trafficData, trafficChart, dataType, categorySelection, chartColors);
        }
    );

    chartBlockElem.appendChild(canvas);

    return trafficChart;
}

export const updateTrafficChart = (doc: Document, trafficData: GameTraffic[], chart: Chart, dataType: TrafficTypeSelection, categorySelection: TrafficCategorySelection, chartColors: Record<string, string>) => {
    const dateRange = getDateRangeOfCurrentPage(doc);

    const days = getDateRangeArray(dateRange, false, true) as string[];

    const chartData = createChartData(trafficData, categorySelection, days);

    const datasets: ChartDataset[] = [];

    for (const [key, value] of Object.entries(chartData)) {

        const values: number[] = value.map(val => {
            switch (dataType.type) {
                case TrafficChartDataType.Impressions: return val.impressions;
                case TrafficChartDataType.Visits: return val.visits;
                case TrafficChartDataType.ClickThroughRate:
                    const dataValue = Number((val.visits / val.impressions * 100.0).toFixed(2));
                    return isNaN(dataValue) ? 0.0 : dataValue;
                default: return 0.0;
            }
        });

        console.log(values);

        const color = selectChartColor(chartColors, key);

        datasets.push({
            label: key,
            data: values,
            fill: false,
            backgroundColor: color,
            borderColor: color,
            tension: 0
        });
    }

    chart.data.labels = days;
    chart.data.datasets = datasets;

    chart.update();
}

const createChartData = (trafficData: GameTraffic[], categorySelection: TrafficCategorySelection, days: string[]): Record<string, { impressions: number, visits: number }[]> => {
    const chartData: Record<string, { impressions: number, visits: number }[]> = {};

    const addDataToMap = (tag: string, date: string, value: { impressions: number, visits: number }) => {
        if (chartData[tag] === undefined) chartData[tag] = Array.from(
            { length: days.length },
            () => ({ impressions: 0, visits: 0 }));

        const dateIndex = days.indexOf(date);
        if (dateIndex < 0) return;

        chartData[tag][dateIndex].impressions += value.impressions;
        chartData[tag][dateIndex].visits += value.visits;
    }

    const totalSelection = categorySelection.categories.length === 0 && categorySelection.subcategories.length === 0;

    for (const data of trafficData) {
        if (totalSelection) {
            const totalValue = {
                impressions: 0,
                visits: 0
            };
            for (const category of Object.keys(data.categories)) {
                totalValue.impressions += data.categories[category].impressions;
                totalValue.visits += data.categories[category].visits;
            }
            addDataToMap('Total', data.date, totalValue);
        }
        for (const category of Object.keys(data.categories)) {
            for (const feature of Object.keys(data.categories[category].featureTraffic)) {
                if (categorySelection.categories.includes(category)) {
                    const value = {
                        impressions: data.categories[category].impressions,
                        visits: data.categories[category].visits
                    };
                    addDataToMap(category, data.date, value);
                }
                if (categorySelection.subcategories.some(subcategory => subcategory.category === category && subcategory.subCategory === feature)) {
                    const value = {
                        impressions: data.categories[category].featureTraffic[feature].impressions,
                        visits: data.categories[category].featureTraffic[feature].visits
                    };
                    addDataToMap(`${category} | ${feature}`, data.date, value);
                }
            }
        }
    }

    return chartData;
}
