let settings = {};
let usRevenue = -1; // -1 means did not receive US share or got an error 

const init = () => {
    console.log("Steamworks extras: Init");

    helpers.getCountryRevenue(getAppID(), 'United States').then((revenue) => {
        usRevenue = revenue;

        updateSummaryRows();
    });

    chrome.storage.local.get(['usSalesTax', 'usSalesTax', 'grossRoyalties', 'netRoyalties', 'otherRoyalties', 'localTax', 'royaltiesAfterTax'], (result) => {
        settings = result;
        
        updateSummaryRows();
        addSalesNetRow();
        addRefundDataLink();
    });
}

const getSummaryTable = () => {
    return document.querySelector('.lifetimeSummaryCtn table');
}

const getAppID = () => {
    const titleElemWithAppID = document.getElementsByTagName('h1')[0];

    const id = titleElemWithAppID.textContent.match(/\(([^)]+)\)/)[1];

    console.log(id);

    return id;
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

const updateSummaryRowUnderExtend = (index, title, description, calculation) => {
    const cell = helpers.findElementByText('td', title);
    let row = helpers.findParentByTag(cell, 'tr');

    let sumElem = undefined;

    if(row === undefined){
        const table = getSummaryTable();
        if (!table) return;

        row = table.insertRow(index); // Insert after net
        row.classList.add('summary-extend-row');
        row.style.display = 'none';

        nameElem = document.createElement('td');
        nameElem.textContent = title;

        sumElem = document.createElement('td');

        const descElem = document.createElement('td');
        descElem.textContent = description;

        row.appendChild(nameElem);
        row.appendChild(sumElem);
        row.appendChild(descElem);
    }
    else {
        sumElem = row.cells[1];
    }

    const calculatedNumber = calculation();
    const revenueString = helpers.numberWithCommas(Math.floor(calculatedNumber));

    sumElem.setAttribute('align', 'right')
    sumElem.textContent = `$${revenueString}`

    console.log(`Steamworks extras: Updated summary row: ${title} - ${revenueString}`);
}

const updateFinalRevenueRow = (revenue, index) => {
    const table = getSummaryTable();
    if (!table) return;

    let row = table.rows[index];
    const rowTitleCell = row.cells[0];

    let sumElem = undefined;

    if(rowTitleCell === undefined || !rowTitleCell.textContent.includes('Final lifetime developer revenue')){
        row = table.insertRow(index);

        // Title link with extend
        const nameExtendButton = document.createElement('a');
        nameExtendButton.textContent = '► Final lifetime developer revenue';
        nameExtendButton.id = 'revenue_extend';
        nameExtendButton.href = '#';
        nameExtendButton.addEventListener('click', toggleExtraSummaryRows);
    
        const nameElem = document.createElement('td');
        nameElem.appendChild(nameExtendButton);

        // Description element
        const descElem = document.createElement('td');
        descElem.textContent = 'Final developer revenue after all royalties, payments and taxes. ';

        const optionsLink = document.createElement('a');
        optionsLink.href = '#';
        optionsLink.textContent = 'Setup';
        optionsLink.id = 'ext_options_link';

        descElem.appendChild(optionsLink);

        optionsLink.addEventListener('click', (event) => {
            chrome.runtime.sendMessage("showOptions");
        });

        // Summ element
        sumElem = document.createElement('td');
        sumElem.setAttribute('align', 'right')

        row.appendChild(nameElem);
        row.appendChild(sumElem);
        row.appendChild(descElem);
    }
    else{
        sumElem = row.cells[1];
    }

    const devRevenueString = helpers.numberWithCommas(Math.floor(revenue));
    
    sumElem.textContent = `$${devRevenueString}`

    console.log("Steamworks extras: Updated final revenue");
}

const getRevenueMap = () => {
    const out = {};

    const usRevenueShare = usRevenue <= 0 ? 0 : usRevenue / getTotalRevenue(true); 

    console.log(usRevenue);

    out.royaltyAfterSteamShare = getTotalRevenue(false) * 0.7;
    out.royaltyAfterUSShare = out.royaltyAfterSteamShare - (getTotalRevenue(false) * usRevenueShare * settings.usSalesTax/100);
    out.royaltyAfterExtraGrossTake = out.royaltyAfterUSShare - (getTotalRevenue(true) * (settings.grossRoyalties/100));
    out.royaltyAfterExtraNetTake = out.royaltyAfterExtraGrossTake - (out.royaltyAfterExtraGrossTake * (settings.netRoyalties/100));
    out.revenueAfterOtherRoyalties = out.royaltyAfterExtraNetTake - (out.royaltyAfterExtraNetTake * (settings.otherRoyalties/100));
    out.revenueAfterTax = out.revenueAfterOtherRoyalties - (out.revenueAfterOtherRoyalties * (settings.localTax/100));
    out.finalRevenue = out.revenueAfterTax - (out.revenueAfterTax * (settings.royaltiesAfterTax/100));

    return out;
}

const updateSummaryRows = () => {
    const {royaltyAfterSteamShare,
    royaltyAfterUSShare,
    royaltyAfterExtraGrossTake,
    royaltyAfterExtraNetTake,
    revenueAfterOtherRoyalties,
    revenueAfterTax,
    finalRevenue} = getRevenueMap();

    updateFinalRevenueRow(finalRevenue, 2);

    updateSummaryRowUnderExtend(3, "Revenue after Steam share", "(Net revenue * 0.7)", () => {return royaltyAfterSteamShare});
    updateSummaryRowUnderExtend(4, "Revenue after US share", `Revenue after tax (${settings.usSalesTax}%) that is deducted from US sales.`, () => {return royaltyAfterUSShare});
    updateSummaryRowUnderExtend(5, "Revenue after Gross royalties", `Revenue after other royalties (${settings.grossRoyalties}%) you pay from Gross.`, () => {return royaltyAfterExtraGrossTake});
    updateSummaryRowUnderExtend(6, "Revenue after Net royalties", `Revenue after royalties you pay after receiving Net and paying gross royalties. (${settings.netRoyalties}%)`, () => {return royaltyAfterExtraNetTake});
    updateSummaryRowUnderExtend(7, "Revenue after Other royalties", `Revenue after any other payments (${settings.otherRoyalties}%) you make from what's left but before your local taxes`, () => {return revenueAfterOtherRoyalties});
    updateSummaryRowUnderExtend(8, "Revenue after local tax", `Revenue after your local income tax (${settings.localTax}%)`, () => {return revenueAfterTax});
    updateSummaryRowUnderExtend(9, "Final developer revenue", `Final revenue after extra payments (${settings.royaltiesAfterTax}%) after taxes.`, () => {return finalRevenue});
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