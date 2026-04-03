import '../../shared/log';
import { getCurrentURL, getDateRangeFromURL, getDefaultSettings, prepareChart, readChartColors } from "../site";
import { createCustomContentBlock, createToolbarBlock, hideOriginalMainBlock, moveDateRangeSelectionToTop, moveGameTitle } from "../pageblocks";
import { addStatusBlockToPage } from "../../shared/statusblock";
import { getDataFromStorage, dateToString } from "../../scripts/helpers";
import {
    moveTotalTableToNewBlock,
    fixLifetimeLayout,
    moveWishlistConversionRateChartToNewBlock,
    moveConversionsToNewBlock,
    moveLifetimeChartToNewBlock,
    moveNotificationsToNewBlock,
    moveSummaryToNewBlock,
    createWishlistChartBlock,
    createCountryTableBlock,
    moveOriginalWishlistChartToNewBlockWithWarning
} from "./layout";
import { createWishlistChart, updateWishlistChart } from "./wishlist_chart";
import { createCountryTable, updateCountryTable, addTableSelect } from "./country_table";
import { WishlistsData, WishlistChart, WishlistRegionSelection, WishlistConversionsData, WishlistTableTypeSelection } from "./types";
import { initConversionsChart } from "./conversions_chart";
import { GameWishlists, GameWishlistConversions } from "../../shared/types/wishlists";
import { GetDataType } from "../../shared/types/background_requests";

const init = async (): Promise<void> => {
    console.log('Init');

    prepareChart();

    const doc = document;

    const settings = await getDefaultSettings();
    if (!settings) {
        throw new Error('Settings not found');
    }

    const chartColors = await readChartColors();
    if (!chartColors) {
        throw new Error('Chart colors not found');
    }

    const appID = getAppID(doc);
    if (!appID) {
        throw new Error('App ID not found');
    }

    const dateRange = getDateRangeFromURL(getCurrentURL());

    // Recreate the page structure
    createCustomContentBlock(doc);
    moveGameTitle(doc);
    createToolbarBlock(doc, appID);
    moveDateRangeSelectionToTop(doc);
    addStatusBlockToPage();

    // Create blocks
    moveTotalTableToNewBlock(doc);
    moveSummaryToNewBlock(doc);
    createWishlistChartBlock(doc);
    createCountryTableBlock(doc);

    fixLifetimeLayout(doc);

    moveWishlistConversionRateChartToNewBlock(doc);
    moveConversionsToNewBlock(doc);

    moveLifetimeChartToNewBlock(doc);
    moveNotificationsToNewBlock(doc);

    hideOriginalMainBlock(doc);

    const { wishlists, conversions } = await requestWishlistsData(appID);

    const wishlistTableTypeSelection = new WishlistTableTypeSelection();

    console.log("wishlists: ", wishlists);
    console.log("conversions: ", conversions);

    if (wishlists) {
        const wishlistsData = new WishlistsData();
        wishlistsData.data = wishlists;

        const wishlistChart = new WishlistChart();
        wishlistChart.chartColors = chartColors;

        const wishlistRegionSelection = buildwishlistRegionSelection(wishlistsData, settings.chartMaxBreakdown);

        createWishlistChart(doc, wishlistChart, wishlistsData, dateRange, wishlistRegionSelection);
        createCountryTable(doc);
        addTableSelect(doc, wishlistChart, wishlistsData, dateRange, wishlistTableTypeSelection, wishlistRegionSelection);

        updateWishlistChart(wishlistChart, wishlistsData, dateRange, wishlistRegionSelection);
        updateCountryTable(doc, wishlistChart, wishlistsData, dateRange, wishlistTableTypeSelection, wishlistRegionSelection);

        if (conversions) {
            const conversionsData = new WishlistConversionsData();
            conversionsData.data = conversions;

            initConversionsChart(doc, appID, wishlistsData, conversionsData);
        }
    }
    else {
        moveOriginalWishlistChartToNewBlockWithWarning(doc);
    }
};

const getAppID = (doc: Document) => {
    const titleElemWithAppID = doc.getElementsByTagName('h1')[0];
    if (!titleElemWithAppID) {
        return null;
    }

    const titleText = titleElemWithAppID.textContent || '';
    if (!titleText) {
        return null;
    }

    const idMatch = titleText.match(/\(([^)]+)\)/);
    if (!idMatch || idMatch.length < 2) {
        return null;
    }

    const id = idMatch[1];

    return id;
}

const requestWishlistsData = async (appID: string): Promise<{ wishlists: GameWishlists[], conversions: GameWishlistConversions[] }> => {
    const dateRange = getDateRangeFromURL(getCurrentURL());

    const wishlists = await getDataFromStorage(
        GetDataType.Wishlists,
        appID,
        dateToString(dateRange.dateStart),
        dateToString(dateRange.dateEnd),
        true
    ) as GameWishlists[];

    const conversions = await getDataFromStorage(
        GetDataType.WishlistConversions,
        appID,
        dateToString(dateRange.dateStart),
        dateToString(dateRange.dateEnd),
        true
    ) as GameWishlistConversions[];

    return { wishlists, conversions };
}

const buildwishlistRegionSelection = (wishlistsData: WishlistsData, chartMaxBreakdown: number) => {
    const wishlistRegionSelection = new WishlistRegionSelection();

    const makeTopItems = (countries: boolean) => {
        const wishlistSumm: Record<string, number> = {};

        wishlistsData.data.forEach((wishlist: GameWishlists) => {
            const arr = countries ? wishlist.countriesData : wishlist.regionsData;

            for (const [key, item] of Object.entries(arr)) {
                wishlistSumm[key] = (wishlistSumm[key] || 0) + item.adds;
            }
        });

        return Object.entries(wishlistSumm).sort((a, b) => b[1] - a[1]).slice(0, chartMaxBreakdown);
    };

    let countriesTop = makeTopItems(true);
    let regionsTop = makeTopItems(false);

    countriesTop.forEach(([key, value]) => {
        wishlistRegionSelection.selectedCountries.push(key);
    });

    regionsTop.forEach(([key, value]) => {
        wishlistRegionSelection.regions.push(key);
    });

    return wishlistRegionSelection;
}

init();
