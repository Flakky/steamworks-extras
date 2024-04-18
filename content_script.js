const numberWithCommas = (x) => {
    return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ","); // https://stackoverflow.com/questions/2901102/how-to-format-a-number-with-commas-as-thousands-separators
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

const addSummaryNetRow = () => {
    const table = getSummaryTable();
    if (!table) return;

    const rows = table.rows;
    const netRevenueCell = rows[1].cells[1];

    let netRevenue = netRevenueCell.textContent;
    netRevenue = netRevenue.replace('$', '');
    netRevenue = netRevenue.replace(',', '');
    const devRevenueString = numberWithCommas(Math.floor(netRevenue * 0.7));

    const newRow = table.insertRow(2); // Insert after net

    const nameElem = document.createElement('td');
    const sumElem = document.createElement('td');
    const descElem = document.createElement('td');
    descElem.textContent = '(Net revenue - Steam revenue share)'
    nameElem.textContent = 'Lifetime developer revenue share';
    sumElem.textContent = `$${devRevenueString}`
    sumElem.setAttribute('align', 'right')
    newRow.appendChild(nameElem);
    newRow.appendChild(sumElem);
    newRow.appendChild(descElem);

    console.log("Steamworks extras: Added summary net");
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
    const devRevenueString = numberWithCommas(Math.floor(revenue * 0.53));

    const newRow = salesTable.insertRow(revenueRowIndex+1); // Insert after total revenue

    const nameElem = document.createElement('td');
    const sumElem = document.createElement('td');
    const spacerElem = document.createElement('td');
    nameElem.innerHTML = '<b>Developer revenue share</b>';
    sumElem.innerHTML = `<b>~$${devRevenueString}</b>`;
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
    const summaryTable = getSummaryTable();
    if (!summaryTable) return;

    const rows = summaryTable.rows;
    const refundCell = rows[7].cells[2];

    const packageId = getPackageId();

    refundCell.innerHTML += ` (<a href="https://partner.steampowered.com/package/refunds/${packageId}/">Refund data</a>)`;

    console.log("Steamworks extras: Added refund data link");
}

console.log("Steamworks extras: Begin");

addSummaryNetRow();
addSalesNetRow();
addRefundDataLink();
