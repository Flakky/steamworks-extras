import { setFlexContentBlockContent } from "../pageblocks";
import { WishlistRegionSelection, WishlistsData, WishlistChart, WishlistTableTypeSelection, WishlistTableType, WishlistTableData, WishlistChartType } from "./types";
import { updateWishlistChart } from "./wishlist_chart";
import { DateRange, getDateRangeArray } from "../../shared/types/daterange";
import { GameWishlists } from "../../shared/types/wishlists";

export const createCountryTable = (doc: Document) => {
    const wishlistsTableContainer = doc.createElement('div');
    wishlistsTableContainer.id = 'extras_wishlists_table_container';

    //Header
    const headers = ['', 'Data', 'Adds', 'Deletes', 'Gifts', 'Activations'];

    const headerTable = doc.createElement('table');
    headerTable.id = 'extras_wishlists_table_header';

    const HeaderThead = doc.createElement('thead');

    headers.forEach(header => {
        const th = doc.createElement('th');
        th.textContent = header;
        HeaderThead.appendChild(th);
    });

    headerTable.appendChild(HeaderThead);

    const scrollableBlock = doc.createElement('div');
    scrollableBlock.id = 'extras_wishlists_table_scrollable';

    // Table
    const table = doc.createElement('table');
    table.id = 'extras_wishlists_table';

    const tbody = doc.createElement('tbody');

    table.appendChild(tbody);

    scrollableBlock.appendChild(table);

    wishlistsTableContainer.appendChild(headerTable);
    wishlistsTableContainer.appendChild(scrollableBlock);

    setFlexContentBlockContent(doc, 'extras_country_table_block', wishlistsTableContainer);
}

export const addTableSelect = (doc: Document, wishlistChart: WishlistChart, wishlistsData: WishlistsData, dateRange: DateRange, wishlistTableTypeSelection: WishlistTableTypeSelection, wishlistRegionSelection: WishlistRegionSelection) => {
    const table_container = doc.getElementById('extras_wishlists_table_container');

    if (!table_container) {
        throw new Error('Table container not found');
    }

    const options = Object.values(WishlistTableType).map(type => type);

    const tableSelectBlock = createTableSelect(doc, options, wishlistTableTypeSelection.type, (select) => {
        wishlistTableTypeSelection.type = select.value as WishlistTableType;
        updateCountryTable(doc, wishlistChart, wishlistsData, dateRange, wishlistTableTypeSelection, wishlistRegionSelection);
    });

    table_container.insertBefore(tableSelectBlock, table_container.firstChild);
}

const createTableSelect = (doc: Document, options: string[], defaultValue: string, onSelect: (select: HTMLSelectElement) => void) => {
    const tableSelectContainer = doc.createElement('div');
    const nameElem = doc.createElement("b");
    nameElem.textContent = `View by: `;
    nameElem.classList.add('extras_table_select_name');

    const selectElem = doc.createElement("select");

    options.forEach(option => {
        const optionElement = doc.createElement("option");
        optionElement.value = option;
        optionElement.textContent = option;
        selectElem.appendChild(optionElement);
    });

    selectElem.value = defaultValue;

    selectElem.addEventListener("change", () => { onSelect(selectElem); });

    tableSelectContainer.appendChild(nameElem);
    tableSelectContainer.appendChild(selectElem);

    return tableSelectContainer;
}

