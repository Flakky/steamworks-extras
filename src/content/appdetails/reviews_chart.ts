import { setFlexContentBlockContent } from "../pageblocks";
import { Chart, ChartConfiguration, registerables } from "chart.js";
import { ReviewChartSplit, ReviewsData } from "./types";
import { dateToString, selectChartColor } from "../../scripts/helpers";
import { clampDateRangeStartToData, DateRange, isDateInRange } from "../../shared/types/daterange";

export const createReviewsChart = (doc: Document, reviews: ReviewsData, dateRange: DateRange, chartColors: Record<string, string>): Chart => {
    const chartBlockElem = doc.createElement('div');
    chartBlockElem.id = 'extras_reviews_chart';

    setFlexContentBlockContent(doc, 'extra_reviews_chart_block', chartBlockElem);

    const createChartSelect = (options: string[], name: string, defaultValue: string, onSelect: (select: HTMLSelectElement) => void) => {
        const nameElem = doc.createElement("b");
        nameElem.textContent = `${name}: `;
        nameElem.classList.add('extra_chart_select_name');

        const selectElem = doc.createElement("select");

        options.forEach((option: string) => {
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

    const canvas = doc.createElement('canvas');
    canvas.id = 'reviewsChart';
    canvas.width = 800;
    canvas.height = 400;

    const config: ChartConfiguration = {
        type: 'bar',
        data: { datasets: [], labels: [] },
        options: {
            plugins: {
                legend: {
                    position: 'top'
                }
            }
        }
    };

    const chart = new Chart(canvas, config);

    createChartSelect(
        Object.values(ReviewChartSplit).map(type => type),
        'View by',
        ReviewChartSplit.Vote,
        (select) => {
            console.log(select.value);
            const reviewChartSplit = select.value as ReviewChartSplit;
            updateReviewsChart(chart, reviewChartSplit, reviews, dateRange, chartColors);
        });

    chartBlockElem.appendChild(canvas);

    return chart
}

export const updateReviewsChart = (chart: Chart, reviewChartSplit: ReviewChartSplit, reviews: ReviewsData, dateRange: DateRange, chartColors: Record<string, string>) => {
    if (reviews === undefined || !Array.isArray(reviews.reviews)) return;

    const chartDays: string[] = [];

    const chartDateRange = clampDateRangeStartToData(
        dateRange,
        reviews.reviews.map(review => new Date(review.timestamp_created * 1000)));

    const oneDay = dateToString(chartDateRange.dateStart) === dateToString(chartDateRange.dateEnd);

    console.debug('Chart date range: ', chartDateRange);

    if (oneDay) {
        chartDays.push(dateToString(chartDateRange.dateStart));
    }
    else {
        let dayLoop = new Date(chartDateRange.dateStart);
        while (dayLoop <= chartDateRange.dateEnd) {
            const formattedDate = dateToString(dayLoop);
            chartDays.push(formattedDate);

            // Move to the next day
            dayLoop.setDate(dayLoop.getDate() + 1);
        }
    }

    // Fill chart data set
    const reviewsInfoForChart: Record<string, Record<string, number>> = {};

    for (const date of chartDays) {
        reviewsInfoForChart[date] = {};
    }

    const labels: string[] = [];

    reviews.reviews.forEach((review, index) => {
        const reviewDate = new Date(review.timestamp_created * 1000); // Timestamp is in seconds on Steam

        const formattedDate = dateToString(reviewDate);

        if (!isDateInRange(reviewDate, chartDateRange)) return;

        let fieldName = undefined;

        switch (reviewChartSplit) {
            case ReviewChartSplit.Total: fieldName = "Total"; break;
            case ReviewChartSplit.Vote: fieldName = review.voted_up ? "Positive" : "Negative"; break;
            case ReviewChartSplit.Language: fieldName = review.language; break;
        }

        if (fieldName === undefined) return;

        if (!labels.includes(fieldName)) labels.push(fieldName);

        reviewsInfoForChart[formattedDate][fieldName] = (reviewsInfoForChart[formattedDate][fieldName] || 0) + 1;
    });

    console.log(reviewsInfoForChart);

    const dataSetsMap: Record<string, number[]> = {};
    if (reviewChartSplit == 'Vote') { // To display chart bars in correct order
        dataSetsMap['Negative'] = [];
        dataSetsMap['Positive'] = [];
    }
    else {
        for (const label of labels) {
            dataSetsMap[label] = [];
        }
    }

    for (const day of chartDays) {
        for (const label of labels) {
            dataSetsMap[label].push(reviewsInfoForChart[day][label] || 0);
        }
    }

    console.log(dataSetsMap);

    const datasets = [];

    for (const [key, value] of Object.entries(dataSetsMap)) {

        const color = selectChartColor(chartColors, key);

        datasets.push({
            label: key,
            data: value,
            fill: false,
            backgroundColor: color,
            borderColor: color,
            tension: 0
        });
    }

    chart.data.labels = chartDays;
    chart.data.datasets = datasets;

    if (chart.options && 'scales' in chart.options) {
        chart.options.scales = { x: { stacked: !oneDay }, y: { stacked: !oneDay } }
    }

    chart.update();

    console.log("Reviews chart updated");
}
