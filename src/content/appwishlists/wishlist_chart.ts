import { dateToString, selectChartColor } from "../../scripts/helpers";
import { getCurrentURL, getDateRangeFromURL } from "../site";
import { setFlexContentBlockContent } from "../pageblocks";
import { Chart, ChartConfiguration } from "chart.js";
import { getDateRangeArray } from "../../shared/types/daterange";
import { WishlistChart, WishlistChartType, WishlistChartActionsType, WishlistsData, WishlistRegionSelection } from "./types";

export const createWishlistChart = (doc: Document, wishlistChart: WishlistChart, wishlistData: WishlistsData, wishlistRegionSelection: WishlistRegionSelection) => {
  const chartBlockElem = doc.createElement('div');
  chartBlockElem.id = 'extras_wishlist_chart';

  setFlexContentBlockContent(doc, 'extra_wishlist_chart_block', chartBlockElem);

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

  const data = { datasets: [], labels: [] };

  const config: ChartConfiguration = {
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

  const canvas = document.createElement('canvas');
  canvas.id = 'extras_wishlist_chart_canvas';
  canvas.width = 800;
  canvas.height = 400;

  const chart = new Chart(canvas, config);
  wishlistChart.chart = chart;

  createChartSelect(
    Object.values(WishlistChartType).map(type => type),
    'View by', wishlistChart.wishlistChartType,
    (select) => {
      wishlistChart.wishlistChartType = select.value as WishlistChartType;
      updateWishlistChart(wishlistChart, wishlistData, wishlistRegionSelection);
    }
  );

  chartBlockElem.appendChild(canvas);
}

export const updateWishlistChart = (wishlistChart: WishlistChart, wishlistData: WishlistsData, wishlistRegionSelection: WishlistRegionSelection) => {
  if (!wishlistChart.chart) return;

  console.log('Updating wishlist chart');

  const dateRange = getDateRangeFromURL(getCurrentURL());
  const dateRangeArray = getDateRangeArray(dateRange, false, true);

  const oneDay = dateToString(dateRange.dateStart) === dateToString(dateRange.dateEnd);

  let viewByList: string[] = [];

  switch (wishlistChart.wishlistChartType) {
    case 'Actions': viewByList = [
      WishlistChartActionsType.Adds,
      WishlistChartActionsType.Deletes,
      WishlistChartActionsType.Gifts,
      WishlistChartActionsType.Activations
    ]; break;
    case 'Country': viewByList = wishlistRegionSelection.selectedCountries; break;
    case 'Region': viewByList = wishlistRegionSelection.regions; break;
  }

  let labels = oneDay ? viewByList : dateRangeArray;
  let datasets = [];

  if (oneDay) {

    const dayData = wishlistData.data.find(item => item['Date'] === dateToString(dateRange.dateStart));

    const data = viewByList.map((view) => { return dayData ? dayData[view] : 0; });
    const colors = viewByList.map((view) => {
      return selectChartColor(wishlistChart.chartColors, view);
    });

    const dataset = {
      label: wishlistChart.wishlistChartType,
      data: data,
      backgroundColor: colors,
    };

    datasets.push(dataset);
  }
  else {
    viewByList.forEach(view => {
      const color = selectChartColor(wishlistChart.chartColors, view);

      let data: number[] = [];

      wishlistData.data.forEach(item => {
        data.push(item[view]);
      });

      const dataset = {
        label: view,
        data: data,
        backgroundColor: color,
        borderColor: color,
      };

      datasets.push(dataset);
    });
  }

  wishlistChart.chart.data.labels = labels;
  wishlistChart.chart.data.datasets = datasets;

  if (wishlistChart.chart.options && 'type' in wishlistChart.chart.options) {
    wishlistChart.chart.options.type = oneDay ? 'bar' : 'line';
  }

  wishlistChart.chart.update();
}
