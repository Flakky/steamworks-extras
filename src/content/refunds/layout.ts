import { createFlexContentBlock } from "../pageblocks";

export const createRefundsTableBlock = (doc: Document): void => {
  createFlexContentBlock(doc, 'Refunds table', 'extras_refunds_table_block');
};

export const createRefundsStatsBlock = (doc: Document): void => {
  createFlexContentBlock(doc, 'Refunds stats', 'extras_refunds_stats_block');
};

export const createReasonsTableBlock = (doc: Document): void => {
  createFlexContentBlock(doc, 'Refund reasons', 'extras_reasons_block');
};

export const createRefundsChartBlock = (doc: Document): void => {
  const contentBlock = createFlexContentBlock(doc, 'Refunds chart', 'extra_refunds_chart_block');

  const chartBlockElem = doc.createElement('div');
  chartBlockElem.id = 'extras_refunds_chart';

  contentBlock.appendChild(chartBlockElem);
};

export const getRefundPercentageColor = (percentage: number): { r: number; g: number; b: number } => {
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