export const updateCountryTable = (doc: Document, wishlistChart: WishlistChart, wishlistsData: WishlistsData, dateRange: DateRange, wishlistTableTypeSelection: WishlistTableTypeSelection, wishlistRegionSelection: WishlistRegionSelection) => {
    console.log('Updating wishlist country table');

    const wishlistsTable = doc.getElementById('extras_wishlists_table');

    if (!wishlistsTable) {
        throw new Error('Wishlists table or region table not found');
    }

    const wishlistsTableBody = wishlistsTable.querySelector('tbody');

    if (!wishlistsTableBody) {
        throw new Error('Wishlists table body not found');
    }

    wishlistsTableBody.innerHTML = '';

    const dateRangeArray = getDateRangeArray(dateRange, false, true) as string[];

    if (!wishlistsData.data || wishlistsData.data.length === 0) return;

    const tableData: Record<string, WishlistTableData> = {};

    dateRangeArray.forEach((date: string) => {

        const data = wishlistsData.data.find((item: GameWishlists) => item.date === date);

        if (data) {
            let tableDataItem: WishlistTableData = {
                split: date,
                adds: data.adds,
                deletes: data.deletes,
                gifts: data.gifts,
                activations: data.activations,
            };

            switch (wishlistTableTypeSelection.type) {
                case WishlistTableType.Country:
                case WishlistTableType.Region:
                    const arr = wishlistTableTypeSelection.type === WishlistTableType.Region ? data.regionsData : data.countriesData;

                    for (const [key, item] of Object.entries(arr)) {
                        if (!tableData[key]) {
                            tableData[key] = {
                                split: key,
                                adds: 0,
                                deletes: 0,
                                gifts: 0,
                                activations: 0,
                            };
                        }

                        let existingData = tableData[key];

                        tableData[key] = {
                            split: key,
                            adds: existingData.adds + item.adds,
                            deletes: existingData.deletes + item.deletes,
                            gifts: existingData.gifts + item.gifts,
                            activations: existingData.activations + item.activations,
                        };
                    }
                    break;
                case WishlistTableType.Date:
                default:
                    tableData[date] = tableDataItem;
            }
        }
    });

    console.log("tableData", tableData);

    const sorted = Object.entries(tableData)
        .filter(([split, value]) => value.adds != 0 || value.deletes != 0 || value.gifts != 0 || value.activations != 0)
        .sort((a, b) => {
            if (wishlistTableTypeSelection.type === WishlistTableType.Date) {
                return new Date(b[0]).getTime() - new Date(a[0]).getTime();
            }
            return b[1].adds - a[1].adds;
        });

    sorted.forEach(([split, value]) => {
        const row = doc.createElement('tr');

        const withCheckboox = wishlistTableTypeSelection.type === WishlistTableType.Country || wishlistTableTypeSelection.type === WishlistTableType.Region;

        const checkboxCell = doc.createElement('td');
        row.appendChild(checkboxCell);

        if (withCheckboox) {

            const checkbox = doc.createElement('input');
            checkbox.type = 'checkbox';

            if (wishlistRegionSelection.selectedCountries.includes(split) || wishlistRegionSelection.regions.includes(split)) {
                checkbox.checked = true;
            }

            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    switch (wishlistTableTypeSelection.type) {
                        case WishlistTableType.Country:
                            wishlistRegionSelection.selectedCountries.push(split);
                            break;
                        case WishlistTableType.Region:
                            wishlistRegionSelection.regions.push(split);
                            break;
                        default:
                            break;
                    }
                }
                else {
                    switch (wishlistTableTypeSelection.type) {
                        case WishlistTableType.Country:
                            wishlistRegionSelection.selectedCountries = wishlistRegionSelection.selectedCountries.filter(c => c !== split);
                            break;
                        case WishlistTableType.Region:
                            wishlistRegionSelection.regions = wishlistRegionSelection.regions.filter(r => r !== split);
                            break;
                        default:
                            break;
                    }
                };

                if ((wishlistChart.wishlistChartType === WishlistChartType.Country && wishlistTableTypeSelection.type === WishlistTableType.Country)
                    || (wishlistChart.wishlistChartType === WishlistChartType.Region && wishlistTableTypeSelection.type === WishlistTableType.Region)) {
                    updateWishlistChart(wishlistChart, wishlistsData, dateRange, wishlistRegionSelection);
                }
            });

            checkboxCell.appendChild(checkbox);
        }

        const splitCell = doc.createElement('td');
        splitCell.textContent = split;

        const addsCell = doc.createElement('td');
        addsCell.textContent = value.adds.toString();

        const deletesCell = doc.createElement('td');
        deletesCell.textContent = value.deletes.toString();

        const giftsCell = doc.createElement('td');
        giftsCell.textContent = value.gifts.toString();

        const activationsCell = doc.createElement('td');
        activationsCell.textContent = value.activations.toString();

        row.appendChild(splitCell);
        row.appendChild(addsCell);
        row.appendChild(deletesCell);
        row.appendChild(giftsCell);
        row.appendChild(activationsCell);

        wishlistsTableBody.appendChild(row);
    });
}
