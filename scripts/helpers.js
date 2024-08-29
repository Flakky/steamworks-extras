let helpers = {}

helpers.numberWithCommas = (x) => {
  return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ","); // https://stackoverflow.com/questions/2901102/how-to-format-a-number-with-commas-as-thousands-separators
}

helpers.isStringEmpty = (str) => {
  return str === null || str === undefined || str.trim() === '';
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

helpers.getCountryRevenue = async (appID, country, dateStart, dateEnd) => {

  const startDate = dateStart || new Date(2010, 0, 1);
  const endDate = dateEnd || new Date();

  const formattedStartDate = startDate.toISOString().split('T')[0];
  const formattedEndDate = endDate.toISOString().split('T')[0];

  const countryRevenueURL = `https://partner.steampowered.com/region/?dateStart=${formattedStartDate}&dateEnd=${formattedEndDate}&appID=${appID}`;
  console.log(countryRevenueURL);

  const response = await fetch(countryRevenueURL);
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

  console.log(`Steamworks extras: ${country} revenue share in ${formattedStartDate}-${formattedEndDate}: ${revenue}`);

  return revenue;
}
