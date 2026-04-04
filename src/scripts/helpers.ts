import { getBrowser } from '../shared/browser';
import { BackgroundMessage, BackgroundMessageType, GetDataType } from '../shared/types/background_requests';
import { DateSales } from '../shared/types/sales';

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
export const numberWithCommas = (x: number): string => {
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
export const isStringEmpty = (str: string | null | undefined): boolean => {
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
export const findElementByText = (tag: string, text: string, doc: Document): Element | undefined => {
    const elements = doc.getElementsByTagName(tag);

    for (const element of Array.from(elements)) {
        if ((element.textContent as string).trim() === text) {
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
export const findParentByTag = (element: any, tagName: string): Element | undefined => {
    tagName = tagName.toUpperCase();

    while (element && element.parentNode) {
        element = element.parentNode;
        if (element.tagName === tagName) {
            return element;
        }
    }

    return undefined;
}

export const tryConvertStringToNumber = (str: string): number | null => {
    if (isStringEmpty(str)) return null;

    const number = Number(str);

    if (!isNaN(number)) {
        return number;
    } else {
        return null;
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
export const dateToString = (date: Date, local: boolean = true): string => {
    if (local) {
        return date.toLocaleDateString('en-CA');
    } else {
        return date.toISOString().split('T')[0];
    }
}

export const getDateNoOffset = (): Date => {
    const now = new Date(Date.now());
    return now;
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
export const getCountryRevenue = async (appID: string, country: string, dateStart?: Date, dateEnd?: Date): Promise<number> => {

    const startDate = dateStart || new Date(2010, 0, 1);
    const endDate = dateEnd || new Date();

    const formattedStartDate = dateToString(startDate);
    const formattedEndDate = dateToString(endDate);

    let result: any = await sendMessageAsync({
        request: BackgroundMessageType.getData,
        payload: { type: GetDataType.Sales, appId: appID, dateStart: formattedStartDate, dateEnd: formattedEndDate, returnLackData: true }
    }) as DateSales[];

    if (result === undefined) throw new Error(`Was not able to get sales data for appID ${appID}`);

    result = result.filter((item: any) => item.country === country);

    let revenue = 0;
    result.forEach((item: DateSales) => {
        revenue += item.grossSteamSalesUSD;
    });

    console.log(`${country} revenue share between ${formattedStartDate} and ${formattedEndDate}: ${revenue}`);

    return revenue;
}

/**
 * Returns today's date, but if it's before 7am UTC, it returns the previous day. This is because Steam updates date only at 7am UTC for statistics.
 *
 * @returns {Date} - Corrected today's date
 */
export const getCalculationToday = (): Date => {
    const now = new Date(Date.now());
    if (now.getUTCHours() < 7) now.setUTCDate(now.getUTCDate() - 1); // Steam still stands on the previous day until 7am UTC
    return now;
}

/**
 * Converts a date string in format "YYYY-MM-DD" (UTC) to a Date object.
 *
 * @param {string} dateString - Date string in format "YYYY-MM-DD"
 * @returns {Date} - Date object
 */
export const dateFromString = (dateString: string): Date => {
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
export const csvTextToArray = (strData: string, strDelimiter?: string): any[] => {
    // https://www.bennadel.com/blog/1504-ask-ben-parsing-csv-strings-with-javascript-exec-regular-expression-command.htm

    if (isStringEmpty(strData)) return [[]];

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
    var arrData: any[] = [[]];

    // Create an array to hold our individual pattern
    // matching groups.
    var arrMatches: RegExpExecArray | null = null;


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
        arrData[arrData.length - 1].push(tryConvertStringToNumber(strMatchedValue) ?? strMatchedValue);
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
export const getDataFromStorage = async (type: GetDataType, appId: string, dateStart?: any, dateEnd?: any, returnLackData?: boolean): Promise<any> => {
    const result = await sendMessageAsync({
        request: BackgroundMessageType.getData,
        payload: { type: type, appId: appId, dateStart: dateStart, dateEnd: dateEnd, returnLackData: returnLackData }
    });

    console.debug(`returning "${type}" data from background: `, result);
    return result;
}

/**
 * Creates a message block with a title and a text.
 *
 * @param {string} type - Type of the message. Can be 'error' or 'warning'
 * @param {string} text - Text of the message
 * @returns {object} - DOM Element
 */
export const createMessageBlock = (type: 'error' | 'warning', text: string): HTMLDivElement => {
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

export const selectChartColor = (chartColors: any, tag: string): string => {
    if (chartColors && chartColors[tag]) return chartColors[tag];

    return `rgb(${30 + Math.round(Math.random() * 225)}, ${30 + Math.round(Math.random() * 225)}, ${30 + Math.round(Math.random() * 225)})`;
}

export const getDOMLocal = async (url: string): Promise<Document> => {
    const response = await fetch(url);

    if (!response.ok) throw new (Error as any)('Network response was not ok', url);

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
export const sendMessageAsync = (message: BackgroundMessage): Promise<any> => {
    return new Promise((resolve, reject) => {
        getBrowser().runtime.sendMessage(message, (response: any) => {
            if (getBrowser().runtime.lastError) {
                reject(getBrowser().runtime.lastError);
            } else {
                resolve(response);
            }
        });
    });
}
