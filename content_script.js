var numberWithCommas = (x) => {
    return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ","); // https://stackoverflow.com/questions/2901102/how-to-format-a-number-with-commas-as-thousands-separators
}

var addSummaryNetRow = () => {
    var table = document.querySelector('.lifetimeSummaryCtn table');
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
    descElem.textContent = '(Net revenue for the developer. Net * 0.7)'
    nameElem.textContent = 'Lifetime Steam revenue (developer net)';
    sumElem.textContent = `$${devRevenueString}`
    sumElem.setAttribute('align', 'right')
    newRow.appendChild(nameElem);
    newRow.appendChild(sumElem);
    newRow.appendChild(descElem);

    console.log("Steamworks Dev Net: Added summary net");
}

var addSalesNetRow = () => {
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

    var salesTable = salesDiv.getElementsByTagName('table')[0];

    var rows = salesTable.rows;
    console.log(rows);
    var revenueCell = rows[13].cells[2];
    var revenue = revenueCell.textContent;
    revenue = revenue.replace('$', '');
    revenue = revenue.replace(',', '');
    console.log(Number(revenue))
    var devRevenue = Number(revenue * 0.51);
    var devRevenueString = numberWithCommas(Math.floor(devRevenue));

    var newRow = salesTable.insertRow(14); // Insert after net

    var nameElem = document.createElement('td');
    var sumElem = document.createElement('td');
    var spacerElem = document.createElement('td');
    nameElem.innerHTML = '<b>Developer net revenue</b>';
    sumElem.textContent = `$${devRevenueString}`
    sumElem.setAttribute('align', 'right')
    newRow.appendChild(nameElem);
    newRow.appendChild(spacerElem);
    newRow.appendChild(sumElem);

    console.log("Steamworks Dev Net: Added sales for date range net");
}

console.log("Steamworks Dev Net: Begin");

addSummaryNetRow();
addSalesNetRow();