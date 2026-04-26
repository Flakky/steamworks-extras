import { createFlexContentBlock, setFlexContentBlockContentElem, createMessageText } from "../pageblocks";

export const moveTotalTableToNewBlock = (doc: Document) => {
    const contentBlock = createFlexContentBlock(doc, 'Lifetime Overview', 'extra_lifetime_table_block');

    let content = doc.getElementsByClassName('lifetimeSummaryCtn')[0];

    if (!content) {
        throw new Error('Lifetime table block element not found');
    }

    setFlexContentBlockContentElem(contentBlock, content);
}

export const fixLifetimeLayout = (doc: Document) => {
    const table = doc.querySelector<HTMLTableElement>('table');
    if (!table) {
        throw new Error('Lifetime table element not found');
    }

    const td = Array.from(table.getElementsByTagName('td')).find(td => td.textContent.includes('Wishlist conversion rate is'));

    if (td) {
        const newTr = doc.createElement('tr');
        newTr.appendChild(td);
        table.appendChild(newTr);
    }

    let leftContent = doc.getElementById('leftParent');
    let rightContent = doc.getElementById('rightParent');

    if (!leftContent || !rightContent) {
        throw new Error('Left or right content element not found');
    }

    leftContent.style.width = '50%';
    rightContent.style.width = '50%';
}

export const moveWishlistConversionRateChartToNewBlock = (doc: Document) => {
    let content = doc.getElementById('percent_of_sales_graph');
    if (!content) return;

    const contentBlock = createFlexContentBlock(doc, 'Wishlist Conversion Rate', 'extra_conversion_chart_block');

    const description = doc.createElement('p');
    description.textContent = 'Wishlist purchases & activations as a percent of all purchases & activations';

    const container = doc.createElement('div');
    container.appendChild(description);
    container.appendChild(content);

    setFlexContentBlockContentElem(contentBlock, container);
}

export const moveLifetimeChartToNewBlock = (doc: Document) => {
    let content = doc.getElementById('lifetime_running_total_graph');
    if (!content) return;

    const contentBlock = createFlexContentBlock(doc, 'Lifetime Wishlist Actions', 'extra_lifetime_chart_block');

    setFlexContentBlockContentElem(contentBlock, content);
}

export const moveWishlistChartToNewBlock = (doc: Document) => {
    let chart = doc.getElementById('actions_graph');
    let newChartBlock = doc.getElementById('extra_wishlist_chart_block');
    if (!chart || !newChartBlock) return;

    newChartBlock.appendChild(chart);
}

export const moveSummaryToNewBlock = (doc: Document) => {
    const h2Elements = doc.getElementsByTagName('h2');
    if (!h2Elements) {
        throw new Error('H2 elements not found');
    }

    let targetH2 = null;

    for (let h2 of Array.from(h2Elements)) {
        if (h2.textContent.includes('Wishlist Action Summary')) {
            targetH2 = h2;
            break;
        }
    }

    if (!targetH2) {
        throw new Error('Wishlist Action Summary H2 element not found');
    }

    let nextSibling = targetH2.nextElementSibling;
    let firstB = null;
    let firstTable = null;

    while (nextSibling) {

        if (nextSibling.tagName === 'B' && !firstB) {
            firstB = nextSibling;
        }
        if (nextSibling.tagName === 'TABLE' && !firstTable) {
            firstTable = nextSibling;
        }
        if (firstB && firstTable) {
            break;
        }
        nextSibling = nextSibling.nextElementSibling;
    }

    const contentBlock = createFlexContentBlock(doc, 'Wishlist Action Summary', 'extra_summary_block');

    if (firstB) {
        setFlexContentBlockContentElem(contentBlock, firstB);
    }
    if (firstTable) {
        setFlexContentBlockContentElem(contentBlock, firstTable);
    }
}

