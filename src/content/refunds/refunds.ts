import '../../shared/log';
import { createRefundsChart, updateRefundsChart } from './chart';
import { addStatusBlockToPage } from "../../shared/statusblock";
import { getDefaultSettings, readChartColors } from '../site';
import { createCustomContentBlock, hideOriginalMainBlock, moveGameTitle } from '../pageblocks';
import { createToolbarBlock } from '../pageblocks';
import { RefundsChartSelection, RefundsRangeSplit, RefundsTableSplitType } from './types';
import { sendMessageAsync, getDataFromStorage } from '../../scripts/helpers';
import { createReasonsTableBlock, createRefundsChartBlock, createRefundsStatsBlock, createRefundsTableBlock } from './layout';
import { createRefundsTable, updateRefundsTable } from './table';
import { createReasonsTable } from './reasonstable';
import { DateSales } from '../../shared/types/sales';
import { BackgroundMessageType, GetDataType } from '../../shared/types/background_requests';
import { prepareChart } from '../site';
import { fetchAllRefundStats, createRefundsStats } from './stats';

const init = async (): Promise<void> => {
    console.log("Init refunds page");

    prepareChart();

    const settings = await getDefaultSettings();
    if (!settings) {
        throw new Error('Settings not found');
    }

    const chartColors = await readChartColors();
    if (!chartColors) {
        throw new Error('Chart colors not found');
    }

    const packageID = getPackageID();
    if (!packageID) {
        throw new (Error as any)('Package ID not found');
    }

    const appID = await getAppID(packageID);
    if (!appID) {
        throw new Error('App ID not found');
    }

    const doc = document;

    // Recreate the page structure
    createCustomContentBlock(doc);
    moveGameTitle(doc);
    createToolbarBlock(doc, appID);
    addStatusBlockToPage();
    hideOriginalMainBlock(doc);

    createRefundsStatsBlock(doc);
    createRefundsTableBlock(doc);
    createRefundsChartBlock(doc);
    createReasonsTableBlock(doc);

    const refundsStats = await fetchAllRefundStats(packageID);
    const sales = await requestSales(appID);

    createRefundsStats(doc, refundsStats);

    const refundsTableSplit = RefundsTableSplitType.Month;
    createRefundsTable(doc, sales, refundsTableSplit);
    updateRefundsTable(doc, sales, refundsTableSplit);

    createReasonsTable(doc, packageID, refundsStats);

    const chartSelection = new RefundsChartSelection();

    const refundsChart = createRefundsChart(doc, sales, chartSelection, chartColors, settings.chartMaxBreakdown);
    updateRefundsChart(refundsChart, sales, chartSelection, chartColors, settings.chartMaxBreakdown);
};

const getAppID = async (packageID: number): Promise<string> => {

    const packageIDsMap = await sendMessageAsync({ request: BackgroundMessageType.getPackageIDs, payload: undefined });

    let foundAppID: any = undefined;
    for (const [appId, packageIds] of Object.entries(packageIDsMap)) {
        if (Array.isArray(packageIds) && packageIds.includes(packageID)) {
            foundAppID = appId;
            break;
        }
    }

    return foundAppID;
}

const getPackageID = (): number | undefined => {
    const url = window.location.href;
    try {
        const match = url.match(/\/package\/refunds\/(\d+)/);
        if (match && match[1]) {
            return Number(match[1]);
        }
    } catch (e) {
        console.error('Failed to extract package ID from URL:', e);
    }
    return undefined;
};

const requestSales = async (appID: string): Promise<DateSales[]> => {
    const sales = await getDataFromStorage(
        GetDataType.Sales,
        appID
    );

    return sales as DateSales[];
}

init();


