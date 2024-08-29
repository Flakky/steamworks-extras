const initSettings = () => {
  chrome.storage.local.get(['usSalesTax', 'usSalesTax', 'grossRoyalties', 'netRoyalties', 'otherRoyalties', 'localTax', 'royaltiesAfterTax', 'showZeroRevenues'], (result) => {
    document.getElementById('us_sales_tax').value = result.usSalesTax || 0;
    document.getElementById('gross_royalties').value = result.grossRoyalties || 0;
    document.getElementById('net_royalties').value = result.netRoyalties || 0;
    document.getElementById('other_royalties').value = result.otherRoyalties || 0;
    document.getElementById('local_tax').value = result.localTax || 0;
    document.getElementById('extra_royalties_after_tax').value = result.royaltiesAfterTax || 0;
    document.getElementById('show_zero_revenues').checked = result.showZeroRevenues || false;
  });

  document.getElementById('save').addEventListener('click', saveSettings);

  initVersion();
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

  chrome.storage.local.set(result, () => {
    alert('Settings saved!');
  });
}

const initVersion = () => {
  const version = chrome.runtime.getManifest().version;
  document.getElementById('ext_version').textContent = version;
}

document.addEventListener('DOMContentLoaded', initSettings);