export const moveNotificationsToNewBlock = (doc: Document) => {
    const h2Elements = doc.getElementsByTagName('h2');
    if (!h2Elements) {
        throw new Error('H2 elements not found');
    }

    let targetH2 = null;

    for (let h2 of Array.from(h2Elements)) {
        if (h2.textContent.includes('Wishlist Notifications for Period')) {
            targetH2 = h2;
            break;
        }
    }

    if (!targetH2) {
        throw new Error('Wishlist Notifications for Period H2 element not found');
    }

    let nextSibling = targetH2.nextElementSibling;
    let firstP = null;
    let firstTable = null;

    while (nextSibling) {

        if (nextSibling.tagName === 'P' && !firstP) {
            firstP = nextSibling;
        }
        if (nextSibling.tagName === 'TABLE' && !firstTable) {
            firstTable = nextSibling;
        }
        if (firstP && firstTable) {
            break;
        }
        nextSibling = nextSibling.nextElementSibling;
    }

    const contentBlock = createFlexContentBlock(doc, 'Wishlist Notifications for Period', 'extra_notifications_block');

    if (firstP) {
        setFlexContentBlockContentElem(contentBlock, firstP);
    }
    if (firstTable) {
        setFlexContentBlockContentElem(contentBlock, firstTable);
    }
}

export const moveConversionsToNewBlock = (doc: Document) => {
    const h2Elements = doc.getElementsByTagName('h2');
    if (!h2Elements) {
        throw new Error('H2 elements not found');
    }

    let targetH2 = null;

    for (let h2 of Array.from(h2Elements)) {
        if (h2.textContent.includes('Wishlist Conversions by Cohort')) {
            targetH2 = h2;
            break;
        }
    }

    if (!targetH2) {
        throw new Error('Wishlist Conversions by Cohort H2 element not found');
    }

    let nextSibling = targetH2.nextElementSibling;
    let firstB = null;
    let firstTable = null;

    while (nextSibling) {

        if (nextSibling.tagName === 'B' && !firstB) {
            firstB = nextSibling;
        }
        if (nextSibling.tagName === 'TABLE' && !firstTable) {
            firstTable = nextSibling;
        }
        if (firstB && firstTable) {
            break;
        }
        nextSibling = nextSibling.nextElementSibling;
    }

    const contentBlock = createFlexContentBlock(doc, 'Wishlist Conversions by Cohort', 'extra_conversions_block');

    if (firstB) {
        setFlexContentBlockContentElem(contentBlock, firstB);
    }
    if (firstTable) {
        setFlexContentBlockContentElem(contentBlock, firstTable);
    }
}

export const createWishlistChartBlock = (doc: Document) => {
    createFlexContentBlock(doc, 'Wishlist chart', 'extra_wishlist_chart_block');
}

export const createCountryTableBlock = (doc: Document) => {
    createFlexContentBlock(doc, 'Wishlists by country', 'extras_country_table_block');
}

export const createConversionsChartBlock = (doc: Document) => {
    createFlexContentBlock(doc, 'Wishlist cohort chart', 'extra_wishlist_conversions_chart_block');
}

export const moveOriginalWishlistChartToNewBlockWithWarning = (doc: Document) => {
    const chartCanvas = doc.getElementById('extras_wishlist_chart_canvas');
    if (chartCanvas) {
        chartCanvas.style.display = 'none';
    }

    moveWishlistChartToNewBlock(doc);

    const message = 'Some wishlist data for the current period could not be retrieved from the cache. Wishlists split by region will not be available. Try to refresh the page in a minute.';
    const chartWarningBlock = createMessageText(doc, 'warning', message);
    const tableWarningBlock = createMessageText(doc, 'warning', message);

    const chartBlock = doc.getElementById('extra_wishlist_chart_block');
    const tableBlock = doc.getElementById('extra_country_table_block');

    if (chartBlock && tableBlock) {
        chartBlock.insertBefore(chartWarningBlock, chartBlock.children[1]);
        tableBlock.insertBefore(tableWarningBlock, tableBlock.children[1]);
    }
}
