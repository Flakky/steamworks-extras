import { RefundsRangeSplit } from "./types";
import { sendMessageAsync } from "../../scripts/helpers";
import { BackgroundMessageType } from "../../shared/types/background_requests";
import { getRefundPercentageColor } from "./layout";
import { setFlexContentBlockContent } from "../pageblocks";

export const fetchAllRefundStats = async (packageID: number): Promise<Record<RefundsRangeSplit, any>> => {
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

export const fetchRefundStats = async (packageID: number, split: RefundsRangeSplit): Promise<void> => {
    const url = `https://partner.steampowered.com/package/refunds/${packageID}/?range=${split}`;

    const response = await sendMessageAsync({
        request: BackgroundMessageType.parseDOM,
        payload: { url: url, type: 'RefundStats' },
    });

    console.log('Refund stats response: ', response);

    return response;
};

export const createRefundsStats = (doc: Document, refundStats: Record<RefundsRangeSplit, any>) => {
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
