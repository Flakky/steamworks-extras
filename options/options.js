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
  });

  document.getElementById('save').addEventListener('click', saveSettings);

  initVersion();
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

  chrome.storage.local.set(result, () => {
    alert('Settings saved!');
  });
}

const initVersion = () => {
  const version = chrome.runtime.getManifest().version;
  document.getElementById('ext_version').textContent = version;
}

document.addEventListener('DOMContentLoaded', initSettings);
