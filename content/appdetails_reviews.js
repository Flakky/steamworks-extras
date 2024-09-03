let reviews = undefined;
let reviewsChart = undefined;
let reviewChartSplit = "Vote";

const requestReviews = () => {
  helpers.requestGameReviews(getAppID()).then((res) => {

    reviews = res;

    updateReviewsChart();
    updateReviewsSummary();
    updateReviewsTable();
  });
}

const createReviewsChart = () => {
  const contentBlock = createFlexContentBlock('Reviews chart', 'extra_reviews_chart_block');

  const chartBlockElem = document.createElement('div');
  chartBlockElem.id = 'extras_reviews_chart';

  contentBlock.appendChild(chartBlockElem);

  const createChartSelect = (options, name, defaultValue, onSelect) => {
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

    chartBlockElem.appendChild(nameElem);
    chartBlockElem.appendChild(selectElem);

    return selectElem;
  }

  createChartSelect([
    "Total",
    "Vote",
    "Language",
  ], 'View by', reviewChartSplit, (select) => {
    console.log(select.value);
    reviewChartSplit = select.value;
    updateReviewsChart();
  });

  const canvas = document.createElement('canvas');
  canvas.id = 'reviewsChart';
  canvas.width = 800;
  canvas.height = 400;

  chartBlockElem.appendChild(canvas);

  const data = {};

  const config = {
    type: 'line',
    data: data,
    options: {
      plugins: {
        legend: {
          position: 'top'
        }
      }
    }
  };

  reviewsChart = new Chart(canvas, config);
}

const updateReviewsChart = () => {
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

  const { dateStart, dateEnd } = getDateRangeOfCurrentPage();
  const oneDay = helpers.dateToString(dateStart) === helpers.dateToString(dateEnd);

  let dayLoop = new Date(dateStart);
  while (dayLoop <= dateEnd) {
    const formattedDate = helpers.dateToString(dayLoop);
    chartDays.push(formattedDate);

    // Move to the next day
    dayLoop.setDate(dayLoop.getDate() + 1);
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

    if (!reviewsInfoForChart.hasOwnProperty(formattedDate)) return;

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

  reviewsChart.data.labels = chartDays;
  reviewsChart.data.datasets = datasets;

  reviewsChart.config.type = 'bar';

  reviewsChart.options.scales = { x: { stacked: !oneDay }, y: { stacked: !oneDay } }

  reviewsChart.update();

  console.log("Steamworks extras: Reviews chart updated");
}

const updateReviewsSummary = () => {
  if (reviews === undefined) return;

  let positive = 0;
  let negative = 0;

  for (const review of reviews) {
    if (!review.steam_purchase) continue; // Reviews which were not purchased from Steam do not count toward final score

    if (review.voted_up) positive++;
    else negative++;
  }

  const lifeTimeUnitsReturnedCell = helpers.findElementByText('td', 'Lifetime units returned');

  const lifetimeUnitsRow = helpers.findParentByTag(lifeTimeUnitsReturnedCell, 'tr');

  const lifetimeUnitsRowIndex = lifetimeUnitsRow.rowIndex;

  const summaryTable = getSummaryTable();

  let newLineSplitter = summaryTable.rows[lifetimeUnitsRowIndex + 1].cloneNode(true);

  summaryTable.children[0].insertBefore(newLineSplitter, summaryTable.rows[lifetimeUnitsRowIndex + 1]);

  const addReviewRow = (title, numHtml, desc) => {
    row = summaryTable.insertRow(lifetimeUnitsRowIndex + 2); // Insert after net
    row.classList.add('extra_summary_review_row');

    nameElem = document.createElement('td');
    nameElem.textContent = title;

    numElem = document.createElement('td');
    numElem.align = 'right';
    numElem.innerHTML = numHtml;

    descElem = document.createElement('td');
    descElem.textContent = desc;

    row.appendChild(nameElem);
    row.appendChild(numElem);
    row.appendChild(descElem);

    return row;
  };

  addReviewRow(
    'Positive reviews',
    `${(positive / (positive + negative) * 100).toFixed(1)}%`,
    ''
  );

  addReviewRow(
    'Reviews',
    `<span>${positive + negative}</span> (<span class="extra_summary_review_positive">${positive}</span> | <span class="extra_summary_review_negative">${negative}</span>)`,
    'Reviews which are not counted toward review score are not included.'
  );

}

const createReviewsTable = () => {
  const contentBlock = createFlexContentBlock('Reviews table', 'extra_reviews_table_block');

  const reviesTableElem = document.createElement('table');
  reviesTableElem.id = 'extras_reviews_table';

  contentBlock.appendChild(reviesTableElem);
}

const updateReviewsTable = () => {
  if (reviews == undefined) return;

  const reviesTableElem = document.getElementById('extras_reviews_table');

  const addRowCell = (row, innerHTML) => {
    const cellElem = document.createElement('td');
    cellElem.innerHTML = innerHTML;

    row.appendChild(cellElem);
    return cellElem;
  }

  // Column name rows
  const columns = ['Language', 'Total', 'Positive', 'Negative', 'Ratio'];

  const columnNamesRow = reviesTableElem.insertRow(0);
  for (const column of columns) {
    addRowCell(columnNamesRow, column);
  }

  const { dateStart, dateEnd } = getDateRangeOfCurrentPage();

  let languageReviewsStats = {}

  for (const review of reviews) {
    const reviewDate = new Date(review.timestamp_created * 1000); // Timestamp is in seconds on Steam

    if (reviewDate < dateStart || reviewDate > dateEnd) continue;

    if (!languageReviewsStats[review.language]) languageReviewsStats[review.language] = {
      "Positive": 0,
      "Negative": 0
    }
    languageReviewsStats[review.language][review.voted_up ? "Positive" : "Negative"] = languageReviewsStats[review.language][review.voted_up ? "Positive" : "Negative"] + 1;
  }

  for (const [key, value] of Object.entries(languageReviewsStats)) {
    const row = reviesTableElem.insertRow(reviesTableElem.rows.length);
    const positive = value['Positive'];
    const negative = value['Negative'];
    addRowCell(row, key);
    addRowCell(row, positive + negative);
    addRowCell(row, positive);
    addRowCell(row, negative);
    addRowCell(row, `${(positive / (positive + negative) * 100).toFixed(1)}%`);
  }
}
