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
 * //// TODO: Replace with closest everywhere in the project
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

helpers.tryConvertStringToNumber = (str) => {
  // First, attempt to convert to a number
  const number = Number(str);

  // Check if the conversion resulted in a valid number (not NaN)
  if (!isNaN(number)) {
    return number;  // Return the number (int or float)
  } else {
    return str;  // If not a valid number, return the original string
  }
}

/**
 * Converts a Date object to a readable string with format of YYYY-MM-DD. For example 2020-01-20
 *
 * @param {Date} date - AppID of the game
 * @returns {string} - Formatted date string
 *
 * @example
 * // returns '2020-01-20'
 * await dateToString(new Date('2020-01-20'));
 */
helpers.dateToString = (date) => {
  return date.toISOString().split('T')[0];
}

helpers.getDateRangeArray = (dateStart, dateEnd, outputDateStrings) => {
  const days = [];

  let day = new Date(dateStart);
  while (day <= dateEnd) {
    if (outputDateStrings) {
      const formattedDate = helpers.dateToString(day);
      days.push(formattedDate);
    }
    else days.push(day)

    // Move to the next day
    day.setDate(day.getDate() + 1);
  }

  return days;
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

  const formattedStartDate = helpers.dateToString(startDate);
  const formattedEndDate = helpers.dateToString(endDate);

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

/**
 * Asyncroniosly request full sales data for a date range
 *
 * @param {string} appID - AppID of the game
 * @param {string} dateStart - [Optional] Start date. 2010-01-01 if not provided
 * @param {string} dateEnd - [Optional] End date. Today if not provided
 * @returns {Promise<object>} - Promise with revenue (number)
 *
 * @example
 * // returns {...}
 * await getSaleDataCSV(000000, Date('2020-01-20'), Date('2021-05-20')));
 */
helpers.getSaleDataCSV = async (pkgID, dateStart, dateEnd) => {
  const startDate = dateStart || new Date(2010, 0, 1);
  const endDate = dateEnd || new Date();

  const formattedStartDate = helpers.dateToString(startDate);
  const formattedEndDate = helpers.dateToString(endDate);

  console.log(`Steamworks extras: Request sales in CSV between ${formattedStartDate} and ${formattedEndDate}`);

  const URL = `https://partner.steampowered.com/report_csv.php`;

  const reqHeaders = {
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  const data = new URLSearchParams();
  data.append('file', 'SalesData');
  data.append('params', `query=QueryPackageSalesForCSV^pkgID[0]=${pkgID}^dateStart=${formattedStartDate}^dateEnd=${formattedEndDate}^interpreter=PartnerSalesReportInterpreter`);

  const response = await fetch(URL, { method: 'POST', headers: reqHeaders, body: data.toString() });
  if (!response.ok) throw new Error('Network response was not ok');

  const htmlText = await response.text();
  let lines = htmlText.split('\n');

  lines.splice(0, 3); // Remove first 3 rows because they are not informative and break csv format

  // Ensure that we have lines to process
  if (lines.length === 0) {
    return [];
  }

  const csvString = lines.join('\n');

  lines = helpers.csvTextToArray(csvString);

  const headers = lines[0].map(header => header.trim());

  // Map each line to an object using the headers as keys
  const result = lines.slice(1).map(line => {
    const object = {};

    line.forEach((element, index) => {
      object[headers[index]] = element;
    });

    return object;
  });

  console.log(`Steamworks extras: Sales CSV result`);
  console.log(result);

  return result;
}

helpers.csvTextToArray = (strData, strDelimiter) => {
  // https://www.bennadel.com/blog/1504-ask-ben-parsing-csv-strings-with-javascript-exec-regular-expression-command.htm

  // Check to see if the delimiter is defined. If not,
  // then default to comma.
  strDelimiter = (strDelimiter || ",");

  // Create a regular expression to parse the CSV values.
  var objPattern = new RegExp(
    (
      // Delimiters.
      "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +

      // Quoted fields.
      "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +

      // Standard fields.
      "([^\"\\" + strDelimiter + "\\r\\n]*))"
    ),
    "gi"
  );


  // Create an array to hold our data. Give the array
  // a default empty first row.
  var arrData = [[]];

  // Create an array to hold our individual pattern
  // matching groups.
  var arrMatches = null;


  // Keep looping over the regular expression matches
  // until we can no longer find a match.
  while (arrMatches = objPattern.exec(strData)) {

    // Get the delimiter that was found.
    var strMatchedDelimiter = arrMatches[1];

    // Check to see if the given delimiter has a length
    // (is not the start of string) and if it matches
    // field delimiter. If id does not, then we know
    // that this delimiter is a row delimiter.
    if (
      strMatchedDelimiter.length &&
      (strMatchedDelimiter != strDelimiter)
    ) {

      // Since we have reached a new row of data,
      // add an empty row to our data array.
      arrData.push([]);

    }


    // Now that we have our delimiter out of the way,
    // let's check to see which kind of value we
    // captured (quoted or unquoted).
    if (arrMatches[2]) {

      // We found a quoted value. When we capture
      // this value, unescape any double quotes.
      var strMatchedValue = arrMatches[2].replace(
        new RegExp("\"\"", "g"),
        "\""
      );

    } else {

      // We found a non-quoted value.
      var strMatchedValue = arrMatches[3];

    }


    // Now that we have our value string, let's add
    // it to the data array.
    arrData[arrData.length - 1].push(helpers.tryConvertStringToNumber(strMatchedValue));
  }

  // Return the parsed data.
  return (arrData);
}

/**
 * Asyncroniosly request all reviews for the game
 *
 * @param {string} appID - AppID of the game
 * @returns {Promise<object>} - Promise with reviews array
 *
 * @example
 * // returns [...]
 * await RequestGameReviews(000000);
 */
helpers.requestGameReviews = async (appID) => {
  // Request documentation: https://partner.steamgames.com/doc/store/getreviews

  let cursor = '*'

  let reviews = [];

  while (true) {
    const request_data = {
      'filter': 'recent',
      'language': 'all',
      'review_type': 'all',
      'purchase_type': 'all',
      'num_per_page': 100,
      'cursor': cursor,
      'json': 1
    }

    const params = Object.keys(request_data)
      .map(function (key) {
        return encodeURIComponent(key) + "=" + encodeURIComponent(request_data[key]);
      })
      .join("&");

    const request_url = `https://store.steampowered.com/appreviews/${appID}?${params}`;
    const request_options = {
      'method': 'POST',
      'contentType': 'application/json',
      headers: {
        'Content-Type': 'application/json'
      },
    };

    console.log(`Sending review request to "${request_url}"`);

    const responseText = await helpers.sendMessageAsync({ request: 'makeRequest', url: request_url, params: request_options });

    const responseObj = JSON.parse(responseText);

    if (responseObj.reviews === undefined || responseObj.reviews.length == 0) break;

    cursor = responseObj.cursor;

    for (const review of responseObj.reviews) {
      if (review !== undefined) reviews.push(review);
    }
  }

  console.log(`Steamworks extras: Reviews result`);
  console.log(reviews);

  return reviews;
}

helpers.sendMessageAsync = (message) => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        console.log('RESPONSE')
        resolve(response);
      }
    });
  });
}
