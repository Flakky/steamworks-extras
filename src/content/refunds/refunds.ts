import '../../shared/log';
import { createRefundsChart, updateRefundsChart } from './chart';
import { addStatusBlockToPage } from "../../shared/statusblock";
import { getDefaultSettings, readChartColors } from '../site';
import { createCustomContentBlock, hideOriginalMainBlock, moveGameTitle, setFlexContentBlockContent } from '../pageblocks';
import { createToolbarBlock } from '../pageblocks';
import { RefundsChartSelection, RefundsRangeSplit, RefundsTableSplitType } from './types';
import { sendMessageAsync, getDataFromStorage } from '../../scripts/helpers';
import { createReasonsTableBlock, createRefundsTableBlock, getRefundPercentageColor } from './layout';
import { createRefundsTable, updateRefundsTable } from './table';
import { createReasonsTable } from './reasonstable';
import { DateSales } from '../../shared/types/sales';
import { BackgroundMessageType, GetDataType } from '../../shared/types/background_requests';

const init = async (): Promise<void> => {
    console.log("Init refunds page");

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

    createRefundsTableBlock(doc);

    const refundsStats = await fetchAllRefundStats(packageID);
    const sales = await requestSales(appID);

    createRefundsStats(doc, refundsStats);

    const refundsTableSplit = RefundsTableSplitType.Country;
    createRefundsTable(doc, sales, refundsTableSplit);
    updateRefundsTable(doc, sales, refundsTableSplit);

    createReasonsTableBlock(doc);
    createReasonsTable(doc, packageID, refundsStats[RefundsRangeSplit.Lifetime]);

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

const fetchAllRefundStats = async (packageID: number): Promise<Record<RefundsRangeSplit, any>> => {
    const refundsStats: Record<RefundsRangeSplit, any> = {
        [RefundsRangeSplit.Lifetime]: {},
        [RefundsRangeSplit.LastWeek]: {},
        [RefundsRangeSplit.LastMonth]: {},
    };

    refundsStats[RefundsRangeSplit.Lifetime] = await fetchRefundStats(packageID, RefundsRangeSplit.Lifetime);
    refundsStats[RefundsRangeSplit.LastWeek] = await fetchRefundStats(packageID, RefundsRangeSplit.LastWeek);
    refundsStats[RefundsRangeSplit.LastMonth] = await fetchRefundStats(packageID, RefundsRangeSplit.LastMonth);

    return refundsStats;
}

const fetchRefundStats = async (packageID: number, split: RefundsRangeSplit): Promise<void> => {
    const url = `https://partner.steampowered.com/package/refunds/${packageID}/?range=${split}`;

    const response = await sendMessageAsync({
        request: BackgroundMessageType.parseDOM,
        payload: { url: url, type: 'RefundStats' },
    });

    console.log('Refund stats response: ', response);

    return response;
};

const createRefundsStats = (doc: Document, refundStats: Record<RefundsRangeSplit, any>) => {
    const statsBlockElem = doc.createElement('div');
    statsBlockElem.id = 'extras_refunds_stats';

    // Create table
    const tableElem = doc.createElement('table');
    const thead = tableElem.createTHead();
    const headerRow = thead.insertRow();

    // Add header cells
    // Custom headers with tooltips for returned and refunded units
    const headerConfigs = [
        {
            text: 'Period'
        },
        {
            text: 'Gross units returned',
            tooltip: 'includes all returns - chargebacks, fraud, payment issues, refunds'
        },
        {
            text: 'Gross units returned %'
        },
        {
            text: 'Refunded units',
            tooltip: 'user refunds as per the Steam Refund Policy (https://store.steampowered.com/steam_refunds/)'
        },
        {
            text: 'Refunded units %'
        }
    ];

    headerConfigs.forEach(header => {
        const th = doc.createElement('th');
        th.textContent = (header as any).text;
        if ((header as any).tooltip) {
            th.innerHTML += ' <a href="#" class="tooltip">(?)<span>' + (header as any).tooltip + '</span></a>';
        }
        headerRow.appendChild(th);
    });

    const tbody = tableElem.createTBody();
    statsBlockElem.appendChild(tableElem);

    const packageID = getPackageID();
    if (!packageID) {
        console.error('Package ID not found');
        return;
    }

    const rangeLabels = [
        'Lifetime',
        'Last Week',
        'Last Month'
    ];

    const addStatsRow = (label: string, data: any) => {
        const row = tbody.insertRow();

        const periodCell = row.insertCell();
        periodCell.textContent = label;

        const addValueCell = (value: any, cell: HTMLTableCellElement) => {
            (cell as any).textContent = value;
        }

        const addPercentageCell = (value: number, cell: HTMLTableCellElement) => {
            cell.textContent = value.toFixed(2) + '%';

            const { r, g, b } = getRefundPercentageColor(value);
            (cell.style as any).color = `rgb(${r},${g},${b})`;
        }

        addValueCell(data.grossUnits, row.insertCell());
        addPercentageCell(data.grossUnitsPercentage, row.insertCell());
        addValueCell(data.units, row.insertCell());
        addPercentageCell(data.unitsPercentage, row.insertCell());
    };

    for (let i = 0; i < rangeLabels.length; i++) {
        const stats = refundStats[i as RefundsRangeSplit];
        addStatsRow(rangeLabels[i], stats);
    }

    setFlexContentBlockContent(doc, 'extras_refunds_stats_block', statsBlockElem);
};

init();


