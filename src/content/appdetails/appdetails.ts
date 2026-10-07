import '../../shared/log';
import { getCurrentURL, getDateRangeFromURL, getDefaultSettings, prepareChart, readChartColors } from "../site";
import { addStatusBlockToPage } from "../../shared/statusblock";
import { createCustomContentBlock, createToolbarBlock, hideOriginalMainBlock, moveDateRangeSelectionToTop, moveGameTitle } from "../pageblocks";
import { hideOldLinks, moveSummaryTableToNewBlock, moveHeatmapNewBlock, moveOldChartToNewBlock, getSalesTable, createSalesChartBlock, createSalesTableBlock, createReviewsChartBlock, createReviewsTableBlock } from "./layout";
import { getDataFromStorage, createMessageBlock } from "../../scripts/helpers";
import { RoyaltiesAndTaxesMap, SalesData, ReviewsData, SalesChartValueType, SalesChartSplit, SalesChartViewSelection, SalesTableColumns, ReviewChartSplit, SalesTableSplit } from "./types";
import { isDateInRange, isSingleDay } from "../../shared/types/daterange";
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

    // Get date range to determine if it's a single day
    const dateRange = getDateRangeFromURL(getCurrentURL());
    const singleDay = isSingleDay(dateRange);

    console.log('dateRange', dateRange);
    console.log(singleDay);

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

    moveHeatmapNewBlock(doc);
    moveOldChartToNewBlock(doc);

    hideOriginalMainBlock(doc);

    const gross = getTotalRevenue(doc, true);
    const net = getTotalRevenue(doc, false);
    const grossNetRatio = net / gross;

    console.log('grossNetRatio', grossNetRatio);

    const royaltiesAndTaxes: RoyaltiesAndTaxesMap = {
        usSalesTax: settings.usSalesTax,
        grossRoyalties: settings.grossRoyalties,
        netRoyalties: settings.netRoyalties,
        otherRoyalties: settings.otherRoyalties,
        localTax: settings.localTax,
        royaltiesAfterTax: settings.royaltiesAfterTax
    };

    // Every block below is independent: a failure in one of them must not
    // hide the others (previously a single error removed revenue and reviews).
    let salesData: SalesData | undefined;
    try {
        salesData = await requestSales(appID);
        console.debug('Sales data: ', salesData);
    }
    catch (error) {
        console.error('Failed to get sales data: ', error);
        showPageError(doc, `Failed to load sales data: ${errorToString(error)}. Reload the page to try again.`);
    }

    // Summary. US sales are only needed for the US tax deduction.
    runSafely('summary revenue', () => {
        updateSummaryRows(doc, gross, net, salesData?.usRevenue ?? 0, royaltiesAndTaxes, settings.showZeroRevenues, settings.showPercentages);
    });

    if (salesData) {
        const sales = salesData;

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

        runSafely('sales chart', () => {
            const salesChart = createSalesChart(doc, sales, dateRange, salesChartViewSelection, chartColors, settings.chartMaxBreakdown);
            updateSalesChart(salesChart, sales, dateRange, salesChartViewSelection, chartColors, settings.chartMaxBreakdown);
        });

        runSafely('sales table', () => {
            createSalesTable(doc, sales, singleDay, grossNetRatio, salesTableColumns, royaltiesAndTaxes);
            updateSalesTable(doc, sales, grossNetRatio, singleDay ? SalesTableSplit.Country : SalesTableSplit.Date, salesTableColumns, royaltiesAndTaxes);
        });
    }

    // Reviews
    let reviewsData: ReviewsData | undefined;
    try {
        reviewsData = await requestReviews(appID);
        console.debug('Reviews data: ', reviewsData);
    }
    catch (error) {
        console.error('Failed to get reviews data: ', error);
        showPageError(doc, `Failed to load reviews: ${errorToString(error)}. Reload the page to try again.`);
    }

    if (reviewsData) {
        const reviews = reviewsData;

        runSafely('reviews summary', () => updateReviewsSummary(doc, reviews));

        runSafely('reviews chart', () => {
            const reviewsChart = createReviewsChart(doc, reviews, dateRange, chartColors);
            updateReviewsChart(reviewsChart, ReviewChartSplit.Vote, reviews, dateRange, chartColors);
        });

        runSafely('reviews table', () => {
            createReviewsTable(doc);
            updateReviewsTable(doc, reviews);
        });
    }

    addFollowers(doc, appID).catch(error => {
        console.error('Failed to add followers:', error);
    });
}

const runSafely = (blockName: string, action: () => void) => {
    try {
        action();
    }
    catch (error) {
        console.error(`Failed to show ${blockName}: `, error);
    }
}

const errorToString = (error: unknown): string => {
    return error instanceof Error ? error.message : `${error}`;
}

const showPageError = (doc: Document, text: string) => {
    const container = doc.getElementById('extra_main_content_block') ?? doc.body;
    const block = createMessageBlock('error', text);
    block.style.flexBasis = '100%';
    container.prepend(block);
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

    if (!Array.isArray(sales)) {
        throw new Error('Background returned no sales data');
    }

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

    if (!Array.isArray(reviews)) {
        throw new Error('Background returned no reviews data');
    }

    return {
        reviews: reviews
    };
}

init();
