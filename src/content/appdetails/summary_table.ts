import { findElementByText, findParentByTag, numberWithCommas, sendMessageAsync } from "../../scripts/helpers";
import { getSummaryTable } from "./layout";
import { getBrowser } from "../../shared/browser";
import { ReviewsData, RoyaltiesAndTaxesMap } from "./types";
import { getRevenueMap, getRevenuePercentageMap } from "./revenue";
import { BackgroundMessageType } from "../../shared/types/background_requests";

const updateSummaryRowUnderExtend = (doc: Document, index: number, title: string, description: string, showPercentages: boolean, calculation: () => { summ: number, share: number }) => {
    const cell = findElementByText('td', title);
    let row = findParentByTag(cell, 'tr') as HTMLTableRowElement;

    let sumElem, descElem = undefined;

    if (row === undefined) {
        const table = getSummaryTable(doc);
        if (!table) return;

        row = table.insertRow(index); // Insert after net
        row.classList.add('summary-extend-row');
        row.style.display = 'none';

        const nameElem = doc.createElement('td');
        nameElem.textContent = title;
        nameElem.classList.add('extra_extend_title');

        sumElem = doc.createElement('td');

        descElem = doc.createElement('td');

        row.appendChild(nameElem);
        row.appendChild(sumElem);
        row.appendChild(descElem);
    }
    else {
        sumElem = row.cells[1];
        descElem = row.cells[2];
    }

    const calculatedAmount = calculation();
    const revenueString = numberWithCommas(Math.floor(calculatedAmount.summ));

    descElem.textContent = description;

    sumElem.setAttribute('align', 'right')
    sumElem.textContent = `$${revenueString}`

    if (showPercentages) AddPercentageToRevenue(doc, sumElem, calculatedAmount.share, 2);

    console.log(`Updated summary row: ${title} - ${revenueString}`);
}

const updateFinalRevenueRow = (doc: Document, index: number, calculation: () => { summ: number, share: number }, showPercentages: boolean) => {
    const table = getSummaryTable(doc);
    if (!table) return;

    let row = table.rows[index];
    const rowTitleCell = row.cells[0];

    let sumElem = undefined;

    if (rowTitleCell === undefined || !rowTitleCell.textContent.includes('Final lifetime developer revenue')) {
        row = table.insertRow(index);

        // Title link with extend
        const nameExtendButton = doc.createElement('a');
        nameExtendButton.textContent = '► Final lifetime developer revenue';
        nameExtendButton.id = 'revenue_extend';
        nameExtendButton.href = '#';
        nameExtendButton.addEventListener('click', () => toggleExtraSummaryRows(doc));

        const nameElem = doc.createElement('td');
        nameElem.appendChild(nameExtendButton);

        // Description element
        const descElem = doc.createElement('td');
        descElem.textContent = 'Final developer revenue after all royalties, payments and taxes. ';

        const optionsLink = doc.createElement('a');
        optionsLink.href = '#';
        optionsLink.textContent = 'Setup';
        optionsLink.id = 'ext_options_link';

        descElem.appendChild(optionsLink);

        optionsLink.addEventListener('click', () => {
            getBrowser().runtime.sendMessage({ request: "showOptions" }, (res: any) => { });
        });

        // Summ element
        sumElem = doc.createElement('td');
        sumElem.setAttribute('align', 'right')

        row.appendChild(nameElem);
        row.appendChild(sumElem);
        row.appendChild(descElem);
    }
    else {
        sumElem = row.cells[1];
    }

    const calculatedAmount = calculation();

    const devRevenueString = numberWithCommas(Math.floor(calculatedAmount.summ));

    sumElem.textContent = `$${devRevenueString}`

    if (showPercentages) AddPercentageToRevenue(doc, sumElem, calculatedAmount.share, 2);

    console.log("Updated final revenue");
}

