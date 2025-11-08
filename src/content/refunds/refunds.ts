import * as helpers from '../scripts/helpers';
import * as pageblocks from './pageblocks';
import * as refunds_chart from './chart';
import * as refunds_table from './table';
import * as refunds_reasonstable from './reasonstable';
import { addStatusBlockToPage } from "../../shared/statusblock";
import { getDefaultSettings, readChartColors } from '../site';
import { createCustomContentBlock, hideOriginalMainBlock, moveGameTitle } from '../pageblocks';
import { createToolbarBlock } from '../pageblocks';
import { RefundsSplit } from './types';
import { sendMessageAsync } from '../../scripts/helpers';

let salesAllTime: any = undefined;
let refundStats: any = {};

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

  createRefundsStatsBlock();
  refunds_table.createRefundsTableBlock();
  refunds_chart.createRefundsChartBlock();
  refunds_reasonstable.createReasonsTableBlock();

  await fetchAllRefundStats();

  createRefundsStats();
  refunds_reasonstable.createReasonsTable(packageID, refundStats);

  await requestSales();

  refunds_table.createRefundsTable();
  refunds_chart.createRefundsChart();
};

const getAppID = async (packageID: number): Promise<string> => {

  const packageIDsMap = await helpers.sendMessageAsync({ request: 'getPackageIDs' });

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

const requestSales = async (): Promise<void> => {

  console.log('Requesting sales data...');

  salesAllTime = await helpers.sendMessageAsync({ request: 'getData', type: 'Sales', appId: getAppID() });
  console.debug('Sales data received: ', salesAllTime);
}

const fetchAllRefundStats = async (packageID: number): Promise<void> => {

  await Promise.all([
    fetchRefundStats(RefundsSplit.Lifetime),
    fetchRefundStats(RefundsSplit.LastWeek),
    fetchRefundStats(RefundsSplit.LastMonth)
  ]);
}

const fetchRefundStats = async (packageID: number, split: RefundsSplit): Promise<void> => {
  const url = `https://partner.steampowered.com/package/refunds/${packageID}/?range=${split}`;

  const response = await sendMessageAsync({
    request: 'parseDOM',
    url: url,
    type: 'RefundStats'
  });

  console.log('Refund stats response: ', response);

  return response;
};

const createRefundsStatsBlock = (): void => {
  pageblocks.createFlexContentBlock('Refunds stats', 'extras_refunds_stats_block');
};

const createRefundsStats = async (): Promise<void> => {
  const statsBlockElem = document.createElement('div');
  statsBlockElem.id = 'extras_refunds_stats';

  // Create table
  const tableElem = document.createElement('table');
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
    const th = document.createElement('th');
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
    const stats = refundStats[i];
    addStatsRow(rangeLabels[i], stats);
  }

  pageblocks.setFlexContentBlockContent('extras_refunds_stats_block', statsBlockElem);
};

const getRefundPercentageColor = (percentage: number): { r: number; g: number; b: number } => {
  const startColor = { r: 0, g: 220, b: 0 };
  const endColor = { r: 220, g: 0, b: 0 };
  const min = 8;
  const max = 20;
  const clamped = Math.max(min, Math.min(max, percentage));
  const factor = (clamped - min) / (max - min);
  return {
    r: Math.round(startColor.r + factor * (endColor.r - startColor.r)),
    g: Math.round(startColor.g + factor * (endColor.g - startColor.g)),
    b: Math.round(startColor.b + factor * (endColor.b - startColor.b))
  };
};

init();


