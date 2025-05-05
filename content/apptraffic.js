let settings = {};
let traffic = undefined;
let trafficChart = undefined;
let chartDataType = 'Visits';
let chartSplit = 'PageCategory';
let chartColors = undefined;
let chartCategories = [];
let chartSubcategories = [];

const init = async () => {
  console.log("Steamworks extras: Init");

  getBrowser().storage.local.get(defaultSettings, async (result) => {
    settings = result;

  readChartColors();

  hideOldElements();
  createChart();
  addStatusBlock();

  addChartShowCheckboxes();

  console.log(getDateRangeOfCurrentPage());

  await initTrafficData();

  createCheckPresets();

  });
}

const getAppID = () => {
  const url = window.location.href;

  // Regular expression to extract the appID
  const regex = /navtrafficstats\/(\d+)/;
  const match = url.match(regex);

  if (!match) return;

  return match[1];
}

const getDateRangeOfCurrentPage = () => {
  const startDateElem = document.getElementById('start_date');
  const endDateElem = document.getElementById('end_date');

  const dateStart = new Date(startDateElem.value);
  const dateEnd = new Date(endDateElem.value);

  return { dateStart: dateStart, dateEnd: dateEnd };
}

const getPageContentElem = () => {
  return document.getElementsByClassName('AdminPageContent')[0];
}

const hideOldElements = () => {
  const pageContentElem = getPageContentElem();

  for (let i = 11; i <= 15; i++) {
    pageContentElem.children[i].style.display = 'none';
  }
}

const readChartColors = () => {
  const jsonFilePath = getBrowser().runtime.getURL('data/chartcolors.json');

  console.log(jsonFilePath);

  fetch(jsonFilePath).then(response => {
    if (response.ok) {
      response.json().then(json => {
        chartColors = json;
      });
    }
  });
}

const initTrafficData = async () => {
  console.log("Steamworks extras: Requesting reviews data");

  const { dateStart, dateEnd } = getDateRangeOfCurrentPage();

  const data = await helpers.sendMessageAsync({
    request: 'getData',
    type: 'Traffic',
    appId: getAppID(),
    dateStart: dateStart,
    dateEnd: dateEnd
  });

  traffic = data;

  console.log(traffic);

  updateTrafficChart();
}

const updateSelectedChartCategories = () => {
  const checkboxes = document.querySelectorAll('.extra_chart_category_checkbox');

  chartCategories = [];
  chartSubcategories = [];

  for (const checkbox of checkboxes) {
    console.log(checkbox.checked);

    if (!checkbox.checked) continue;

    const checkboxIDSplit = checkbox.id.split('__');

    if (checkboxIDSplit.length === 1) {
      chartCategories.push(checkboxIDSplit[0]);
    }
    else {
      chartSubcategories.push({ category: checkboxIDSplit[0], subCategory: checkboxIDSplit[1] });
    }
  }
}

const addStatusBlock = () => {
  const statusBlock = createStatusBlock();
  startUpdateStatus();
}

const addChartShowCheckboxes = () => {
  const table = document.querySelector('.breakdownTable');

  const firstRowElem = table.children[0];

  const newHeaderCell = document.createElement('div');
  newHeaderCell.classList.add('th');
  newHeaderCell.textContent = 'Show on chart';

  firstRowElem.insertBefore(newHeaderCell, firstRowElem.children[0]);

  const addCheckbox = (rowElem, id, checkedByDefault) => {
    const checkboxContainerElem = document.createElement('div');
    checkboxContainerElem.classList.add('td');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.classList.add('extra_chart_category_checkbox');

    checkboxContainerElem.appendChild(checkbox);

    checkbox.id = id;
    checkbox.checked = checkedByDefault;

    checkbox.addEventListener('click', (event) => {
      event.stopPropagation();
      //      event.preventDefault();

      // event.target.checked = !event.target.value;
      // event.target.value = !event.target.value;
      // const id = event.target.id;
      // const value = event.target.value;
      // console.log('Checkbox ID:', id, 'Value:', value);

      // updateSelectedChartCategories();
      // updateTrafficChart();
    });

    checkbox.addEventListener('change', (event) => {
      event.stopPropagation();
      event.preventDefault();

      const id = event.target.id;
      const value = event.target.value;
      console.log('Checkbox ID:', id, 'Value:', value);

      updateSelectedChartCategories();
      updateTrafficChart();
    });

    rowElem.insertBefore(checkboxContainerElem, rowElem.firstChild);
  }

  let categoryIndex = 0;
  let category = '';
  for (const elem of table.children) {
    const nameElem = elem.querySelector('strong');
    if (nameElem === undefined || nameElem === null) continue;
    const name = nameElem.textContent;

    if (elem.classList.contains('page_stats')) {
      category = name;
      addCheckbox(elem, category, categoryIndex < 5);
      categoryIndex++;
    }
    else if (elem.classList.contains('feature_stats')) {
      addCheckbox(elem, `${category}__${name}`, false);
    }
  }

  updateSelectedChartCategories();
}

