import { getCurrentURL, getDateRangeFromURL, getDefaultSettings, readChartColors } from "../site";
import { addStatusBlockToPage } from "../../shared/statusblock";
import { createCustomContentBlock, createToolbarBlock, hideOriginalMainBlock, moveDateRangeSelectionToTop, moveGameTitle } from "../pageblocks";
import { hideOldLinks, moveSummaryTableToNewBlock, moveHeatmapNewBlock, moveOldChartToNewBlock, getSummaryTable } from "./layout";
import { getDataFromStorage } from "../../scripts/helpers";
import { SalesData } from "./types";
import { isDateInRange } from "../../shared/types/daterange";

const init = async () => {
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
    hideOldLinks(doc);
    createToolbarBlock(doc, appID);
    moveDateRangeSelectionToTop(doc);
    addStatusBlockToPage();

    const salesData = await requestSales(appID);

    // Create blocks
    moveSummaryTableToNewBlock(doc);
    createSalesChartBlock();
    createSalesTableBlock();
    createReviewsChartBlock();
    createReviewsTableBlock();
    moveHeatmapNewBlock(doc);
    moveOldChartToNewBlock(doc);

    hideOriginalMainBlock(doc);

    addRefundDataLink();
    addFollowers();

    requestReviews();
    requestSales();
}

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

const getPackageId = () => {
    const salesTable = getSalesTable();

    const rows = salesTable.rows;

    const packageRow = rows[2];

    const packageLink = packageRow.getElementsByTagName('a')[0];
    if (!packageLink) return;

    const id = packageLink.href.match(/\/package\/details\/(\d+)/)[1];

    return id;
}

const getTotalRevenue = (doc: Document, gross: boolean): number => {
    const table = getSummaryTable(doc);
    if (!table) return 0;

    const rows = table.rows;
    const revenueCell = rows[gross ? 0 : 1].cells[1];

    let revenue = revenueCell.textContent.split(' ')[0]; // Remove percentage if shown by settings

    revenue = revenue.replace('$', '');
    revenue = revenue.replace(/,/g, '');

    const revenueNumber = parseInt(revenue);

    return revenueNumber;
}

const getDateRangeOfCurrentPage = () => {
    // URL format:
    // https://partner.steampowered.com/app/details/AppID/?dateStart=2024-08-21&dateEnd=2024-08-27
    const urlObj = new URL(window.location.href);

    const urlParams = urlObj.searchParams

    let today = helpers.getCalculationToday();

    let dateStart = today;
    let dateEnd = today;

    const isToday = urlParams.get('specialPeriod') === 'today'
        || (!urlParams.has('dateStart') && !urlParams.has('dateEnd'));

    if (!isToday) {
        const dateStartString = urlParams.get('dateStart');
        const dateEndString = urlParams.get('dateEnd');

        if (!helpers.isStringEmpty(dateStartString)) dateStart = helpers.dateFromString(dateStartString);
        if (!helpers.isStringEmpty(dateEndString)) dateEnd = helpers.dateFromString(dateEndString);
    }

    ({ dateStart, dateEnd } = helpers.correctDateRange(dateStart, dateEnd));

    return { dateStart: dateStart, dateEnd: dateEnd };
}

const requestSales = async (appID: string): Promise<SalesData> => {
    const dateRange = getDateRangeFromURL(getCurrentURL());

    console.log('Requesting sales data...');

    const sales = await getDataFromStorage(
        'Sales',
        appID,
        dateRange.dateStart,
        dateRange.dateEnd,
        false
    );

    console.debug('Sales data received: ', sales);

    // Filter to current date range
    const salesForDateRange = sales.filter((item: any) => {
        if (!item["Date"]) return false;
        const date = new Date(item["Date"]);
        return isDateInRange(date, dateRange);
    });

    // US sales for tax calculation purposes
    const usRevenueForDateRange = salesForDateRange
        .filter((item: any) => item["Country"] === "United States")
        .reduce((sum: number, item: any) => sum + (item["Gross Steam Sales (USD)"] || 0), 0);

    const usRevenue = sales
        .filter((item: any) => item["Country"] === "United States")
        .reduce((sum: number, item: any) => sum + (item["Gross Steam Sales (USD)"] || 0), 0);

    console.debug('Sales data for range: ', salesForDateRange);
    console.debug('US sales data: ', usRevenue);
    console.debug('US sales data for range: ', usRevenueForDateRange);

    return {
        allSales: sales,
        periodSales: salesForDateRange,
        usRevenue: usRevenue,
        periodUsRevenue: usRevenueForDateRange
    };
}

init();
