import { getCurrentURL, getDateRangeFromURL, getDefaultSettings, readChartColors } from "../site";
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
import { createCountryTable, updateCountryTable } from "./country_table";
import { WishlistsData, WishlistChart, WishlistRegionSelection, WishlistConversionsData } from "./types";
import { initConversionsChart } from "./conversions_chart";
import { GameWishlists, GameWishlistConversions } from "../../shared/types/wishlists";
import { GetDataType } from "../../shared/types/background_requests";

const init = async (): Promise<void> => {
    console.log('Init');

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

    if (wishlists) {
        const wishlistsData = new WishlistsData();
        wishlistsData.data = wishlists;

        const wishlistChart = new WishlistChart();
        wishlistChart.chartColors = chartColors;

        const wishlistRegionSelection = new WishlistRegionSelection();

        createWishlistChart(doc, wishlistChart, wishlistsData, wishlistRegionSelection);
        createCountryTable(doc);

        updateWishlistChart(wishlistChart, wishlistsData, wishlistRegionSelection);
        updateCountryTable(doc, wishlistChart, wishlistsData, wishlistRegionSelection, settings.chartMaxBreakdown);

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
        false
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

init();
