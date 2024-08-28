let settings = {};

const init = () => {
    console.log("Steamworks extras: Init");

    chrome.storage.local.get(['usSalesTax', 'usSalesTax', 'grossRoyalties', 'netRoyalties', 'otherRoyalties', 'localTax', 'royaltiesAfterTax'], (result) => {
        settings = result;
        
        addSummaryRows();
        addSalesNetRow();
        addRefundDataLink();
    });
}

const getSummaryTable = () => {
    return document.querySelector('.lifetimeSummaryCtn table');
}

const getSalesTable = () => {
    var parentElement = document.getElementById('gameDataLeft');

    var childElements = parentElement.children;
    var divs = [];

    // Filter out only those children that are divs
    for (var i = 0; i < childElements.length; i++) {
        if (childElements[i].tagName === 'DIV') {
            divs.push(childElements[i]);
        }
    }

    const salesDiv = divs[3];

    return salesDiv.getElementsByTagName('table')[0];
}

const getPackageId = () => {
    const salesTable = getSalesTable();

    const rows = salesTable.rows;

    const packageRow = rows[2];

    const packageLink = packageRow.getElementsByTagName('a')[0];

    const id = packageLink.href.match(/\/package\/details\/(\d+)/)[1];

    return id;
}

const getTotalRevenue = (gross) => {
    const table = getSummaryTable();
    if (!table) return;

    const rows = table.rows;
    const revenueCell = rows[gross ? 0 : 1].cells[1];

    let revenue = revenueCell.textContent;
    revenue = revenue.replace('$', '');
    revenue = revenue.replace(',', '');

    return Math.floor(revenue);
}

const addSummaryRowUnderExtend = (index, title, description, calculation) => {
    const table = getSummaryTable();
    if (!table) return;

    const revenueString = helpers.numberWithCommas(Math.floor(calculation()));

    const newRow = table.insertRow(index); // Insert after net
    newRow.classList.add('summary-extend-row');
    newRow.style.display = 'none';

    const nameElem = document.createElement('td');
    nameElem.textContent = title;

    const sumElem = document.createElement('td');
    sumElem.setAttribute('align', 'right')
    sumElem.textContent = `$${revenueString}`

    const descElem = document.createElement('td');
    descElem.textContent = description;

    newRow.appendChild(nameElem);
    newRow.appendChild(sumElem);
    newRow.appendChild(descElem);

    console.log("Steamworks extras: Added summary row");
}

const addSummaryNetRow = (revenue, index) => {
    const table = getSummaryTable();
    if (!table) return;

    const devRevenueString = helpers.numberWithCommas(Math.floor(revenue));

    const newRow = table.insertRow(index); // Insert after net

    const sumElem = document.createElement('td');
    sumElem.setAttribute('align', 'right')
    sumElem.textContent = `$${devRevenueString}`
    const descElem = document.createElement('td');
    descElem.textContent = '(Net revenue - Steam revenue share)'

    const nameExtendButton = document.createElement('a');
    nameExtendButton.textContent = '► Final lifetime developer revenue';
    nameExtendButton.id = 'revenue_extend';
    nameExtendButton.href = '#';
    nameExtendButton.addEventListener('click', toggleExtraSummaryRows);

    const nameElem = document.createElement('td');
    nameElem.appendChild(nameExtendButton);

    newRow.appendChild(nameElem);
    newRow.appendChild(sumElem);
    newRow.appendChild(descElem);

    console.log("Steamworks extras: Added summary net");
}

const getRevenueMap = () => {
    const out = {};

    out.royaltyAfterSteamShare = Math.floor(getTotalRevenue(false) * 0.7);
    out.royaltyAfterUSShare = Math.floor(getTotalRevenue(false) * 0.7);
    out.royaltyAfterExtraGrossTake = out.royaltyAfterUSShare - (getTotalRevenue(true) * (settings.grossRoyalties/100));
    out.royaltyAfterExtraNetTake = out.royaltyAfterExtraGrossTake - (out.royaltyAfterExtraGrossTake * (settings.netRoyalties/100));
    out.revenueAfterOtherRoyalties = out.royaltyAfterExtraNetTake - (out.royaltyAfterExtraNetTake * (settings.otherRoyalties/100));
    out.revenueAfterTax = out.revenueAfterOtherRoyalties - (out.revenueAfterOtherRoyalties * (settings.localTax/100));
    out.finalRevenue = out.revenueAfterTax - (out.revenueAfterTax * (settings.royaltiesAfterTax/100));

    return out;
}

