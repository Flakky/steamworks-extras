import { TrafficCategorySelection, TrafficCategorySubcategory } from "./types";

export const addTableCheckboxes = (doc: Document, categorySelection: TrafficCategorySelection, updateTrafficCategoryCallback: () => void) => {
    const table = doc.querySelector('.breakdownTable');

    if (!table) {
        throw new Error('Table for checkboxesnot found');
    }

    const firstRowElem = table.children[0];

    const newHeaderCell = doc.createElement('div');
    newHeaderCell.classList.add('th');
    newHeaderCell.textContent = 'Show on chart';

    firstRowElem.insertBefore(newHeaderCell, firstRowElem.children[0]);

    const addCheckbox = (rowElem: Element, id: string, checkedByDefault: boolean) => {
        const checkboxContainerElem = doc.createElement('div');
        checkboxContainerElem.classList.add('td');
        const checkbox = doc.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.classList.add('extra_chart_category_checkbox');

        checkboxContainerElem.appendChild(checkbox);

        checkbox.id = id;
        checkbox.checked = checkedByDefault;

        checkbox.addEventListener('click', (event) => {
            // Prevent category spoiler to toggle
            event.stopPropagation();
        });

        checkbox.addEventListener('change', (event: Event) => {
            writeSelectedChartCategories(doc, categorySelection);
            updateTrafficCategoryCallback();
        });

        rowElem.insertBefore(checkboxContainerElem, rowElem.firstChild);
    }

    let categoryIndex = 0;
    let category = '';

    for (const elem of Array.from(table.children)) {
        if (!elem) continue;

        const nameElem = elem.querySelector('strong');
        if (nameElem === undefined || nameElem === null) continue;
        const name = nameElem.textContent;

        if (elem.classList.contains('page_stats')) {
            category = name;
            addCheckbox(elem, category, categoryIndex < 5);
            categoryIndex++;
        }
        else if (elem.classList.contains('feature_stats')) {
            addCheckbox(elem, `${category}__${name}`, false);
        }
    }
}

export const updateSelectedChartCategories = (doc: Document, categorySelection: TrafficCategorySelection) => {
    const checkboxes = doc.querySelectorAll('.extra_chart_category_checkbox');

    for (const checkbox of Array.from(checkboxes as NodeListOf<HTMLInputElement>)) {

        const checkboxIDSplit = checkbox.id.split('__');

        const category = checkboxIDSplit[0];

        if (checkboxIDSplit.length === 1) {
            checkbox.checked = categorySelection.categories.includes(category);
        }
        else {
            const subCategory = checkboxIDSplit[1];
            checkbox.checked = categorySelection.subcategories.some(
                (subcategory: TrafficCategorySubcategory) => {
                    return subcategory.category === category && subcategory.subCategory === subCategory;
                });
        }
    }
}

const writeSelectedChartCategories = (doc: Document, categorySelection: TrafficCategorySelection) => {
    const checkboxes = doc.querySelectorAll('.extra_chart_category_checkbox') as NodeListOf<HTMLInputElement>;

    categorySelection.categories = [];
    categorySelection.subcategories = [];

    for (const checkbox of Array.from(checkboxes)) {
        console.log(checkbox.checked);

        if (!checkbox.checked) continue;

        const checkboxIDSplit = checkbox.id.split('__');

        if (checkboxIDSplit.length === 1) {
            categorySelection.categories.push(checkboxIDSplit[0]);
        }
        else {
            categorySelection.subcategories.push({ category: checkboxIDSplit[0], subCategory: checkboxIDSplit[1] });
        }
    }

    console.debug('Category selection: ', categorySelection);

    return categorySelection;
}

export const getTopCategories = (doc: Document, numberOfCategories: number): string[] => {
    const categoryCounts: Record<string, number> = {};

    const table = doc.querySelector('.breakdownTable');
    if (!table) {
        return [];
    }

    for (const elem of Array.from(table.children)) {
        if (!elem) continue;

        const nameElem = elem.querySelector('strong');
        if (nameElem === undefined || nameElem === null) continue;
        const name = nameElem.textContent;

        if (elem.classList.contains('page_stats')) {
            if (!categoryCounts[name]) {
                categoryCounts[name] = 0;
            }
            categoryCounts[name]++;
        }
    }

    const sortedCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, numberOfCategories)
        .map(entry => entry[0]);

    return sortedCategories;
}

export const getExternalWebsiteSubcategories = (doc: Document): string[] => {
    const subcategories = [];
    const table = doc.querySelector('.breakdownTable');

    if (!table) {
        return [];
    }

    let isExternalWebsite = false;

    for (const elem of Array.from(table.children)) {
        if (!elem) continue;

        const nameElem = elem.querySelector('strong');
        if (nameElem === undefined || nameElem === null) continue;
        const name = nameElem.textContent;

        if (elem.classList.contains('page_stats')) {
            isExternalWebsite = name === 'External Website';
        } else if (isExternalWebsite && elem.classList.contains('feature_stats')) {
            subcategories.push(name);
        } else if (elem.classList.contains('page_stats')) {
            isExternalWebsite = false;
        }
    }

    return subcategories;
}
