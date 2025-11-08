import { getCurrentURL, getDateRangeFromURL } from "../site";
import { createConversionsChartBlock } from "./layout";
import { getDataFromStorage } from "../../scripts/helpers";
import { WishlistConversionsData, WishlistsData } from "./types";
import { ChartConfiguration, Chart } from "chart.js";
import { setFlexContentBlockContent } from "../pageblocks";
import { dateToString } from "../../scripts/helpers";

export const initConversionsChart = async (doc: Document, appID: string, wishlists: WishlistsData, wishlistConversions: WishlistConversionsData) => {
  console.log("Init wishlist conversions");

  createConversionsChartBlock(doc);

  const dateRange = getDateRangeFromURL(getCurrentURL());

  const conversionsChart = createConversionsChart(doc);

  const labels = getLabelsForConversionsChart(wishlistConversions);
  const conversionsData = getConversionRates(labels, wishlists, wishlistConversions);

  updateConversionsChart(conversionsChart, labels, conversionsData, dateRange.dateStart);
}

const createConversionsChart = (doc: Document) => {
  const chartBlockElem = doc.createElement('div');
  chartBlockElem.id = 'extras_wishlist_conversions_chart';

  setFlexContentBlockContent(doc, 'extra_wishlist_conversions_chart_block', chartBlockElem);

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

  const canvas = doc.createElement('canvas');
  canvas.id = 'extras_wishlist_conversions_chart_canvas';
  canvas.width = 800;
  canvas.height = 400;

  const conversionsChart = new Chart(canvas, config);

  conversionsChart.options.scales = { x: { stacked: true }, y: { stacked: true } }

  chartBlockElem.appendChild(canvas);

  return conversionsChart;
}

const updateConversionsChart = (chart: Chart, labels: string[], conversionsData: number[], currentDateStart: Date) => {
  if (!chart) return;

  const beforeRangeData: any[] = [];
  const afterRangeData: any[] = [];

  labels.forEach((label, index) => {
    const labelDate = new Date(label);
    const monthStart = new Date(currentDateStart);
    monthStart.setDate(1);
    if (labelDate < monthStart) {
      afterRangeData.push(0);
      beforeRangeData.push(conversionsData[index]);
    } else {
      beforeRangeData.push(0);
      afterRangeData.push(conversionsData[index]);
    }
  });

  const beforeRangeDataset = {
    label: "Conversion Rate (%)",
    data: beforeRangeData,
    backgroundColor: 'rgb(106, 150, 219)',
  };
  const afterRangeDataset = {
    label: "Conversion Rate within date range (%)",
    data: afterRangeData,
    backgroundColor: 'rgb(219, 166, 106)',
  };

  chart.data.labels = labels;
  chart.data.datasets = [beforeRangeDataset, afterRangeDataset];

  chart.update();
}

const getConversionRates = (labels: string[], wishlists: WishlistsData, wishlistConversions: WishlistConversionsData): number[] => {
  const conversionRates = labels.map(label => {
    const monthStart = new Date(label);
    const monthEnd = new Date(label);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const addsForMonth = wishlists.data
      .filter(wishlist => {
        const wishlistDate = new Date(wishlist["Date"]);
        return wishlistDate >= monthStart && wishlistDate < monthEnd;
      })
      .reduce((sum, wishlist) => {
        return sum + (wishlist["Adds"] || 0);
      }, 0);

    const conversionsForMonth = wishlistConversions.data
      .filter(conversion => {
        return conversion["MonthCohort"] === label;
      })
      .reduce((sum, conversion) => sum + conversion["TotalConversions"], 0);

    const conversionRate = conversionsForMonth / addsForMonth;

    return conversionRate * 100; // percentage
  });

  return conversionRates;
}

const getLabelsForConversionsChart = (wishlistConversions: WishlistConversionsData) => {
  const labels: string[] = [];

  wishlistConversions.data.forEach(conversion => {
    if (!labels.includes(conversion["MonthCohort"])) {
      labels.push(conversion["MonthCohort"]);
    }
  });

  labels.sort((a, b) => (a > b ? 1 : -1));

  const startDate = new Date(labels[0]);
  const endDate = new Date(labels[labels.length - 1]);

  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const formattedDate = dateToString(currentDate);
    if (!labels.includes(formattedDate)) {
      labels.push(formattedDate);
    }
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  labels.sort((a, b) => (a > b ? 1 : -1));

  return labels;
}
