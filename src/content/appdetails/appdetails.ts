import { getCurrentURL, getDateRangeFromURL, getDefaultSettings, prepareChart, readChartColors } from "../site";
import { addStatusBlockToPage } from "../../shared/statusblock";
import { createCustomContentBlock, createToolbarBlock, hideOriginalMainBlock, moveDateRangeSelectionToTop, moveGameTitle } from "../pageblocks";
import { hideOldLinks, moveSummaryTableToNewBlock, moveHeatmapNewBlock, moveOldChartToNewBlock, getSalesTable, createSalesChartBlock, createSalesTableBlock, createReviewsChartBlock, createReviewsTableBlock } from "./layout";
import { getDataFromStorage, dateToString } from "../../scripts/helpers";
import { RoyaltiesAndTaxesMap, SalesData, ReviewsData, SalesChartValueType, SalesChartSplit, SalesChartViewSelection, SalesTableColumns, ReviewChartSplit, SalesTableSplit } from "./types";
import { isDateInRange } from "../../shared/types/daterange";
import { addRefundDataLink, addFollowers, updateSummaryRows, updateReviewsSummary } from "./summary_table";
import { getTotalRevenue } from "./revenue";
import { createReviewsChart, updateReviewsChart } from "./reviews_chart";
import { createReviewsTable, updateReviewsTable } from "./reviews_table";
import { createSalesChart, updateSalesChart } from "./sales_chart";
import { createSalesTable, updateSalesTable } from "./sales_table";
import { DateSales } from "../../shared/types/sales";
import { Review } from "../../shared/types/review";
import { GetDataType } from "../../shared/types/background_requests";

const init = async () => {
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

    const packageID = getPackageId(doc);
    if (!packageID) {
        throw new Error('Package ID not found');
    }

    // Recreate the page structure
    createCustomContentBlock(doc);
    moveGameTitle(doc);
    hideOldLinks(doc);
    createToolbarBlock(doc, appID);
    moveDateRangeSelectionToTop(doc);
    addStatusBlockToPage();

    moveSummaryTableToNewBlock(doc);

    createSalesChartBlock(doc);
    createSalesTableBlock(doc);
    createReviewsChartBlock(doc);
    createReviewsTableBlock(doc);

    addRefundDataLink(doc, packageID);
    addFollowers(doc, appID);

    moveHeatmapNewBlock(doc);
    moveOldChartToNewBlock(doc);

    hideOriginalMainBlock(doc);

    const salesData = await requestSales(appID);
    console.debug('Sales data: ', salesData);

    const reviewsData = await requestReviews(appID);
    console.debug('Reviews data: ', reviewsData);

    const gross = getTotalRevenue(doc, true);
    const net = getTotalRevenue(doc, false);
    const royaltiesAndTaxes: RoyaltiesAndTaxesMap = {
        usSalesTax: settings.usSalesTax,
        grossRoyalties: settings.grossRoyalties,
        netRoyalties: settings.netRoyalties,
        otherRoyalties: settings.otherRoyalties,
        localTax: settings.localTax,
        royaltiesAfterTax: settings.royaltiesAfterTax
    };

    // Get date range to determine if it's a single day
    const dateRange = getDateRangeFromURL(getCurrentURL());
    const singleDay = dateToString(dateRange.dateStart) === dateToString(dateRange.dateEnd);

    // Sales
    const salesChartViewSelection: SalesChartViewSelection = {
        split: singleDay ? SalesChartSplit.Country : SalesChartSplit.Total,
        valueType: SalesChartValueType.GrossSteamSalesUSD
    };

    const salesTableColumns: SalesTableColumns = [
        { key: "grossSteamSalesUSD", label: "Gross" },
        { key: "netSteamSalesUSD", label: "Net" },
        { key: "grossUnitsSold", label: "Gross units" },
        { key: "netUnitsSold", label: "Net units" },
        { key: "chargebacksOrReturnsUSD", label: "Refunds" },
        { key: "chargebacksOrReturns", label: "Refund units" },
        { key: "FinalDevRevenue", label: "Est. revenue" }
    ];

    // Sales
    const salesChart = createSalesChart(doc, salesData, salesChartViewSelection, chartColors, settings.chartMaxBreakdown);
    createSalesTable(doc, salesData, singleDay, gross / net, salesTableColumns, royaltiesAndTaxes);
    updateSalesChart(salesChart, salesData, salesChartViewSelection, chartColors, settings.chartMaxBreakdown);
    updateSalesTable(doc, salesData, gross / net, singleDay ? SalesTableSplit.Country : SalesTableSplit.Date, salesTableColumns, royaltiesAndTaxes);

    // Reviews
    const reviewsChart = createReviewsChart(doc, reviewsData, chartColors);
    createReviewsTable(doc);
    updateReviewsTable(doc, reviewsData);
    updateReviewsChart(reviewsChart, ReviewChartSplit.Vote, reviewsData, chartColors);

    // Summary
    updateSummaryRows(doc, gross, net, salesData.usRevenue, royaltiesAndTaxes, settings.showZeroRevenues, settings.showPercentages);
    updateReviewsSummary(doc, reviewsData);
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

const getPackageId = (doc: Document): string | null => {
    const salesTable = getSalesTable(doc);

    console.debug('Sales table: ', salesTable);

    if (!salesTable) {
        return null;
    }

    const rows = salesTable.rows;

    console.debug('Rows: ', rows);

    const packageRow = rows[2];

    const packageLink = packageRow.getElementsByTagName('a')[0];
    if (!packageLink) {
        return null;
    }
    console.debug('Package link: ', packageLink);

    const matchArray = packageLink.href.match(/\/package\/details\/(\d+)/);
    if (!matchArray || matchArray.length < 2) {
        return null;
    }

    console.debug('Match array: ', matchArray);

    return matchArray[1] as string;
}

const requestSales = async (appID: string): Promise<SalesData> => {
    const dateRange = getDateRangeFromURL(getCurrentURL());

    // Get all sales data
    const sales = await getDataFromStorage(
        GetDataType.Sales,
        appID,
        '2010-01-01',
        '2099-12-31',
        true
    ) as DateSales[];

    // Filter to current date range
    const salesForDateRange = sales.filter((item: DateSales) => {
        if (!item.date) return false;
        const date = new Date(item.date);
        return isDateInRange(date, dateRange);
    });

    // US sales for tax calculation purposes
    const usRevenueForDateRange = salesForDateRange
        .filter((item: DateSales) => item.country === "United States")
        .reduce((sum: number, item: DateSales) => sum + (item.grossSteamSalesUSD || 0), 0);

    const usRevenue = sales
        .filter((item: DateSales) => item.country === "United States")
        .reduce((sum: number, item: DateSales) => sum + (item.grossSteamSalesUSD || 0), 0);

    return {
        allSales: sales,
        periodSales: salesForDateRange,
        usRevenue: usRevenue,
        periodUsRevenue: usRevenueForDateRange
    };
}

const requestReviews = async (appID: string): Promise<ReviewsData> => {
    const reviews = await getDataFromStorage(
        GetDataType.Reviews,
        appID,
        '2010-01-01',
        '2099-12-31',
        true
    ) as Review[];

    return {
        reviews: reviews
    };
}

init();
