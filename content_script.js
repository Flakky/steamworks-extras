var numberWithCommas = (x) => {
    return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ","); // https://stackoverflow.com/questions/2901102/how-to-format-a-number-with-commas-as-thousands-separators
}

var addSummaryNetRow = () => {
    var table = getSummaryTable();
    if (!table) return; // If no table is found, exit the function

    console.log(table);

    var rows = table.rows;
    var netRevenueCell = rows[1].cells[1];
    var netRevenue = netRevenueCell.textContent;
    netRevenue = netRevenue.replace('$', '');
    netRevenue = netRevenue.replace(',', '');
    console.log(Number(netRevenue))
    var devRevenue = Number(netRevenue * 0.7);
    var devRevenueString = numberWithCommas(Math.floor(devRevenue));

    var newRow = table.insertRow(2); // Insert after net

    var nameElem = document.createElement('td');
    var sumElem = document.createElement('td');
    var descElem = document.createElement('td');
    descElem.textContent = '(Net revenue - Steam revenue share)'
    nameElem.textContent = 'Lifetime developer revenue share';
    sumElem.textContent = `$${devRevenueString}`
    sumElem.setAttribute('align', 'right')
    newRow.appendChild(nameElem);
    newRow.appendChild(sumElem);
    newRow.appendChild(descElem);

    console.log("Steamworks Dev Net: Added summary net");
}

var addSalesNetRow = () => {
    var salesTable = getSalesTable();

    var rows = salesTable.rows;

    console.log(rows);

    let revenueRow = undefined;
    let revenueRowIndex = -1;
    
    for(const row of rows) {
        revenueRowIndex++;
        const rowName = row.getElementsByTagName('td')[0];

        console.log(rowName.textContent);

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

    var revenueCell = revenueRow.cells[2];
    var revenue = revenueCell.textContent;
    revenue = revenue.replace('$', '');
    revenue = revenue.replace(',', '');
    console.log(Number(revenue))
    var devRevenue = Number(revenue * 0.53);
    var devRevenueString = numberWithCommas(Math.floor(devRevenue));

    var newRow = salesTable.insertRow(revenueRowIndex+1); // Insert after total revenue

    var nameElem = document.createElement('td');
    var sumElem = document.createElement('td');
    var spacerElem = document.createElement('td');
    nameElem.innerHTML = '<b>Developer revenue share</b>';
    sumElem.innerHTML = `<b>~$${devRevenueString}</b>`;
    sumElem.setAttribute('align', 'right');
    
    newRow.appendChild(nameElem);
    newRow.appendChild(spacerElem);
    newRow.appendChild(sumElem);

    for(let i = 3; i<revenueRow.cells.length;i++){
        var cell = document.createElement('td');
        newRow.appendChild(cell);
    }

    console.log("Steamworks Dev Net: Added sales for date range net");
}

const getSummaryTable = () => {
    return document.querySelector('.lifetimeSummaryCtn table');
}

var getSalesTable = () => {
    var parentElement = document.getElementById('gameDataLeft');

    var childElements = parentElement.children;
    var divs = [];

    // Filter out only those children that are divs
    for (var i = 0; i < childElements.length; i++) {
        if (childElements[i].tagName === 'DIV') {
            divs.push(childElements[i]);
        }
    }

    var salesDiv = divs[3];

    console.log(salesDiv);

    return salesDiv.getElementsByTagName('table')[0];
}

var getPackageId = () => {
    const salesTable = getSalesTable();

    const rows = salesTable.rows;

    const packageRow = rows[2];

    const packageLink = packageRow.getElementsByTagName('a')[0];

    const id = packageLink.href.match(/\/package\/details\/(\d+)/)[1];

    return id;
}

var addRefundDataLink = () => {
    const summaryTable = getSummaryTable();
    if (!summaryTable) return; // If no table is found, exit the function

    console.log(summaryTable);

    var rows = summaryTable.rows;
    var refundCell = rows[7].cells[2];

    const packageId = getPackageId();
    console.log(`Package id: ${packageId}`);

    refundCell.innerHTML += ` (<a href="https://partner.steampowered.com/package/refunds/${packageId}/">Refund data</a>)`;
}

console.log("Steamworks Dev Net: Begin");

addSummaryNetRow();
addSalesNetRow();
addRefundDataLink();