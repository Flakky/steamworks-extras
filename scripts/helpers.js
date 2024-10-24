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
  return Math.round(x).toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
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
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split('T')[0];
}

helpers.getDateRangeArray = (dateStart, dateEnd, outputDateStrings) => {
  const days = [];

  let day = new Date(dateStart);
  while (day <= dateEnd) {
    if (outputDateStrings) {
      const formattedDate = helpers.dateToString(day);
      days.push(formattedDate);
    }
    else days.push(new Date(day))

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

  let result = await helpers.sendMessageAsync({ request: 'getData', type: 'Sales', appId: appID });

  if (result === undefined) throw new Error(`Was not able to get sales data for appID ${appID}`);

  result = result.filter(item => item["Country"] === country);

  let revenue = 0;
  result.forEach(item => {
    revenue += item["Gross Steam Sales (USD)"];
  });

  console.log(`Steamworks extras: ${country} revenue share between ${formattedStartDate} and ${formattedEndDate}: ${revenue}`);

  return revenue;
}

helpers.correctDateRange = (startDate, endDate) => {
  startDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  endDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
}

helpers.getDateNoOffset = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset);
}

helpers.isDateInRange = (date, startDate, endDate) => {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0); // To be sure the date is inside start and end

  return target >= start && target <= end;
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

helpers.getWishlistData = async (appID, date) => {
  const url = `https://store.steampowered.com/app/${appID}`;

  console.log(`Fetching wishlist data from URL: ${url}`);

  const response = await fetch(url);
  if (!response.ok) throw new Error('Network response was not ok');
  const htmlText = await response.text();

  const wishlistData = await helpers.parseDOM(htmlText, 'parseWishlistData');

  return wishlistData;
}

helpers.getPackageIDs = async (appID, useBackgroundScript) => {
  const url = `https://partner.steamgames.com/apps/landing/${appID}`;

  console.log(`Fetching package IDs from URL: ${url}`);

  let htmlText;
  if (useBackgroundScript) {
    htmlText = await helpers.sendMessageAsync({ request: 'makeRequest', url: url });
  } else {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    htmlText = await response.text();
  }

  const packageIDs = await helpers.parseDOM(htmlText, 'parsePackageID');

  return packageIDs;
}

helpers.requestPageCreationDate = async (appID) => {
  const url = `https://partner.steampowered.com/app/wishlist/${appID}/`;
  const pageCreationDate = await helpers.parseDataFromPage(url, 'parsePageCreationDate');
  return new Date(pageCreationDate);
}

helpers.parseDataFromPage = async (url, request) => {
  console.log(`Getting data "${request}" from URL: ${url}`);

  const response = await fetch(url);

  if (!response.ok) throw new Error('Network response was not ok');

  const htmlText = await response.text();

  const parsedData = await helpers.parseDOM(htmlText, request);

  console.log(`Steamworks extras: Data result from parsing for "${request}": `, parsedData);

  return parsedData;
}

helpers.parseDOM = async (htmlText, request) => {
  console.log('Parsing DOM started: ', request);
  const offscreenUrl = chrome.runtime.getURL('background/offscreen/offscreen.html');

  try {
    await chrome.offscreen.createDocument({
      url: offscreenUrl,
      reasons: [chrome.offscreen.Reason.DOM_PARSER],
      justification: 'Parse HTML in background script'
    });
  } catch (error) { console.error(error); }

  await chrome.runtime.sendMessage({
    action: request,
    htmlText: htmlText
  });

  return new Promise((resolve, reject) => {
    chrome.runtime.onMessage.addListener(function listener(message) {
      if (message.action === 'parsedDOM') {
        chrome.runtime.onMessage.removeListener(listener);
        console.log('Parsing DOM completed', message.result);

        chrome.offscreen.closeDocument();

        resolve(message.result);
      }
    });
  });
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
