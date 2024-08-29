let helpers = {}

/**
 * Returns number splitted with commas as thousands separators
 *
 * @param {number} x - Number to format
 * @returns {string} - formatted string of given number.
 *
 * @example
 * // returns 123,456,789
 * numberWithCommas(123456789);
 */
helpers.numberWithCommas = (x) => {
  // https://stackoverflow.com/questions/2901102/how-to-format-a-number-with-commas-as-thousands-separators
  return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Checks if given string is empty
 *
 * @param {string} x - String to check
 * @returns {boolean} - True if string is empty, undefined or null
 *
 * @example
 * // returns true
 * isStringEmpty(' ');
 */
helpers.isStringEmpty = (str) => {
  return str === null || str === undefined || str.trim() === '';
}

/**
 * Find an element which contains certain text on a page (DOM)
 *
 * @param {string} tag - Tag which should contain the text
 * @param {string} text - Text to look for
 * @param {string} doc - [Optional] DOM object to look inside. If undefined, then will use current page document
 * @returns {object} - Returns DOM Element with text.
 *
 * @example
 * // returns {...}
 * findElementByText('td', 'Hello World', document);
 */
helpers.findElementByText = (tag, text, doc = undefined) => {
  const elements = doc ? doc.getElementsByTagName(tag) : document.getElementsByTagName(tag);

  for (let element of elements) {
    if (element.textContent.trim() === text) {
      return element;
    }
  }

  return undefined;
}

/**
 * Find the first element of the given tag in the parent chain, starting from a given element.
 *
 * @param {object} element - DOM element to start searching from
 * @param {string} tagName - Tag of the element to look for
 * @returns {object} - Returns DOM Element
 *
 * @example
 * // returns table element which contains td cell
 * findParentByTag(myTableTDCellElem, 'table');
 */
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

/**
 * Asyncroniosly request specific country revenue of given date rage.
 *
 * @param {string} appID - AppID of the game
 * @param {string} country - Country which revenue to request of
 * @param {string} dateStart - [Optional] Start date. 2010-01-01 if not provided
 * @param {string} dateEnd - [Optional] End date. Today if not provided
 * @returns {Promise<number>} - Promise with revenue (number)
 *
 * @example
 * // returns 123456
 * await getCountryRevenue(000000, 'United States', Date('2020-01-20'), Date('2021-05-20')));
 */
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
