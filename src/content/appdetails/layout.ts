import { findParentByTag } from "../../scripts/helpers";
import { createFlexContentBlock, setFlexContentBlockContentElem } from "../pageblocks";

export const hideOldLinks = (doc: Document) => {
    const contentBlock = doc.getElementById('gameDataLeft');
    if (!contentBlock) {
        throw new Error('Content block not found');
    }

    const linksElem = contentBlock.children[1] as HTMLElement;
    if (!linksElem) {
        throw new Error('Links element not found');
    }

    linksElem.style.display = 'none';
}

export const moveSummaryTableToNewBlock = (doc: Document) => {
    const summaryTable = doc.querySelector('.lifetimeSummaryCtn table');
    if (!summaryTable) {
        throw new Error('Summary table not found');
    }

    const contentBlock = createFlexContentBlock(doc, 'Lifetime summary', 'extra_summary_block');

    setFlexContentBlockContentElem(contentBlock, summaryTable);
}

export const moveOldChartToNewBlock = (doc: Document) => {
    const oldChartElem = doc.getElementById('ChartUnitsHistory');
    if (!oldChartElem) {
        throw new Error('Old chart element not found');
    }

    const oldChartElemParentDiv = findParentByTag(oldChartElem, 'div');
    if (!oldChartElemParentDiv) return;

    const AllStatsDiv = findParentByTag(oldChartElemParentDiv, 'div');
    if (!AllStatsDiv || AllStatsDiv.children.length === 0) return;

    const contentBlock = createFlexContentBlock(doc, 'Original chart', 'extra_original_chart_block');

    const oldChartContainer = document.createElement('div');
    oldChartContainer.id = 'extra_old_chart_container';

    // We only need the first 4 children because this is the part about sales
    for (let i = 0; i < 4; i++) {
        if (AllStatsDiv.children.length > 0) {
            oldChartContainer.appendChild(AllStatsDiv.children[0]);
        }
    }

    setFlexContentBlockContentElem(contentBlock, oldChartContainer);
}

export const moveHeatmapNewBlock = (doc: Document) => {
    const heatmapElem = doc.getElementById('heatmapArea');
    if (!heatmapElem) {
        throw new Error('Heatmap element not found');
    }

    const contentBlock = createFlexContentBlock(doc, 'Sales heatmap', 'extra_sales_heatmap_block');

    setFlexContentBlockContentElem(contentBlock, heatmapElem);
}


export const getSummaryTable = (doc: Document): HTMLTableElement | null => {
    return doc.querySelector('#extra_summary_block table') as HTMLTableElement | null;
}

export const getSalesTable = (doc: Document): HTMLTableElement | null => {
    return doc.querySelector('#gameDataLeft table') as HTMLTableElement | null;
}
