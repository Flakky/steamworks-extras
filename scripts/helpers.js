let helpers = {}

const getBrowser = () => {
  if (typeof browser !== 'undefined') {
    return browser;
  } else if (typeof chrome !== 'undefined') {
    return chrome;
  } else {
    throw new Error('No browser API found');
  }
}

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
  return Math.floor(x).toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
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

/**
 * Returns an array of dates between a given date range.
 *
 * @param {Date} dateStart - Start date of the range
 * @param {Date} dateEnd - End date of the range
 * @param {boolean} reverse - [Optional] If true, the array will be reversed
 * @param {boolean} outputDateStrings - [Optional] If true, the array will contain date strings instead of Date objects
 * @returns {Array} - Array of dates
 *
 * @example
 * // returns ['2020-01-20', '2020-01-21', '2020-01-22']
 * getDateRangeArray(new Date('2020-01-20'), new Date('2020-01-22'));
 */
helpers.getDateRangeArray = (dateStart, dateEnd, reverse, outputDateStrings) => {
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

  if (reverse) days.reverse();

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

  let result = await helpers.sendMessageAsync({ request: 'getData', type: 'Sales', appId: appID, dateStart: formattedStartDate, dateEnd: formattedEndDate, returnLackData: true });

  if (result === undefined) throw new Error(`Was not able to get sales data for appID ${appID}`);

  result = result.filter(item => item["Country"] === country);

  let revenue = 0;
  result.forEach(item => {
    revenue += item["Gross Steam Sales (USD)"];
  });

  console.log(`Steamworks extras: ${country} revenue share between ${formattedStartDate} and ${formattedEndDate}: ${revenue}`);

  return revenue;
}

/**
 * Corrects a given date range to be a full day. 
 *
 * @param {Date} startDate - Start date of the range
 * @param {Date} endDate - End date of the range
 * 
 * @example
 * // returns 2025-01-01 00:00:00 and 2025-01-02 23:59:59
 * correctDateRange(new Date('2025-01-01'), new Date('2025-01-02'));
 */
helpers.correctDateRange = (dateStart, dateEnd) => {
  dateStart = new Date(Date.UTC(
    dateStart.getUTCFullYear(),
    dateStart.getUTCMonth(),
    dateStart.getUTCDate(),
    0, 0, 0, 0
  ));

  dateEnd = new Date(Date.UTC(
    dateEnd.getUTCFullYear(),
    dateEnd.getUTCMonth(),
    dateEnd.getUTCDate(),
    23, 59, 59, 999
  ));

  return { dateStart: dateStart, dateEnd: dateEnd };
}

helpers.getDateNoOffset = () => {
  const now = new Date(Date.now());
  return now;
}

/**
 * Returns today's date, but if it's before 7am UTC, it returns the previous day. This is because Steam updates date only at 7am UTC for statistics.
 *
 * @returns {Date} - Corrected today's date
 */
helpers.getCalculationToday = () => {
  const now = new Date(Date.now());
  if (now.getUTCHours() < 7) now.setUTCDate(now.getUTCDate() - 1); // Steam still stands on the previous day until 7am UTC
  return now;
}

/**
 * Checks if a given date is in a given date range.
 *
 * @param {Date} date - Date to check
 * @param {Date} startDate - Start date of the range
 * @param {Date} endDate - End date of the range
 * @returns {boolean} - True if the date is in the range, false otherwise
 */
helpers.isDateInRange = (date, startDate, endDate) => {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getUTCDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getUTCDate(), 23, 59, 59, 999);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getUTCDate(), 12, 0, 0, 0); // To be sure the date is inside start and end

  return target >= start && target <= end;
}

/**
 * Converts a date string in format "YYYY-MM-DD" (UTC) to a Date object.
 *
 * @param {string} dateString - Date string in format "YYYY-MM-DD"
 * @returns {Date} - Date object
 */
helpers.dateFromString = (dateString) => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Parses a CSV text to an array of objects.
 *
 * @param {string} strData - CSV text to parse
 * @param {string} strDelimiter - [Optional] Delimiter. Default is comma
 * @returns {Array} - Array of arrays
 */
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
 * Sends a message to the background script to get data from storage.
 *
 * @param {string} type - Type of the data to get
 * @param {string} appId - AppID of the game
 * @param {string} dateStart - Start date of the range
 * @param {string} dateEnd - End date of the range  
 * @param {boolean} returnLackData - [Optional] If true, the function will return data even if some of it is not available. Otherwise, it will return undefined if some data is not available.
 * @returns {Promise} - Promise with the response
 *
 * @example
 * // returns data from storage
 * await getDataFromStorage('Sales', 123456, new Date('2020-01-20'), new Date('2020-01-22'), true);
 */
helpers.getDataFromStorage = async (type, appId, dateStart, dateEnd, returnLackData) => {
  const result = await helpers.sendMessageAsync({ request: 'getData', type: type, appId: appId, dateStart: dateStart, dateEnd: dateEnd, returnLackData: returnLackData });
  console.debug(`Steamworks extras: returning "${type}" data from background: `, result);
  return result;
}

/**
 * Creates a message block with a title and a text.
 *
 * @param {string} type - Type of the message. Can be 'error' or 'warning'
 * @param {string} text - Text of the message
 * @returns {object} - DOM Element
 */
helpers.createMessageBlock = (type, text) => {
  const block = document.createElement('div');
  const title = document.createElement('b');

  switch (type) {
    case 'error': {
      title.textContent = 'Steamworks extras error';
      block.classList.add('extra_error');
      break;
    }
    case 'warning': {
      title.textContent = 'Steamworks extras warning';
      block.classList.add('extra_warning');
      break;
    }
  }

  const textBlock = document.createElement('p');
  textBlock.textContent = text;

  block.appendChild(title);
  block.appendChild(textBlock);
  return block;
}

/**
 * Creates a message block with a title and a text.
 *
 * @param {string} type - Type of the message. Can be 'error' or 'warning'
 * @param {string} text - Text of the message
 * @returns {object} - DOM Element
 */
helpers.createMessageText = (type, text) => {
  const block = document.createElement('p');
  const title = document.createElement('b');

  switch (type) {
    case 'error': {
      title.textContent = 'Steamworks extras error: ';
      block.classList.add('extra_error_text');
      break;
    }
    case 'warning': {
      title.textContent = 'Steamworks extras warning: ';
      block.classList.add('extra_warning_text');
      break;
    }
  }

  const textBlock = document.createElement('span');
  textBlock.textContent = text;

  block.appendChild(title);
  block.appendChild(textBlock);

  return block;
}

helpers.selectChartColor = (chartColors, tag) => {
  if (chartColors && chartColors[tag]) return chartColors[tag];

  return `rgb(${30 + Math.round(Math.random() * 225)}, ${30 + Math.round(Math.random() * 225)}, ${30 + Math.round(Math.random() * 225)})`;
}

helpers.getDOMLocal = async (url) => {
  const response = await fetch(url);

  if (!response.ok) throw new Error('Network response was not ok', url);

  const htmlText = await response.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');

  return doc;
}

/**
 * Sends a message to the background script.
 *
 * @param {object} message - Message to send. Must contain 'request' property in order to be recognized.
 * @returns {Promise} - Promise with the response
 */
helpers.sendMessageAsync = (message) => {
  return new Promise((resolve, reject) => {
    getBrowser().runtime.sendMessage(message, (response) => {
      if (getBrowser().runtime.lastError) {
        reject(getBrowser().runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}