export const updateSummaryRows = (doc: Document, gross: number, net: number, usRevenue: number, royaltiesAndTaxes: RoyaltiesAndTaxesMap, showZeroRevenues: boolean, showPercentages: boolean) => {

    const revenueMap = getRevenueMap(gross, net, usRevenue, royaltiesAndTaxes);

    const shares = getRevenuePercentageMap(gross, net, usRevenue, royaltiesAndTaxes);

    updateFinalRevenueRow(doc, 2, () => { return { summ: revenueMap.finalRevenue, share: shares.finalRevenue } }, showPercentages);

    updateSummaryRowUnderExtend(doc, 3, "Revenue after Steam share", "(Net revenue * 0.7)", showPercentages, () => { return { summ: revenueMap.royaltyAfterSteamShare, share: shares.royaltyAfterSteamShare } });

    let rowIndex = 4;

    if (showZeroRevenues || revenueMap.royaltyAfterUSShare != revenueMap.royaltyAfterSteamShare) {
        updateSummaryRowUnderExtend(doc, rowIndex,
            "Revenue after US share",
            `Revenue after tax (${royaltiesAndTaxes.usSalesTax}%) that is deducted from US sales. ($${numberWithCommas(usRevenue)})`, showPercentages,
            () => { return { summ: revenueMap.royaltyAfterUSShare, share: shares.royaltyAfterUSShare } });
        rowIndex++;
    }

    if (showZeroRevenues || revenueMap.royaltyAfterExtraGrossTake != revenueMap.royaltyAfterUSShare) {
        updateSummaryRowUnderExtend(doc, rowIndex,
            "Revenue after Gross royalties",
            `Revenue after other royalties (${royaltiesAndTaxes.grossRoyalties}%) you pay from Gross.`, showPercentages,
            () => { return { summ: revenueMap.royaltyAfterExtraGrossTake, share: shares.royaltyAfterExtraGrossTake } });
        rowIndex++;
    }
    if (showZeroRevenues || revenueMap.royaltyAfterExtraNetTake != revenueMap.royaltyAfterExtraGrossTake) {
        updateSummaryRowUnderExtend(doc, rowIndex,
            "Revenue after Net royalties",
            `Revenue after royalties you pay after receiving Net and paying gross royalties. (${royaltiesAndTaxes.netRoyalties}%)`, showPercentages,
            () => { return { summ: revenueMap.royaltyAfterExtraNetTake, share: shares.royaltyAfterExtraNetTake } });
        rowIndex++;
    }
    if (showZeroRevenues || revenueMap.revenueAfterOtherRoyalties != revenueMap.royaltyAfterExtraNetTake) {
        updateSummaryRowUnderExtend(doc, rowIndex,
            "Revenue after Other royalties",
            `Revenue after any other payments (${royaltiesAndTaxes.otherRoyalties}%) you make from what's left but before your local taxes`, showPercentages,
            () => { return { summ: revenueMap.revenueAfterOtherRoyalties, share: shares.revenueAfterOtherRoyalties } });
        rowIndex++;
    }
    if (showZeroRevenues || revenueMap.revenueAfterTax != revenueMap.revenueAfterOtherRoyalties) {
        updateSummaryRowUnderExtend(doc, rowIndex,
            "Revenue after local tax",
            `Revenue after your local income tax (${royaltiesAndTaxes.localTax}%)`, showPercentages,
            () => { return { summ: revenueMap.revenueAfterTax, share: shares.revenueAfterTax } });
        rowIndex++;
    }

    updateSummaryRowUnderExtend(doc, rowIndex,
        "Final developer revenue",
        `Final revenue after extra payments (${royaltiesAndTaxes.royaltiesAfterTax}%) after taxes.`, showPercentages,
        () => { return { summ: revenueMap.finalRevenue, share: shares.finalRevenue } });

    if (showPercentages) addPercentageToGrossAndNet(doc, gross, net);
}

const addPercentageToGrossAndNet = (doc: Document, gross: number, net: number) => {
    const summaryTable = getSummaryTable(doc);
    if (!summaryTable) {
        throw new Error('Summary table not found');
    }

    const rows = summaryTable.rows;
    const grossCell = rows[0].cells[1];
    const netCell = rows[1].cells[1];

    if (grossCell.getElementsByTagName('i').length > 0) return; // Already added

    AddPercentageToRevenue(doc, grossCell, 1.0, 1);
    AddPercentageToRevenue(doc, netCell, net / gross, 2);
}

const AddPercentageToRevenue = (doc: Document, elem: HTMLElement, share: number, fixnum: number) => {
    elem.textContent += ` `
    const shareElem = doc.createElement('i');
    shareElem.classList.add('extra_revenue_percentage');
    const percentage = (share * 100).toFixed(fixnum);
    shareElem.textContent = `${percentage}%`;

    elem.appendChild(shareElem);
}

const toggleExtraSummaryRows = (doc: Document) => {
    const summaryTable = getSummaryTable(doc);
    if (!summaryTable) {
        throw new Error('Summary table not found');
    }

    const extendButtonElem = summaryTable.rows[2].cells[0];
    const extendLinkElem = extendButtonElem.getElementsByTagName('a')[0];

    const sign = extendLinkElem.textContent.split(' ')[0];

    const newShow = sign === '►';

    const rows = doc.querySelectorAll('.summary-extend-row') as NodeListOf<HTMLTableRowElement>;

    rows.forEach((row: HTMLTableRowElement) => {
        row.style.display = newShow ? 'table-row' : 'none';
    });

    extendLinkElem.textContent = extendButtonElem.textContent.replace(newShow ? '►' : '▼', newShow ? '▼' : '►');
}

