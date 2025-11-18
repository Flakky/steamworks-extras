import { setFlexContentBlockContent } from "../pageblocks";
import { Chart, ChartConfiguration } from "chart.js";
import { ReviewChartSplit, ReviewsData } from "./types";

const createReviewsChart = (doc: Document): Chart => {
    const chartBlockElem = doc.createElement('div');
    chartBlockElem.id = 'extras_reviews_chart';

    setFlexContentBlockContent(doc, 'extra_reviews_chart_block', chartBlockElem);

    const createChartSelect = (options, name, defaultValue, onSelect) => {
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

    createChartSelect(Object.values(ReviewChartSplit).map(type => type),
        'View by',
        reviewChartSplit,
        (select) => {
            console.log(select.value);
            reviewChartSplit = select.value;
            updateReviewsChart();
        });

    const canvas = doc.createElement('canvas');
    canvas.id = 'reviewsChart';
    canvas.width = 800;
    canvas.height = 400;

    chartBlockElem.appendChild(canvas);

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

    return new Chart(canvas, config);
}

const updateReviewsChart = (chart: Chart, reviews: ReviewsData) => {
    if (reviews === undefined) return;

    /* Review format
    {
      "recommendationid": "123456789",
      "author": {
          "steamid": "12345678913456789",
          "num_games_owned": 123,
          "num_reviews": 123,
          "playtime_forever": 123,
          "playtime_last_two_weeks": 12,
          "playtime_at_review": 123,
          "last_played": 123456789
      },
      "language": "english",
      "review": "Review text",
      "timestamp_created": 1719304521,
      "timestamp_updated": 1719326330,
      "voted_up": true,
      "votes_up": 0,
      "votes_funny": 0,
      "weighted_vote_score": 0,
      "comment_count": 0,
      "steam_purchase": true,
      "received_for_free": false,
      "written_during_early_access": true,
      "hidden_in_steam_china": true,
      "steam_china_location": ""
    }
    */

    const chartDays = [];

    let { dateStart, dateEnd } = getDateRangeOfCurrentPage();
    helpers.correctDateRange(dateStart, dateEnd);

    const oneDay = helpers.dateToString(dateStart) === helpers.dateToString(dateEnd);

    if (oneDay) {
        chartDays.push(helpers.dateToString(dateStart));
    }
    else {
        let dayLoop = new Date(dateStart);
        while (dayLoop <= dateEnd) {
            const formattedDate = helpers.dateToString(dayLoop);
            chartDays.push(formattedDate);

            // Move to the next day
            dayLoop.setDate(dayLoop.getDate() + 1);
        }
    }

    console.log(chartDays);

    // Fill chart data set
    const reviewsInfoForChart = {};

    for (const date of chartDays) {
        reviewsInfoForChart[date] = {};
    }

    const labels = [];

    reviews.forEach((review, index) => {
        const reviewDate = new Date(review.timestamp_created * 1000); // Timestamp is in seconds on Steam

        const formattedDate = helpers.dateToString(reviewDate);

        if (!helpers.isDateInRange(reviewDate, dateStart, dateEnd)) return;

        let fieldName = undefined;

        switch (reviewChartSplit) {
            case 'Total': fieldName = "Total"; break;
            case 'Vote': fieldName = review.voted_up ? "Positive" : "Negative"; break;
            case 'Language': fieldName = review.language; break;
        }

        if (fieldName === undefined) return;

        if (!labels.includes(fieldName)) labels.push(fieldName);

        reviewsInfoForChart[formattedDate][fieldName] = (reviewsInfoForChart[formattedDate][fieldName] || 0) + 1;
    });

    console.log(reviewsInfoForChart);

    const dataSetsMap = {};
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

        const color = chartColors[key] || `rgb(${55 + Math.round(Math.random() * 200)}, ${55 + Math.round(Math.random() * 200)}, ${55 + Math.round(Math.random() * 200)})`;

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

    chart.config.type = 'bar';

    chart.options.scales = { x: { stacked: !oneDay }, y: { stacked: !oneDay } }

    chart.update();

    console.log("Reviews chart updated");
}