const createChart = () => {
  const chartBlockElem = document.createElement('div');
  chartBlockElem.id = 'extras_chart';

  const pageContentElem = getPageContentElem();
  pageContentElem.insertBefore(chartBlockElem, pageContentElem.children[18]);

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
    "Impressions",
    "Visits",
    "Click Through Rate",
  ], 'View by', chartDataType, (select) => {
    console.log(select.value);
    chartDataType = select.value;
    updateTrafficChart();
  });

  const canvas = document.createElement('canvas');
  canvas.id = 'extra_trafficChart';
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

  trafficChart = new Chart(canvas, config);
}

const updateTrafficChart = () => {
  const { dateStart, dateEnd } = getDateRangeOfCurrentPage();

  const days = helpers.getDateRangeArray(dateStart, dateEnd, false, true);
  console.log(days);

  const chartData = {};

  const addDataToMap = (tag, date, value) => {
    if (chartData[tag] === undefined) chartData[tag] = Array.from(
      { length: days.length },
      () => ({ impressions: 0, visits: 0 }));

    const dateIndex = days.indexOf(date);
    if (dateIndex < 0) return;

    chartData[tag][dateIndex].impressions += value.impressions;
    chartData[tag][dateIndex].visits += value.visits;
  }

  for (const data of traffic) {
    const value = {
      impressions: data['Impressions'],
      visits: data['Visits']
    };

    const date = data['Date'];

    if (chartCategories.length === 0 && chartSubcategories.length === 0) {
      addDataToMap('Total', date, value);
    }

    for (const category of chartCategories) {
      if (data['PageCategory'] !== category) continue;

      addDataToMap(category, date, value);
    }

    for (const category of chartSubcategories) {
      if (data['PageCategory'] !== category.category || data['PageFeature'] !== category.subCategory) continue;

      addDataToMap(`${category.category} | ${category.subCategory}`, date, value);
    }
  }

  console.log(chartData);

  const datasets = [];

  for (const [key, value] of Object.entries(chartData)) {

    const values = value.map(val => {
      switch (chartDataType) {
        case 'Impressions': return val.impressions;
        case 'Visits': return val.visits;
        case 'Click Through Rate':
          const dataValue = (val.visits / val.impressions * 100.0).toFixed(2);
          return isNaN(dataValue) ? 0.0 : dataValue;
      }
    });

    console.log(values);

    const color = chartColors[key] || `rgb(${55 + Math.round(Math.random() * 200)}, ${55 + Math.round(Math.random() * 200)}, ${55 + Math.round(Math.random() * 200)})`;

    datasets.push({
      label: key,
      data: values,
      fill: false,
      backgroundColor: color,
      borderColor: color,
      tension: 0
    });
  }

  trafficChart.data.labels = days;
  trafficChart.data.datasets = datasets;

  trafficChart.update();
}

const getTopCategories = (limit) => {
  const categoryCounts = {};

  const table = document.querySelector('.breakdownTable');
  for (const elem of table.children) {
    const nameElem = elem.querySelector('strong');
    if (nameElem === undefined || nameElem === null) continue;
    const name = nameElem.textContent;

    if (elem.classList.contains('page_stats')) {
      if (!categoryCounts[name]) {
        categoryCounts[name] = 0;
      }
      categoryCounts[name]++;
    }
  }

  const sortedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(entry => entry[0]);

  return sortedCategories;
}

const getExternalWebsiteSubcategories = () => {
  const subcategories = [];
  const table = document.querySelector('.breakdownTable');
  let isExternalWebsite = false;

  for (const elem of table.children) {
    const nameElem = elem.querySelector('strong');
    if (nameElem === undefined || nameElem === null) continue;
    const name = nameElem.textContent;

    if (elem.classList.contains('page_stats')) {
      isExternalWebsite = name === 'External Website';
    } else if (isExternalWebsite && elem.classList.contains('feature_stats')) {
      subcategories.push(`External Website__${name}`);
    } else if (elem.classList.contains('page_stats')) {
      isExternalWebsite = false;
    }
  }

  return subcategories;
}

const createCheckPresets = () => {
  const chartBlockElem = document.getElementById('extras_chart');

  const presetsDiv = document.createElement('div');
  presetsDiv.id = 'chart_presets';

  const selectCategories = (categories) => {
    const checkboxes = document.querySelectorAll('.extra_chart_category_checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = categories.includes(checkbox.id);
    });
    updateSelectedChartCategories();
    updateTrafficChart();
  }

  const createButton = (text, categories) => {
    const button = document.createElement('button');
    button.textContent = text;
    button.addEventListener('click', () => selectCategories(categories));
    return button;
  }

  const top5Categories = getTopCategories(5);
  const top10Categories = getTopCategories(10);
  const externalCategories = getExternalWebsiteSubcategories();

  console.log(top5Categories);
  console.log(top10Categories);
  console.log(externalCategories);

  const clearButton = createButton('Clear (Total)', []);
  const top5Button = createButton('Top5', top5Categories);
  const top10Button = createButton('Top10', top10Categories);
  const externalSourcesButton = createButton('External websites', externalCategories);

  presetsDiv.appendChild(clearButton);
  presetsDiv.appendChild(top5Button);
  presetsDiv.appendChild(top10Button);
  presetsDiv.appendChild(externalSourcesButton);

  chartBlockElem.appendChild(presetsDiv);
}

init();
