import { getCurrentURL, getDateRangeFromURL } from "../site";
import { setFlexContentBlockContent } from "../pageblocks";
import { WishlistRegionSelection, WishlistsData, WishlistChartActionsType, WishlistChart } from "./types";
import { updateWishlistChart } from "./wishlist_chart";
import { DateRange, getDateRangeArray } from "../../shared/types/daterange";

export const createCountryTable = (doc: Document) => {

    const countryTableContainer = doc.createElement('div');

    const scrollableBlock = doc.createElement('div');

    // Table
    const table = doc.createElement('table');
    table.id = 'extra_country_table';

    const thead = doc.createElement('thead');
    const tbody = doc.createElement('tbody');

    const headers = ['Chart', 'Country', 'Wishlists'];

    headers.forEach(header => {
        const th = doc.createElement('th');
        th.textContent = header;
        thead.appendChild(th);
    });

    table.appendChild(thead);
    table.appendChild(tbody);

    // Create second table for regions
    const regionsTable = doc.createElement('table');
    regionsTable.id = 'extra_regions_table';

    const regionsThead = doc.createElement('thead');
    const regionsTbody = doc.createElement('tbody');

    const regionsHeaders = ['Regions', 'Wishlists'];

    regionsHeaders.forEach(header => {
        const th = doc.createElement('th');
        th.textContent = header;
        regionsThead.appendChild(th);
    });

    regionsTable.appendChild(regionsThead);
    regionsTable.appendChild(regionsTbody);

    scrollableBlock.appendChild(table);
    scrollableBlock.appendChild(regionsTable);

    countryTableContainer.appendChild(scrollableBlock);
    setFlexContentBlockContent(doc, 'extra_country_table_block', countryTableContainer);
}

export const updateCountryTable = (doc: Document, wishlistChart: WishlistChart, wishlistsData: WishlistsData, dateRange: DateRange, wishlistRegionSelection: WishlistRegionSelection, chartMaxBreakdown: number) => {
    console.log('Updating wishlist country table');

    const countryTable = doc.getElementById('extra_country_table');
    const regionTable = doc.getElementById('extra_regions_table');

    if (!countryTable || !regionTable) {
        throw new Error('Country table or region table not found');
    }

    const countryTableBody = countryTable.querySelector('tbody');
    const regionTableBody = regionTable.querySelector('tbody');

    if (!countryTableBody || !regionTableBody) {
        throw new Error('Country table body or region table body not found');
    }

    countryTableBody.innerHTML = '';
    regionTableBody.innerHTML = '';

    const dateRangeArray = getDateRangeArray(dateRange, false, true) as string[];

    if (!wishlistsData.data || wishlistsData.data.length === 0) return;

    const countryData: Record<string, number> = {};

    dateRangeArray.forEach(date => {

        const data = wishlistsData.data.find(item => item.date === date);

        if (data) {
            for (const country in data.regionalData) {
                if (Object.values(WishlistChartActionsType).includes(country as WishlistChartActionsType)) {
                    continue;
                }

                if (!countryData[country]) {
                    countryData[country] = 0;
                }

                countryData[country] += data.regionalData[country].adds;
            }
        }
    });

    const sortedCountries = Object.entries(countryData)
        .filter(([country, value]) => value != 0)
        .sort((a, b) => b[1] - a[1]);

    sortedCountries.forEach(([country, value]) => {
        const row = doc.createElement('tr');

        const isRegion = wishlistRegionSelection.regions.includes(country);

        if (!isRegion) {
            const checkboxCell = doc.createElement('td');
            const checkbox = doc.createElement('input');
            checkbox.type = 'checkbox';

            if (countryTableBody.children.length < chartMaxBreakdown) {
                checkbox.checked = true;
                wishlistRegionSelection.selectedCountries.push(country);
            }

            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    wishlistRegionSelection.selectedCountries.push(country);
                }
                else {
                    wishlistRegionSelection.selectedCountries.filter(c => c !== country);
                }

                if (wishlistChart.wishlistChartType === 'Country') updateWishlistChart(wishlistChart, wishlistsData, dateRange, wishlistRegionSelection);
            });

            checkboxCell.appendChild(checkbox);
            row.appendChild(checkboxCell);
        }

        const countryCell = doc.createElement('td');
        countryCell.textContent = country;

        const valueCell = doc.createElement('td');
        valueCell.textContent = value.toString();

        row.appendChild(countryCell);
        row.appendChild(valueCell);

        const body = isRegion ? regionTableBody : countryTableBody;
        body.appendChild(row);
    });
}
