let helpers = {}

helpers.numberWithCommas = (x) => {
    return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ","); // https://stackoverflow.com/questions/2901102/how-to-format-a-number-with-commas-as-thousands-separators
}

helpers.findElementByText = (tag, text, doc = undefined) => {
    const elements = doc ? doc.getElementsByTagName(tag) : document.getElementsByTagName(tag);

    for (let element of elements) {
        if (element.textContent.trim() === text) {
            return element;
        }
    }

    return undefined;
}

helpers.findParentByTag = (element, tagName) => {

    tagName = tagName.toUpperCase();

    while (element && element.parentNode) {
        element = element.parentNode;
        if (element.tagName === tagName) {
            return element;
        }
    }

    return undefined;
}

helpers.getCountryRevenue = async (appID, country) => {
    const response = await fetch(`https://partner.steampowered.com/region/?dateStart=2010-01-01&appID=${appID}`);
    if (!response.ok) throw new Error('Network response was not ok');

    const htmlText = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');

    const element = helpers.findElementByText('a', country, doc);
    if (!element) throw new Error(`Was not able to find element for country ${country}`);

    const countryRow = helpers.findParentByTag(element, 'tr');

    let revenue = countryRow.cells[4].textContent;
    revenue = revenue.replace('$', '');
    revenue = revenue.replace(',', '');

    return revenue;
}
