let salesAllTime = undefined;
let appID = undefined;
let settings = undefined;
let chartColors = undefined;
let refundStats = {};

const init = async () => {
    console.log("Steamworks extras: Init refunds page");

    settings = await getBrowser().storage.local.get(defaultSettings);

    readChartColors();

    createCustomContentBlock();
    moveGameTitle();

    await requestAppID();

    createToolbarBlock(getAppID());
    addStatusBlockToPage();
    hideOriginalMainBlock();
    
    createRefundsStatsBlock();
    createRefundsTableBlock();
    createRefundsChartBlock();
    createReasonsTableBlock();

    await fetchAllRefundStats();

    createRefundsStats();
    createReasonsTable();

    await requestSales();

    createRefundsTable();
    createRefundsChart();
};

const requestAppID = async () => {
    const packageID = getPackageID();

    const packageIDsMap = await helpers.sendMessageAsync({ request: 'getPackageIDs' });
    console.log('Steamworks extras: Package IDs map: ', packageIDsMap);

    let foundAppID = undefined;
    for (const [appId, packageIds] of Object.entries(packageIDsMap)) {
        if (Array.isArray(packageIds) && packageIds.includes(packageID)) {
            foundAppID = appId;
            break;
        }
    }

    if (!foundAppID) {
        console.error('Steamworks extras: App ID not found');
        return;
    }

    appID = foundAppID;

    console.log('Steamworks extras: App ID: ', appID);
}

const getPackageID = () => {
    const url = window.location.href;
    try {
        const match = url.match(/\/package\/refunds\/(\d+)/);
        if (match && match[1]) {
            return match[1];
        }
    } catch (e) {
        console.error('Failed to extract package ID from URL:', e);
    }
    return undefined;
};

const getAppID = () => {
    return appID;
};

const requestSales = async () => {

    console.log('Steamworks extras: Requesting sales data...');

    salesAllTime = await helpers.sendMessageAsync({ request: 'getData', type: 'Sales', appId: getAppID() });
    console.debug('Steamworks extras: Sales data received: ', salesAllTime);
}

const readChartColors = () => {
    const jsonFilePath = getBrowser().runtime.getURL('data/chartcolors.json');

    console.log(jsonFilePath);

    fetch(jsonFilePath).then(response => {
        if (response.ok) {
        response.json().then(json => {
            console.log('Chart colors loaded: ', json);
            chartColors = json;
        });
        }
        else {
        console.error('Failed to load chart colors');
        }
    });
}

const fetchAllRefundStats = async () => {
    await Promise.all([
        fetchRefundStats(0),
        fetchRefundStats(1),
        fetchRefundStats(2)
    ]);
}

const fetchRefundStats = async (range) => {
    const url = `https://partner.steampowered.com/package/refunds/${getPackageID()}/?range=${range}`;
    
    const response = await helpers.sendMessageAsync({ 
    request: 'parseDOM', 
    url: url, 
    type: 'RefundStats' 
    });

    console.log('Steamworks extras: Refund stats response: ', response);
    
    if (response && response.units && response.grossUnits) {
        refundStats[range] = response;
    } else {
        throw new Error(`Failed to parse refund stats for range ${range}:`, response);
    }
  };

const createRefundsStatsBlock = () => {
    createFlexContentBlock('Refunds stats', 'extras_refunds_stats_block');
};

const createRefundsStats = async () => {
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
    th.textContent = header.text;
    if (header.tooltip) {
      th.innerHTML += ' <a href="#" class="tooltip">(?)<span>' + header.tooltip + '</span></a>';
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

  const addStatsRow = (label, data) => {
    const row = tbody.insertRow();
    
    const periodCell = row.insertCell();
    periodCell.textContent = label;

    const addValueCell = (value, cell) => {
        cell.textContent = value;
    }

    const addPercentageCell = (value, cell) => {
        cell.textContent = value.toFixed(2) + '%';
        
        const { r, g, b } = getRefundPercentageColor(value);
        cell.style.color = `rgb(${r},${g},${b})`;
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

  setFlexContentBlockContent('extras_refunds_stats_block', statsBlockElem);
};

const getRefundPercentageColor = (percentage) => {
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