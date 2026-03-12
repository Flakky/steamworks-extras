import { getBrowser } from '../shared/browser';
import { defaultSettings } from '../data/defaultsettings';
import { createStatusBlock, startUpdateStatus } from '../shared/statusblock';
import { getDataFromStorage, sendMessageAsync } from '../scripts/helpers';
import { BackgroundMessageType, GetDataType } from '../shared/types/background_requests';

const initSettings = () => {
    getBrowser().storage.local.get(Object.keys(defaultSettings), (result: Record<string, any>) => {
        (document.getElementById('us_sales_tax') as HTMLInputElement).value = result.usSalesTax || defaultSettings.usSalesTax;
        (document.getElementById('gross_royalties') as HTMLInputElement).value = result.grossRoyalties || defaultSettings.grossRoyalties;
        (document.getElementById('net_royalties') as HTMLInputElement).value = result.netRoyalties || defaultSettings.netRoyalties;
        (document.getElementById('other_royalties') as HTMLInputElement).value = result.otherRoyalties || defaultSettings.otherRoyalties;
        (document.getElementById('local_tax') as HTMLInputElement).value = result.localTax || defaultSettings.localTax;
        (document.getElementById('extra_royalties_after_tax') as HTMLInputElement).value = result.royaltiesAfterTax || defaultSettings.royaltiesAfterTax;
        (document.getElementById('show_zero_revenues') as HTMLInputElement).checked = result.showZeroRevenues || defaultSettings.showZeroRevenues;
        (document.getElementById('show_percentages') as HTMLInputElement).checked = result.showPercentages || defaultSettings.showPercentages;
        (document.getElementById('chart_max_breakdown') as HTMLInputElement).value = result.chartMaxBreakdown || defaultSettings.chartMaxBreakdown;
        (document.getElementById('update_period') as HTMLInputElement).value = result.statsUpdateInterval || defaultSettings.statsUpdateInterval;
        (document.getElementById('requests_period') as HTMLInputElement).value = result.requestsMinPeriod || defaultSettings.requestsMinPeriod;

        // Handle ignored AppIDs - convert array to comma-separated string for display
        const ignoredAppIDs = result.ignoredAppIDs || defaultSettings.ignoredAppIDs;
        (document.getElementById('ignored_app_ids') as HTMLTextAreaElement).value = ignoredAppIDs.join(', ');
    });

    (document.getElementById('save') as HTMLButtonElement).addEventListener('click', saveSettings);
    (document.getElementById('clear_cache') as HTMLButtonElement).addEventListener('click', clearCacheData);
    (document.getElementById('update_data') as HTMLButtonElement).addEventListener('click', updateData);
    generateCacheTable();
    updateLastUpdateTime();
    initVersion();

    createStatusBlock();
    startUpdateStatus();
}

const clearSettings = () => {
    getBrowser().storage.local.clear();
}

const saveSettings = () => {
    let result: Record<string, any> = {};
    result['usSalesTax'] = (document.getElementById('us_sales_tax') as HTMLInputElement).valueAsNumber;
    result['grossRoyalties'] = (document.getElementById('gross_royalties') as HTMLInputElement).valueAsNumber;
    result['netRoyalties'] = (document.getElementById('net_royalties') as HTMLInputElement).valueAsNumber;
    result['otherRoyalties'] = (document.getElementById('other_royalties') as HTMLInputElement).valueAsNumber;
    result['localTax'] = (document.getElementById('local_tax') as HTMLInputElement).valueAsNumber;
    result['royaltiesAfterTax'] = (document.getElementById('extra_royalties_after_tax') as HTMLInputElement).valueAsNumber;
    result['showZeroRevenues'] = (document.getElementById('show_zero_revenues') as HTMLInputElement).checked;
    result['showPercentages'] = (document.getElementById('show_percentages') as HTMLInputElement).checked;
    result['chartMaxBreakdown'] = (document.getElementById('chart_max_breakdown') as HTMLInputElement).valueAsNumber;
    result['statsUpdateInterval'] = (document.getElementById('update_period') as HTMLInputElement).valueAsNumber;
    result['requestsMinPeriod'] = (document.getElementById('requests_period') as HTMLInputElement).valueAsNumber;
    result['ignoredAppIDs'] = (document.getElementById('ignored_app_ids') as HTMLTextAreaElement).value.split(',').map(id => id.trim()).filter(id => id.length > 0);

    getBrowser().storage.local.set(result, () => {
        alert('Settings saved!');
    });
}

