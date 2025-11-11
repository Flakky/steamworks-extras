import { getDefaultSettings, readChartColors } from "../site";
import { addStatusBlockToPage } from "../../shared/statusblock";
import { DateRange, getDateRangeArray } from "../../shared/types/daterange";
import { hideOldElements } from "./layout";
import { getDataFromStorage } from "../../scripts/helpers";
import { TrafficCategorySelection, TrafficChartDataType } from "./types";

const init = async () => {
  console.log("Init");

  const settings = await getDefaultSettings();
  if (!settings) {
    throw new Error('Settings not found');
  }

  const chartColors = await readChartColors();
  if (!chartColors) {
    throw new Error('Chart colors not found');
  }

  const appID = getAppID();
  if (!appID) {
    throw new Error('App ID not found');
  }

  const doc = document;

  const trafficData = await getTrafficData(doc, appID);
  if (!trafficData) {
    throw new Error('Traffic data not found');
  }

  hideOldElements(doc);


  createChart();
  addStatusBlockToPage();

  addChartShowCheckboxes();

  createCheckPresets();
}

const getAppID = () => {
  const url = window.location.href;

  // Regular expression to extract the appID
  const regex = /navtrafficstats\/(\d+)/;
  const match = url.match(regex);

  if (!match) return;

  return match[1];
}

export const getDateRangeOfCurrentPage = (doc: Document): DateRange => {
  const startDateElem = doc.getElementById('start_date') as HTMLInputElement;
  const endDateElem = doc.getElementById('end_date') as HTMLInputElement;

  if (!startDateElem || !endDateElem) {
    throw new Error('Start or end date element not found');
  }

  const dateStart = new Date(startDateElem.value);
  const dateEnd = new Date(endDateElem.value);

  return { dateStart, dateEnd };
}

const getTrafficData = async (doc: Document, appID: string): Promise<any[]> => {
  console.log("Requesting traffic data");

  const { dateStart, dateEnd } = getDateRangeOfCurrentPage(doc);

  const trafficData = await getDataFromStorage(
    'Traffic',
    appID,
    dateStart,
    dateEnd,
    true
  );

  return trafficData;
}

const getSelectedChartCategories = (doc: Document): TrafficCategorySelection => {
  const checkboxes = doc.querySelectorAll('.extra_chart_category_checkbox') as NodeListOf<HTMLInputElement>;

  const categorySelection = new TrafficCategorySelection();

  for (const checkbox of Array.from(checkboxes)) {
    console.log(checkbox.checked);

    if (!checkbox.checked) continue;

    const checkboxIDSplit = checkbox.id.split('__');

    if (checkboxIDSplit.length === 1) {
      categorySelection.categories.push(checkboxIDSplit[0]);
    }
    else {
      categorySelection.subcategories.push({ category: checkboxIDSplit[0], subCategory: checkboxIDSplit[1] });
    }
  }

  return categorySelection;
}

const addChartShowCheckboxes = (doc: Document) => {
  const table = doc.querySelector('.breakdownTable');

  if (!table) {
    throw new Error('Table for checkboxesnot found');
  }

  const firstRowElem = table.children[0];

  const newHeaderCell = doc.createElement('div');
  newHeaderCell.classList.add('th');
  newHeaderCell.textContent = 'Show on chart';

  firstRowElem.insertBefore(newHeaderCell, firstRowElem.children[0]);

  const addCheckbox = (rowElem: Element, id: string, checkedByDefault: boolean) => {
    const checkboxContainerElem = doc.createElement('div');
    checkboxContainerElem.classList.add('td');
    const checkbox = doc.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.classList.add('extra_chart_category_checkbox');

    checkboxContainerElem.appendChild(checkbox);

    checkbox.id = id;
    checkbox.checked = checkedByDefault;

    checkbox.addEventListener('click', (event) => {
      // Prevent category spoiler to toggle
      event.stopPropagation();
    });

    checkbox.addEventListener('change', (event: Event) => {
      // Prevent category spoiler to toggle
      event.stopPropagation();
      event.preventDefault();

      const target = event.target as HTMLInputElement;

      const id = target.id;
      const value = target.value;
      console.log('Checkbox ID:', id, 'Value:', value);

      updateSelectedChartCategories();
      updateTrafficChart();
    });

    rowElem.insertBefore(checkboxContainerElem, rowElem.firstChild);
  }

  let categoryIndex = 0;
  let category = '';

  for (const elem of Array.from(table.children)) {
    if (!elem) continue;

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

const getTopCategories = (doc: Document, numberOfCategories: number): string[] => {
  const categoryCounts: Record<string, number> = {};

  const table = doc.querySelector('.breakdownTable');
  if (!table) {
    return [];
  }

  for (const elem of Array.from(table.children)) {
    if (!elem) continue;

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
    .slice(0, numberOfCategories)
    .map(entry => entry[0]);

  return sortedCategories;
}

const getExternalWebsiteSubcategories = (doc: Document): string[] => {
  const subcategories = [];
  const table = doc.querySelector('.breakdownTable');

  if (!table) {
    return [];
  }

  let isExternalWebsite = false;

  for (const elem of Array.from(table.children)) {
    if (!elem) continue;

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

init();