export const addFollowers = async (doc: Document, appID: string) => {
    const summaryTable = getSummaryTable(doc);
    if (!summaryTable) {
        throw new Error('Summary table not found');
    }

    const wishlistsCell = findElementByText('td', 'Wishlists');
    if (!wishlistsCell) {
        throw new Error('Wishlists cell not found');
    }

    const wishlistsRow = findParentByTag(wishlistsCell, 'tr') as HTMLTableRowElement;
    if (!wishlistsRow) {
        throw new Error('Wishlists row not found');
    }

    const lifetimeUnitsRowIndex = wishlistsRow.rowIndex;

    const newRow = summaryTable.insertRow(lifetimeUnitsRowIndex + 3); // Insert after wishlists (including extended wishlists rows)

    const followersTitleCell = doc.createElement('td');
    followersTitleCell.textContent = 'Followers';
    newRow.appendChild(followersTitleCell);

    const followersValueCell = doc.createElement('td');
    followersValueCell.setAttribute('align', 'right')
    newRow.appendChild(followersValueCell);

    const loader = doc.createElement('div');
    loader.className = 'loader';
    followersValueCell.appendChild(loader);

    let followersDescriptionCell = doc.createElement('td');
    newRow.appendChild(followersDescriptionCell);

    let followers = NaN;

    try {
        const url = `https://steamcommunity.com/games/${appID}/membersManage`;
        console.log(`Requesting followers from `, url);
        followers = await sendMessageAsync({ request: BackgroundMessageType.parseDOM, payload: { url: url, type: 'followers' } });
    }
    catch (e) {
        console.error('Failed to get followers:', e);
    }

    if (isNaN(followers) || followers < 0) {
        console.error('Invalid followers count:', followers);

        followersValueCell.innerHTML = `---`;
        followersDescriptionCell.innerHTML =
            `Failed to get followers. <a target="_blank" rel="noopener noreferrer" href="https://steamcommunity.com/games/${appID}/membersManage">Make sure you have access.</a>`;
        return;
    }

    followersValueCell.innerHTML = followers.toString();
    followersDescriptionCell.innerHTML =
        `<a target="_blank" rel="noopener noreferrer" href="https://steamcommunity.com/games/${appID}/membersManage">(View & manage followers)</a>`;

}

export const addRefundDataLink = (packageId: string) => {
    const refundCell = findElementByText('td', 'Lifetime units returned');
    if (!refundCell) {
        throw new Error('Lifetime units returned cell not found');
    }

    const parentRow = refundCell.parentNode as HTMLTableRowElement;

    if (!parentRow) {
        throw new Error('Lifetime units returned cell parent node not found');
    }

    const refundDescCell = parentRow.cells[2];

    refundDescCell.innerHTML += ` (<a href="https://partner.steampowered.com/package/refunds/${packageId}/">Refund data</a>)`;

    console.log("Added refund data link");
}

export const updateReviewsSummary = (doc: Document, reviews: ReviewsData) => {
    if (!reviews.reviews) {
        throw new Error('Reviews data not found');
    }

    const summaryTable = getSummaryTable(doc);
    if (!summaryTable) {
        throw new Error('Summary table not found');
    }

    let positive = 0;
    let negative = 0;

    for (const review of reviews.reviews) {
        if (!review.steam_purchase) continue; // Reviews which were not purchased from Steam do not count toward final score

        if (review.voted_up) positive++;
        else negative++;
    }

    const lifeTimeUnitsReturnedCell = findElementByText('td', 'Lifetime units returned');

    const lifetimeUnitsRow = findParentByTag(lifeTimeUnitsReturnedCell, 'tr') as HTMLTableRowElement;
    if (!lifetimeUnitsRow) {
        throw new Error('Lifetime units returned row not found');
    }

    const lifetimeUnitsRowIndex = lifetimeUnitsRow.rowIndex;

    let newLineSplitter = summaryTable.rows[lifetimeUnitsRowIndex + 1].cloneNode(true);

    summaryTable.children[0].insertBefore(newLineSplitter, summaryTable.rows[lifetimeUnitsRowIndex + 1]);

    const addReviewRow = (title: string, numHtml: string, desc: string) => {
        const row = summaryTable.insertRow(lifetimeUnitsRowIndex + 2); // Insert after net
        row.classList.add('extra_summary_review_row');

        const nameElem = doc.createElement('td');
        nameElem.textContent = title;

        const numElem = doc.createElement('td');
        numElem.align = 'right';
        numElem.innerHTML = numHtml;

        const descElem = doc.createElement('td');
        descElem.textContent = desc;

        row.appendChild(nameElem);
        row.appendChild(numElem);
        row.appendChild(descElem);

        return row;
    };

    addReviewRow(
        'Positive reviews',
        `${(positive / (positive + negative) * 100).toFixed(1)}%`,
        ''
    );

    addReviewRow(
        'Reviews',
        `<span>${positive + negative}</span> (<span class="extra_summary_review_positive">${positive}</span> | <span class="extra_summary_review_negative">${negative}</span>)`,
        'Reviews which are not counted toward review score are not included.'
    );
}