const addSummaryRows = () => {
    const {royaltyAfterSteamShare,
    royaltyAfterUSShare,
    royaltyAfterExtraGrossTake,
    royaltyAfterExtraNetTake,
    revenueAfterOtherRoyalties,
    revenueAfterTax,
    finalRevenue} = getRevenueMap();

    addSummaryNetRow(finalRevenue, 2);

    addSummaryRowUnderExtend(3, "Revenue after Steam share", "(Net revenue * 0.7)", () => {return royaltyAfterSteamShare});
    addSummaryRowUnderExtend(4, "Revenue after US share", "Revenue after tax that is deducted from US sales.", () => {return royaltyAfterUSShare});
    addSummaryRowUnderExtend(5, "Revenue after Gross royalties", "Revenue after other royalties you pay from Gross.", () => {return royaltyAfterExtraGrossTake});
    addSummaryRowUnderExtend(6, "Revenue after Net royalties", "Revenue after royalties you pay after receiving Net and paying gross royalties", () => {return royaltyAfterExtraNetTake});
    addSummaryRowUnderExtend(7, "Revenue after Other royalties", "Revenue after any other payments you make from what's left but before your local taxes", () => {return revenueAfterOtherRoyalties});
    addSummaryRowUnderExtend(8, "Revenue after local tax", "Revenue after your local income tax", () => {return revenueAfterTax});
    addSummaryRowUnderExtend(8, "Final developer revenue", "Revenue after all taxes and payments", () => {return finalRevenue});
}

const toggleExtraSummaryRows = () => {
    const table = getSummaryTable();
    if (!table) return;

    const extendButtonElem = table.rows[2].cells[0];
    const extendLinkElem = extendButtonElem.getElementsByTagName('a')[0];

    const sign = extendLinkElem.textContent.split(' ')[0];

    const newShow = sign === '►';

    var rows = document.querySelectorAll('.summary-extend-row');
    
    rows.forEach(function(row) {
        row.style.display = newShow ? 'table-row' : 'none';
    });

    extendLinkElem.textContent = extendButtonElem.textContent.replace(newShow ? '►' : '▼', newShow ? '▼' : '►');
}

const addSalesNetRow = () => {
    const salesTable = getSalesTable();

    const rows = salesTable.rows;

    let revenueRow = undefined;
    let revenueRowIndex = -1;
    
    for(const row of rows) {
        revenueRowIndex++;

        const bElemWithText = row.getElementsByTagName('b')[0];
        if(!bElemWithText) continue;

        if(bElemWithText.textContent == 'Total revenue'){
            revenueRow = row;
            break;
        }
    }

    if(!revenueRow) {
        console.error('Revenue row was not found!');
        return;
    }

    const revenueCell = revenueRow.cells[2];
    let revenue = revenueCell.textContent;
    revenue = revenue.replace('$', '');
    revenue = revenue.replace(',', '');
    
    const {finalRevenue} = getRevenueMap();
    const finalRevenueRatio = finalRevenue / getTotalRevenue(true);

    const devRevenueString = helpers.numberWithCommas(Math.floor(revenue * finalRevenueRatio));

    const newRow = salesTable.insertRow(revenueRowIndex+1); // Insert after total revenue

    const nameElem = document.createElement('td');
    const sumElem = document.createElement('td');
    const spacerElem = document.createElement('td');
    nameElem.innerHTML = '<b>Developer revenue</b>';
    sumElem.innerHTML = `<b>$${devRevenueString}</b>`;
    sumElem.setAttribute('align', 'right');
    
    newRow.appendChild(nameElem);
    newRow.appendChild(spacerElem);
    newRow.appendChild(sumElem);

    for(let i = 3; i<revenueRow.cells.length;i++){
        const cell = document.createElement('td');
        newRow.appendChild(cell);
    }

    console.log("Steamworks extras: Added sales for date range net");
}

const addRefundDataLink = () => {
    const refundCell = helpers.findElementByText('td', 'Lifetime units returned');
    if(!refundCell) return;

    const refundDescCell = refundCell.parentNode.cells[2];

    const packageId = getPackageId();

    refundDescCell.innerHTML += ` (<a href="https://partner.steampowered.com/package/refunds/${packageId}/">Refund data</a>)`;

    console.log("Steamworks extras: Added refund data link");
}

init();