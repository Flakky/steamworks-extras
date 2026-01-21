import { dateToString, selectChartColor } from "../../scripts/helpers";
import { getCurrentURL, getDateRangeFromURL } from "../site";
import { setFlexContentBlockContent } from "../pageblocks";
import { Chart, ChartConfiguration, ChartDataset } from "chart.js";
import { DateRange, getDateRangeArray, isSingleDay } from "../../shared/types/daterange";
import { WishlistChart, WishlistChartType, WishlistChartActionsType, WishlistsData, WishlistRegionSelection } from "./types";
import { GameWishlists } from "../../shared/types/wishlists";

export const createWishlistChart = (doc: Document, wishlistChart: WishlistChart, wishlistData: WishlistsData, dateRange: DateRange, wishlistRegionSelection: WishlistRegionSelection) => {
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
        type: isSingleDay(dateRange) ? 'bar' : 'line',
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
            updateWishlistChart(wishlistChart, wishlistData, dateRange, wishlistRegionSelection);
        }
    );

    chartBlockElem.appendChild(canvas);
}

export const updateWishlistChart = (wishlistChart: WishlistChart, wishlistData: WishlistsData, dateRange: DateRange, wishlistRegionSelection: WishlistRegionSelection) => {
    if (!wishlistChart.chart) return;

    console.log('Updating wishlist chart');

    const dateRangeArray = getDateRangeArray(dateRange, false, true);

    const oneDay = isSingleDay(dateRange);

    let viewByList: string[] = getViewByList(wishlistChart.wishlistChartType, wishlistRegionSelection);

    let labels = oneDay ? viewByList : dateRangeArray;
    let datasets: ChartDataset[] = [];

    if (oneDay) {
        datasets = getDayDataSetFromWishlists(
            wishlistData.data,
            dateToString(dateRange.dateStart),
            viewByList,
            wishlistChart.wishlistChartType,
            wishlistChart.chartColors);
    }
    else {
        datasets = getDataSetFromWishlists(
            wishlistData.data,
            viewByList,
            wishlistChart.wishlistChartType,
            wishlistChart.chartColors);
    }

    wishlistChart.chart.data.labels = labels;
    wishlistChart.chart.data.datasets = datasets;

    wishlistChart.chart.update();
}

const getWishlistsFromDayData = (dayData: GameWishlists, wishlistChartType: WishlistChartType, view: string): number => {
    switch (wishlistChartType) {
        case WishlistChartType.Actions:
            switch (view) {
                case WishlistChartActionsType.Adds:
                    return dayData.adds;
                case WishlistChartActionsType.Deletes:
                    return dayData.deletes;
                case WishlistChartActionsType.Gifts:
                    return dayData.gifts;
                case WishlistChartActionsType.Activations:
                    return dayData.activations;
                default:
                    return 0;
            }
        case WishlistChartType.Country:
        case WishlistChartType.Region:
            return dayData.regionalData[view].adds;
    }
}

const getDayDataSetFromWishlists = (wishlists: GameWishlists[], date: string, viewByList: string[], wishlistChartType: WishlistChartType, chartColors: Record<string, string>): ChartDataset[] => {
    const dayData = wishlists.find(item => item.date === date);

    if (dayData === undefined) {
        throw new Error(`Day data not found for date ${date}`);
    }

    const data: number[] = viewByList.map((view) => {
        return getWishlistsFromDayData(dayData, wishlistChartType, view);
    });
    const colors = viewByList.map((view) => {
        return selectChartColor(chartColors, view);
    });

    const dataset = {
        label: wishlistChartType,
        data: data,
        backgroundColor: colors,
    };

    return [dataset];
}

const getDataSetFromWishlists = (wishlists: GameWishlists[], viewByList: string[], wishlistChartType: WishlistChartType, chartColors: Record<string, string>): ChartDataset[] => {
    const datasets: ChartDataset[] = [];
    viewByList.forEach((view: string) => {
        const color = selectChartColor(chartColors, view);

        let data: number[] = [];

        wishlists.forEach(item => {
            data.push(getWishlistsFromDayData(item, wishlistChartType, view));
        });

        const dataset = {
            label: view,
            data: data,
            backgroundColor: color,
            borderColor: color,
        };

        datasets.push(dataset);
    });

    return datasets
}

const getViewByList = (wishlistChartType: WishlistChartType, wishlistRegionSelection: WishlistRegionSelection): string[] => {
    switch (wishlistChartType) {
        case WishlistChartType.Actions: return [
            WishlistChartActionsType.Adds,
            WishlistChartActionsType.Deletes,
            WishlistChartActionsType.Gifts,
            WishlistChartActionsType.Activations
        ];
        case WishlistChartType.Country: return wishlistRegionSelection.selectedCountries;
        case WishlistChartType.Region: return wishlistRegionSelection.regions;
    }
}