const generateCacheTable = async () => {
    const data = await getBrowser().storage.local.get('appIDs');
    const appIDs = data.appIDs || [];

    // Filter out ignored AppIDs for cache table
    const ignoredData = await getBrowser().storage.local.get('ignoredAppIDs');
    const ignoredAppIDs = ignoredData.ignoredAppIDs || [];
    const filteredAppIDs = appIDs.filter((appID: string) => !ignoredAppIDs.includes(appID));

    const table = document.querySelector('#cache table tbody') as HTMLTableSectionElement;
    if (!table) {
        throw new Error('Cache table not found');
    }

    const pagesCreationDateResult = await getBrowser().storage.local.get("pagesCreationDate");
    const pagesCreationDate = pagesCreationDateResult.pagesCreationDate;

    const createDownloadLink = async (appID: string, type: GetDataType) => {

        const pageCreationDate = pagesCreationDate[appID] || new Date(2014, 0, 0);

        const startDate = pageCreationDate;
        const endDate = new Date();

        let result = await getDataFromStorage(type, appID, startDate, endDate, true);

        const keys = new Set<string>();
        result.forEach((item: Record<string, any>) => {
            Object.keys(item).forEach(key => keys.add(key));
        });
        const headerRow = Array.from(keys).join(',');

        const csvContent = result.map((item: Record<string, any>) => {
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

    filteredAppIDs.forEach(async (appID: string, index: number) => {
        const row = document.createElement('tr');

        const cell = document.createElement('td');
        cell.textContent = appID;
        cell.classList.add('table_label');
        row.appendChild(cell);

        const addLinkCell = (type: string) => {
            const cell = document.createElement('td');
            cell.id = `cache_cell_${appID}_${type}`;
            cell.classList.add('description');
            cell.innerHTML = '<div class="loader"></div>';
            row.appendChild(cell);
        }

        const downloadAndInsertLink = async (type: GetDataType) => {
            const link = await createDownloadLink(appID, type);
            const cell = document.getElementById(`cache_cell_${appID}_${type}`) as HTMLElement;
            cell.innerHTML = '';
            cell.appendChild(link);
        }

        addLinkCell("Sales");
        addLinkCell("Wishlists");
        addLinkCell("WishlistsRegional");
        addLinkCell("Reviews");
        addLinkCell("Traffic");

        downloadAndInsertLink(GetDataType.Sales);
        downloadAndInsertLink(GetDataType.Wishlists);
        downloadAndInsertLink(GetDataType.WishlistsRegional);
        downloadAndInsertLink(GetDataType.Reviews);
        downloadAndInsertLink(GetDataType.Traffic);

        table.appendChild(row);
    });
}

const updateData = async () => {
    await sendMessageAsync({ request: BackgroundMessageType.updateStats, payload: undefined });

    updateLastUpdateTime();
}

const clearCacheData = () => {
    //clearAllData();
}

const updateLastUpdateTime = async () => {
    const lastUpdateTime = await getBrowser().storage.local.get('lastUpdate');
    (document.getElementById('last_update_time') as HTMLElement).textContent = `Last update: ${lastUpdateTime.lastUpdate ? new Date(lastUpdateTime.lastUpdate).toLocaleString() : 'never'}`;
}

const initVersion = () => {
    const version = getBrowser().runtime.getManifest().version;
    (document.getElementById('ext_version') as HTMLElement).textContent = version;
}

document.addEventListener('DOMContentLoaded', initSettings);
