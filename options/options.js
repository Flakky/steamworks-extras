const initSettings = () => {
  chrome.storage.local.get(Object.keys(defaultSettings), (result) => {
    document.getElementById('us_sales_tax').value = result.usSalesTax || defaultSettings.usSalesTax;
    document.getElementById('gross_royalties').value = result.grossRoyalties || defaultSettings.grossRoyalties;
    document.getElementById('net_royalties').value = result.netRoyalties || defaultSettings.netRoyalties;
    document.getElementById('other_royalties').value = result.otherRoyalties || defaultSettings.otherRoyalties;
    document.getElementById('local_tax').value = result.localTax || defaultSettings.localTax;
    document.getElementById('extra_royalties_after_tax').value = result.royaltiesAfterTax || defaultSettings.royaltiesAfterTax;
    document.getElementById('show_zero_revenues').checked = result.showZeroRevenues || defaultSettings.showZeroRevenues;
    document.getElementById('show_percentages').checked = result.showPercentages || defaultSettings.showPercentages;
    document.getElementById('chart_max_breakdown').value = result.chartMaxBreakdown || defaultSettings.chartMaxBreakdown;
    document.getElementById('update_period').value = result.statsUpdateInterval || defaultSettings.statsUpdateInterval;
  });

  document.getElementById('save').addEventListener('click', saveSettings);
  document.getElementById('clear_cache').addEventListener('click', clearCacheData);

  generateCacheTable();
  initVersion();

  createStatusBlock();
  startUpdateStatus();
}

const clearSettings = () => {
  chrome.storage.local.clear();
}

const saveSettings = () => {
  let result = {}
  result.usSalesTax = document.getElementById('us_sales_tax').valueAsNumber;
  result.grossRoyalties = document.getElementById('gross_royalties').valueAsNumber;
  result.netRoyalties = document.getElementById('net_royalties').valueAsNumber;
  result.otherRoyalties = document.getElementById('other_royalties').valueAsNumber;
  result.localTax = document.getElementById('local_tax').valueAsNumber;
  result.royaltiesAfterTax = document.getElementById('extra_royalties_after_tax').valueAsNumber;
  result.showZeroRevenues = document.getElementById('show_zero_revenues').checked;
  result.showPercentages = document.getElementById('show_percentages').checked;
  result.chartMaxBreakdown = document.getElementById('chart_max_breakdown').valueAsNumber;
  result.statsUpdateInterval = document.getElementById('update_period').valueAsNumber;

  chrome.storage.local.set(result, () => {
    alert('Settings saved!');
  });
}

const generateCacheTable = async () => {
  const data = await chrome.storage.local.get('appIDs');
  const appIDs = data.appIDs || [];
  const table = document.querySelector('#cache table tbody');

  const pagesCreationDateResult = await chrome.storage.local.get("pagesCreationDate");
  const pagesCreationDate = pagesCreationDateResult.pagesCreationDate;

  const createDownloadLink = async (appID, type) => {

    const pageCreationDate = pagesCreationDate[appID] || new Date(2014, 0, 0);

    const startDate = pageCreationDate;
    const endDate = new Date();

    let result = await helpers.getDataFromStorage(type, appID, startDate, endDate, true);

    const keys = new Set();
    result.forEach(item => {
      Object.keys(item).forEach(key => keys.add(key));
    });
    const headerRow = Array.from(keys).join(',');

    const csvContent = result.map(item => {
      return Array.from(keys).map(key => {
        let value = String(item[key] || '');
        value = value.replace(/\n/g, '\\\\n'); // Escape new lines
        value = value.replace(/\r/g, '\\\\r'); // Escape carriage returns
        value = value.replace('"', '""'); // Escape double quotes
        return value.includes(',') ? `"${value}"` : value;
      }).join(',');
    }).join('\n');

    const finalContent = `${headerRow}\n${csvContent}`;

    const blob = new Blob([finalContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${appID}-${type}.csv`;
    a.textContent = "Download";
    a.id = `download_${appID}_${type}`;
    //    URL.revokeObjectURL(url);

    return a;
  }

  // Remove all rows except the first one (header row)
  while (table.rows.length > 1) {
    table.deleteRow(1);
  }

  appIDs.forEach(async (appID, index) => {
    const row = document.createElement('tr');

    const cell = document.createElement('td');
    cell.textContent = appID;
    cell.classList.add('table_label');
    row.appendChild(cell);

    const addLinkCell = (type) => {
      const cell = document.createElement('td');
      cell.id = `cache_cell_${appID}_${type}`;
      cell.classList.add('description');
      cell.innerHTML = '<div class="loader"></div>';
      row.appendChild(cell);
    }

    const downloadAndInsertLink = async (type) => {
      const link = await createDownloadLink(appID, type);
      const cell = document.getElementById(`cache_cell_${appID}_${type}`);
      cell.innerHTML = '';
      cell.appendChild(link);
    }

    addLinkCell("Sales");
    addLinkCell("Wishlists");
    addLinkCell("Reviews");
    addLinkCell("Traffic");

    downloadAndInsertLink("Sales");
    downloadAndInsertLink("Wishlists");
    downloadAndInsertLink("Reviews");
    downloadAndInsertLink("Traffic");

    table.appendChild(row);
  });
}

const clearCacheData = () => {
  clearAllData();
}

const initVersion = () => {
  const version = chrome.runtime.getManifest().version;
  document.getElementById('ext_version').textContent = version;
}

document.addEventListener('DOMContentLoaded', initSettings);
