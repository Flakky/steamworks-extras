import {
    numberWithCommas,
    isStringEmpty,
    findElementByText,
    findParentByTag,
    tryConvertStringToNumber,
    dateToString,
    getDateRangeArray,
    getCountryRevenue,
    correctDateRange,
    getDateNoOffset,
    getCalculationToday,
    isDateInRange,
    dateFromString,
    csvTextToArray,
    getDataFromStorage,
    createMessageBlock,
    selectChartColor,
    getDOMLocal,
    sendMessageAsync,
} from '../src/scripts/helpers';
import { GetDataType, BackgroundMessage, BackgroundMessageType } from '../src/shared/types/background_requests';
import { DateSales } from '../src/shared/types/sales';

// Mock the browser module
jest.mock('../src/shared/browser', () => ({
    getBrowser: jest.fn(() => ({
        runtime: {
            sendMessage: jest.fn((message, callback) => {
                // Mock implementation
                if (callback) {
                    callback({ success: true });
                }
            }),
            lastError: null,
        },
    })),
}));

describe('numberWithCommas', () => {
    test('should format positive numbers with commas', () => {
        expect(numberWithCommas(123456789)).toBe('123,456,789');
        expect(numberWithCommas(1000)).toBe('1,000');
        expect(numberWithCommas(123)).toBe('123');
        expect(numberWithCommas(1234)).toBe('1,234');
    });

    test('should format zero', () => {
        expect(numberWithCommas(0)).toBe('0');
    });

    test('should format negative numbers with commas', () => {
        expect(numberWithCommas(-123456789)).toBe('-123,456,789');
        expect(numberWithCommas(-1000)).toBe('-1,000');
    });

    test('should handle decimal numbers by flooring them', () => {
        expect(numberWithCommas(1234.56)).toBe('1,234');
        expect(numberWithCommas(1234.99)).toBe('1,234');
    });

    test('should handle large numbers', () => {
        expect(numberWithCommas(1000000000)).toBe('1,000,000,000');
    });
});

describe('isStringEmpty', () => {
    test('should return true for empty string', () => {
        expect(isStringEmpty('')).toBe(true);
    });

    test('should return true for string with only whitespace', () => {
        expect(isStringEmpty(' ')).toBe(true);
        expect(isStringEmpty('   ')).toBe(true);
        expect(isStringEmpty('\t\n')).toBe(true);
    });

    test('should return true for null', () => {
        expect(isStringEmpty(null)).toBe(true);
    });

    test('should return true for undefined', () => {
        expect(isStringEmpty(undefined)).toBe(true);
    });

    test('should return false for non-empty strings', () => {
        expect(isStringEmpty('hello')).toBe(false);
        expect(isStringEmpty('  hello  ')).toBe(false);
        expect(isStringEmpty('a')).toBe(false);
    });
});

describe('findElementByText', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    test('should find element by text content', () => {
        const div = document.createElement('div');
        div.textContent = 'Hello World';
        document.body.appendChild(div);

        const result = findElementByText('div', 'Hello World');
        expect(result).toBe(div);
    });

    test('should find element with trimmed whitespace', () => {
        const p = document.createElement('p');
        p.textContent = '  Test Text  ';
        document.body.appendChild(p);

        const result = findElementByText('p', 'Test Text');
        expect(result).toBe(p);
    });

    test('should return undefined if element not found', () => {
        const result = findElementByText('div', 'NonExistent');
        expect(result).toBeUndefined();
    });

    test('should search in provided document', () => {
        const customDoc = document.implementation.createHTMLDocument('Test');
        const div = customDoc.createElement('div');
        div.textContent = 'Custom Document';
        customDoc.body.appendChild(div);

        const result = findElementByText('div', 'Custom Document', customDoc);
        expect(result).toBe(div);
    });

    test('should find first matching element when multiple exist', () => {
        const div1 = document.createElement('div');
        div1.textContent = 'Duplicate';
        const div2 = document.createElement('div');
        div2.textContent = 'Duplicate';
        document.body.appendChild(div1);
        document.body.appendChild(div2);

        const result = findElementByText('div', 'Duplicate');
        expect(result).toBe(div1);
    });
});

describe('findParentByTag', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    test('should find parent element by tag', () => {
        const table = document.createElement('table');
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        tr.appendChild(td);
        table.appendChild(tr);
        document.body.appendChild(table);

        const result = findParentByTag(td, 'table');
        expect(result).toBe(table);
    });

    test('should find immediate parent', () => {
        const div = document.createElement('div');
        const span = document.createElement('span');
        div.appendChild(span);
        document.body.appendChild(div);

        const result = findParentByTag(span, 'div');
        expect(result).toBe(div);
    });

    test('should be case insensitive', () => {
        const table = document.createElement('table');
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        tr.appendChild(td);
        table.appendChild(tr);
        document.body.appendChild(table);

        const result = findParentByTag(td, 'TABLE');
        expect(result).toBe(table);
    });

    test('should return undefined if parent not found', () => {
        const div = document.createElement('div');
        document.body.appendChild(div);

        const result = findParentByTag(div, 'table');
        expect(result).toBeUndefined();
    });

    test('should handle null element', () => {
        const result = findParentByTag(null as any, 'div');
        expect(result).toBeUndefined();
    });
});

describe('tryConvertStringToNumber', () => {
    test('should convert numeric strings to numbers', () => {
        expect(tryConvertStringToNumber('123')).toBe(123);
        expect(tryConvertStringToNumber('0')).toBe(0);
        expect(tryConvertStringToNumber('-456')).toBe(-456);
    });

    test('should convert decimal strings to numbers', () => {
        expect(tryConvertStringToNumber('123.45')).toBe(123.45);
        expect(tryConvertStringToNumber('0.5')).toBe(0.5);
        expect(tryConvertStringToNumber('-123.45')).toBe(-123.45);
    });

    test('should return original string if not a number', () => {
        expect(tryConvertStringToNumber('hello')).toBe('hello');
        expect(tryConvertStringToNumber('abc123')).toBe('abc123');
        expect(tryConvertStringToNumber('')).toBe('');
    });

    test('should handle scientific notation', () => {
        expect(tryConvertStringToNumber('1e5')).toBe(100000);
        expect(tryConvertStringToNumber('1.5e2')).toBe(150);
    });
});

describe('dateToString', () => {
    test('should convert date to YYYY-MM-DD format', () => {
        const date = new Date('2020-01-20T00:00:00.000Z');
        expect(dateToString(date)).toBe('2020-01-20');
    });

    test('should handle dates with time components', () => {
        const date = new Date('2020-01-20T12:34:56.789Z');
        expect(dateToString(date)).toBe('2020-01-20');
    });

    test('should handle different dates', () => {
        const date = new Date('2023-12-25T00:00:00.000Z');
        expect(dateToString(date)).toBe('2023-12-25');
    });

    test('should handle leap year dates', () => {
        const date = new Date('2024-02-29T00:00:00.000Z');
        expect(dateToString(date)).toBe('2024-02-29');
    });
});

describe('getDateRangeArray', () => {
    test('should return array of dates for date range', () => {
        const start = new Date('2020-01-20T00:00:00.000Z');
        const end = new Date('2020-01-22T00:00:00.000Z');
        const result = getDateRangeArray(start, end);

        expect(result).toHaveLength(3);
        expect((result[0] as Date).getTime()).toBe(new Date('2020-01-20T00:00:00.000Z').getTime());
        expect((result[1] as Date).getTime()).toBe(new Date('2020-01-21T00:00:00.000Z').getTime());
        expect((result[2] as Date).getTime()).toBe(new Date('2020-01-22T00:00:00.000Z').getTime());
    });

    test('should return single date for same start and end', () => {
        const date = new Date('2020-01-20T00:00:00.000Z');
        const result = getDateRangeArray(date, date);

        expect(result).toHaveLength(1);
        expect((result[0] as Date).getTime()).toBe(date.getTime());
    });

    test('should return date strings when outputDateStrings is true', () => {
        const start = new Date('2020-01-20T00:00:00.000Z');
        const end = new Date('2020-01-22T00:00:00.000Z');
        const result = getDateRangeArray(start, end, false, true);

        expect(result).toEqual(['2020-01-20', '2020-01-21', '2020-01-22']);
    });

    test('should reverse array when reverse is true', () => {
        const start = new Date('2020-01-20T00:00:00.000Z');
        const end = new Date('2020-01-22T00:00:00.000Z');
        const result = getDateRangeArray(start, end, true);

        expect(result).toHaveLength(3);
        expect((result[0] as Date).getTime()).toBe(new Date('2020-01-22T00:00:00.000Z').getTime());
        expect((result[2] as Date).getTime()).toBe(new Date('2020-01-20T00:00:00.000Z').getTime());
    });

    test('should reverse date strings when both reverse and outputDateStrings are true', () => {
        const start = new Date('2020-01-20T00:00:00.000Z');
        const end = new Date('2020-01-22T00:00:00.000Z');
        const result = getDateRangeArray(start, end, true, true);

        expect(result).toEqual(['2020-01-22', '2020-01-21', '2020-01-20']);
    });
});

describe('correctDateRange', () => {
    test('should set start date to beginning of day', () => {
        const start = new Date('2025-01-01T12:34:56.789Z');
        const end = new Date('2025-01-02T12:34:56.789Z');
        const result = correctDateRange(start, end);

        expect(result.dateStart.getUTCHours()).toBe(0);
        expect(result.dateStart.getUTCMinutes()).toBe(0);
        expect(result.dateStart.getUTCSeconds()).toBe(0);
        expect(result.dateStart.getUTCMilliseconds()).toBe(0);
    });

    test('should set end date to end of day', () => {
        const start = new Date('2025-01-01T00:00:00.000Z');
        const end = new Date('2025-01-02T12:34:56.789Z');
        const result = correctDateRange(start, end);

        expect(result.dateEnd.getUTCHours()).toBe(23);
        expect(result.dateEnd.getUTCMinutes()).toBe(59);
        expect(result.dateEnd.getUTCSeconds()).toBe(59);
        expect(result.dateEnd.getUTCMilliseconds()).toBe(999);
    });

    test('should preserve date values', () => {
        const start = new Date('2025-01-01T12:34:56.789Z');
        const end = new Date('2025-01-02T12:34:56.789Z');
        const result = correctDateRange(start, end);

        expect(result.dateStart.getUTCFullYear()).toBe(2025);
        expect(result.dateStart.getUTCMonth()).toBe(0);
        expect(result.dateStart.getUTCDate()).toBe(1);

        expect(result.dateEnd.getUTCFullYear()).toBe(2025);
        expect(result.dateEnd.getUTCMonth()).toBe(0);
        expect(result.dateEnd.getUTCDate()).toBe(2);
    });
});

describe('getDateNoOffset', () => {
    test('should return current date', () => {
        const before = new Date();
        const result = getDateNoOffset();
        const after = new Date();

        expect(result.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(result.getTime()).toBeLessThanOrEqual(after.getTime());
    });
});

describe('getCalculationToday', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('should return previous day if before 7am UTC', () => {
        const mockDate = new Date('2024-01-15T06:00:00.000Z');
        jest.setSystemTime(mockDate);

        const result = getCalculationToday();
        const expectedDate = new Date('2024-01-14T06:00:00.000Z');

        expect(result.getUTCDate()).toBe(expectedDate.getUTCDate());
        expect(result.getUTCMonth()).toBe(expectedDate.getUTCMonth());
        expect(result.getUTCFullYear()).toBe(expectedDate.getUTCFullYear());
    });

    test('should return current day if at or after 7am UTC', () => {
        const mockDate = new Date('2024-01-15T07:00:00.000Z');
        jest.setSystemTime(mockDate);

        const result = getCalculationToday();

        expect(result.getUTCDate()).toBe(15);
        expect(result.getUTCMonth()).toBe(0);
        expect(result.getUTCFullYear()).toBe(2024);
    });
});

describe('isDateInRange', () => {
    test('should return true if date is within range', () => {
        const date = new Date('2020-01-15T12:00:00.000Z');
        const start = new Date('2020-01-10T00:00:00.000Z');
        const end = new Date('2020-01-20T23:59:59.999Z');

        expect(isDateInRange(date, start, end)).toBe(true);
    });

    test('should return true if date equals start date', () => {
        const date = new Date('2020-01-10T00:00:00.000Z');
        const start = new Date('2020-01-10T00:00:00.000Z');
        const end = new Date('2020-01-20T23:59:59.999Z');

        expect(isDateInRange(date, start, end)).toBe(true);
    });

    test('should return true if date equals end date', () => {
        const date = new Date('2020-01-20T00:00:00.000Z');
        const start = new Date('2020-01-10T00:00:00.000Z');
        const end = new Date('2020-01-20T23:59:59.999Z');

        expect(isDateInRange(date, start, end)).toBe(true);
    });

    test('should return false if date is before start', () => {
        const date = new Date('2020-01-05T00:00:00.000Z');
        const start = new Date('2020-01-10T00:00:00.000Z');
        const end = new Date('2020-01-20T23:59:59.999Z');

        expect(isDateInRange(date, start, end)).toBe(false);
    });

    test('should return false if date is after end', () => {
        const date = new Date('2020-01-25T00:00:00.000Z');
        const start = new Date('2020-01-10T00:00:00.000Z');
        const end = new Date('2020-01-20T23:59:59.999Z');

        expect(isDateInRange(date, start, end)).toBe(false);
    });
});

describe('dateFromString', () => {
    test('should convert date string to Date object', () => {
        const result = dateFromString('2020-01-20');
        expect(result.getUTCFullYear()).toBe(2020);
        expect(result.getUTCMonth()).toBe(0); // Month is 0-indexed
        expect(result.getUTCDate()).toBe(20);
    });

    test('should handle different dates', () => {
        const result = dateFromString('2023-12-25');
        expect(result.getUTCFullYear()).toBe(2023);
        expect(result.getUTCMonth()).toBe(11);
        expect(result.getUTCDate()).toBe(25);
    });

    test('should set time to midnight UTC', () => {
        const result = dateFromString('2020-01-20');
        expect(result.getUTCHours()).toBe(0);
        expect(result.getUTCMinutes()).toBe(0);
        expect(result.getUTCSeconds()).toBe(0);
        expect(result.getUTCMilliseconds()).toBe(0);
    });
});

describe('csvTextToArray', () => {
    test('should parse simple CSV text', () => {
        const csv = 'name,age,city\nJohn,30,New York\nJane,25,Boston';
        const result = csvTextToArray(csv);

        expect(result).toEqual([
            ['name', 'age', 'city'],
            ['John', 30, 'New York'],
            ['Jane', 25, 'Boston'],
        ]);
    });

    test('should handle quoted fields', () => {
        const csv = 'name,description\nJohn,"Hello, World"\nJane,"Test"';
        const result = csvTextToArray(csv);

        expect(result).toEqual([
            ['name', 'description'],
            ['John', 'Hello, World'],
            ['Jane', 'Test'],
        ]);
    });

    test('should handle escaped quotes', () => {
        const csv = 'text\n"Say ""Hello"" to me"';
        const result = csvTextToArray(csv);

        expect(result).toEqual([
            ['text'],
            ['Say "Hello" to me'],
        ]);
    });

    test('should handle custom delimiter', () => {
        const csv = 'name|age|city\nJohn|30|New York';
        const result = csvTextToArray(csv, '|');

        expect(result).toEqual([
            ['name', 'age', 'city'],
            ['John', 30, 'New York'],
        ]);
    });

    test('should handle empty fields', () => {
        const csv = 'a,b,c\n1,,3\n,2,';
        const result = csvTextToArray(csv);

        expect(result).toEqual([
            ['a', 'b', 'c'],
            [1, '', 3],
            ['', 2, ''],
        ]);
    });

    test('should handle single row', () => {
        const csv = 'name,age,city';
        const result = csvTextToArray(csv);

        expect(result).toEqual([['name', 'age', 'city']]);
    });

    test('should handle empty CSV', () => {
        const csv = '';
        const result = csvTextToArray(csv);

        expect(result).toEqual([['']]);
    });

    test('should convert numeric strings to numbers', () => {
        const csv = 'value\n123\n45.67\n-89';
        const result = csvTextToArray(csv);

        expect(result).toEqual([
            ['value'],
            [123],
            [45.67],
            [-89],
        ]);
    });
});

describe('createMessageBlock', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    test('should create error message block', () => {
        const block = createMessageBlock('error', 'Something went wrong');

        expect(block.tagName).toBe('DIV');
        expect(block.classList.contains('extra_error')).toBe(true);
        expect(block.children.length).toBe(2);

        const title = block.children[0] as HTMLElement;
        const text = block.children[1] as HTMLElement;

        expect(title.tagName).toBe('B');
        expect(title.textContent).toBe('Steamworks extras error');
        expect(text.tagName).toBe('P');
        expect(text.textContent).toBe('Something went wrong');
    });

    test('should create warning message block', () => {
        const block = createMessageBlock('warning', 'This is a warning');

        expect(block.tagName).toBe('DIV');
        expect(block.classList.contains('extra_warning')).toBe(true);
        expect(block.children.length).toBe(2);

        const title = block.children[0] as HTMLElement;
        const text = block.children[1] as HTMLElement;

        expect(title.tagName).toBe('B');
        expect(title.textContent).toBe('Steamworks extras warning');
        expect(text.tagName).toBe('P');
        expect(text.textContent).toBe('This is a warning');
    });
});

describe('selectChartColor', () => {
    test('should return color from chartColors if exists', () => {
        const chartColors = {
            'tag1': 'rgb(255, 0, 0)',
            'tag2': '#FF0000',
        };

        expect(selectChartColor(chartColors, 'tag1')).toBe('rgb(255, 0, 0)');
        expect(selectChartColor(chartColors, 'tag2')).toBe('#FF0000');
    });

    test('should return random color if tag not in chartColors', () => {
        const chartColors = {
            'tag1': 'rgb(255, 0, 0)',
        };

        const result = selectChartColor(chartColors, 'nonexistent');
        expect(result).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
    });

    test('should return random color if chartColors is null', () => {
        const result = selectChartColor(null, 'tag1');
        expect(result).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
    });

    test('should return random color if chartColors is undefined', () => {
        const result = selectChartColor(undefined, 'tag1');
        expect(result).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
    });

    test('should generate colors in valid RGB range', () => {
        const chartColors = {};
        const result = selectChartColor(chartColors, 'tag1');

        // Extract RGB values
        const match = result.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        expect(match).not.toBeNull();

        if (match) {
            const r = parseInt(match[1]);
            const g = parseInt(match[2]);
            const b = parseInt(match[3]);

            // Each value should be between 30 and 255 (30 + Math.random() * 225)
            expect(r).toBeGreaterThanOrEqual(30);
            expect(r).toBeLessThanOrEqual(255);
            expect(g).toBeGreaterThanOrEqual(30);
            expect(g).toBeLessThanOrEqual(255);
            expect(b).toBeGreaterThanOrEqual(30);
            expect(b).toBeLessThanOrEqual(255);
        }
    });
});

describe('getDOMLocal', () => {
    beforeEach(() => {
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should fetch and parse HTML document', async () => {
        const htmlText = '<html><body><div>Test</div></body></html>';
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            text: async () => htmlText,
        });

        const result = await getDOMLocal('/test.html');

        expect(result).toBeInstanceOf(Document);
        expect(result.body.querySelector('div')?.textContent).toBe('Test');
        expect(global.fetch).toHaveBeenCalledWith('/test.html');
    });

    test('should throw error if fetch fails', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 404,
        });

        await expect(getDOMLocal('/nonexistent.html')).rejects.toThrow();
    });

    test('should throw error on network failure', async () => {
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

        await expect(getDOMLocal('/test.html')).rejects.toThrow('Network error');
    });
});

describe('sendMessageAsync', () => {
    const { getBrowser } = require('../src/shared/browser');

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should send message and resolve with response', async () => {
        const mockBrowser = {
            runtime: {
                sendMessage: jest.fn((message, callback) => {
                    callback({ success: true, data: 'test' });
                }),
                lastError: null,
            },
        };
        getBrowser.mockReturnValue(mockBrowser);

        const message: BackgroundMessage = {
            request: BackgroundMessageType.getStatus,
            payload: undefined,
        };

        const result = await sendMessageAsync(message);

        expect(result).toEqual({ success: true, data: 'test' });
        expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith(message, expect.any(Function));
    });

    test('should reject if lastError is set', async () => {
        const mockBrowser = {
            runtime: {
                sendMessage: jest.fn((message, callback) => {
                    callback(null);
                }),
                lastError: { message: 'Error occurred' },
            },
        };
        getBrowser.mockReturnValue(mockBrowser);

        const message: BackgroundMessage = {
            request: BackgroundMessageType.getStatus,
            payload: undefined,
        };

        await expect(sendMessageAsync(message)).rejects.toEqual({ message: 'Error occurred' });
    });
});

describe('getDataFromStorage', () => {
    const { getBrowser } = require('../src/shared/browser');

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'debug').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should send getData message and return result', async () => {
        const mockData = [{ id: 1, value: 'test' }];
        const mockBrowser = {
            runtime: {
                sendMessage: jest.fn((message, callback) => {
                    callback(mockData);
                }),
                lastError: null,
            },
        };
        getBrowser.mockReturnValue(mockBrowser);

        const result = await getDataFromStorage(GetDataType.Sales, '12345', '2020-01-01', '2020-01-02', true);

        expect(result).toEqual(mockData);
        expect(console.debug).toHaveBeenCalled();
    });

    test('should handle optional parameters', async () => {
        const mockData: any[] = [];
        const mockBrowser = {
            runtime: {
                sendMessage: jest.fn((message, callback) => {
                    callback(mockData);
                }),
                lastError: null,
            },
        };
        getBrowser.mockReturnValue(mockBrowser);

        await getDataFromStorage(GetDataType.Reviews, '12345');

        expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                request: BackgroundMessageType.getData,
                payload: expect.objectContaining({
                    type: GetDataType.Reviews,
                    appId: '12345',
                }),
            }),
            expect.any(Function)
        );
    });
});

describe('getCountryRevenue', () => {
    const { getBrowser } = require('../src/shared/browser');

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'log').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should calculate revenue for a country', async () => {
        const mockSales: DateSales[] = [
            {
                date: '2020-01-01',
                bundleId: '',
                bundleName: '',
                productId: '',
                productName: '',
                type: '',
                game: '',
                platform: '',
                countryCode: 'US',
                country: 'United States',
                region: '',
                grossUnitsSold: 0,
                chargebacksOrReturns: 0,
                netUnitsSold: 0,
                basePrice: 0,
                salePrice: 0,
                currency: 'USD',
                grossSteamSalesUSD: 1000,
                chargebacksOrReturnsUSD: 0,
                vatOrTaxUSD: 0,
                netSteamSalesUSD: 1000,
                tag: '',
            },
            {
                date: '2020-01-02',
                bundleId: '',
                bundleName: '',
                productId: '',
                productName: '',
                type: '',
                game: '',
                platform: '',
                countryCode: 'US',
                country: 'United States',
                region: '',
                grossUnitsSold: 0,
                chargebacksOrReturns: 0,
                netUnitsSold: 0,
                basePrice: 0,
                salePrice: 0,
                currency: 'USD',
                grossSteamSalesUSD: 2000,
                chargebacksOrReturnsUSD: 0,
                vatOrTaxUSD: 0,
                netSteamSalesUSD: 2000,
                tag: '',
            },
            {
                date: '2020-01-01',
                bundleId: '',
                bundleName: '',
                productId: '',
                productName: '',
                type: '',
                game: '',
                platform: '',
                countryCode: 'GB',
                country: 'United Kingdom',
                region: '',
                grossUnitsSold: 0,
                chargebacksOrReturns: 0,
                netUnitsSold: 0,
                basePrice: 0,
                salePrice: 0,
                currency: 'GBP',
                grossSteamSalesUSD: 500,
                chargebacksOrReturnsUSD: 0,
                vatOrTaxUSD: 0,
                netSteamSalesUSD: 500,
                tag: '',
            },
        ];

        const mockBrowser = {
            runtime: {
                sendMessage: jest.fn((message, callback) => {
                    callback(mockSales);
                }),
                lastError: null,
            },
        };
        getBrowser.mockReturnValue(mockBrowser);

        const startDate = new Date('2020-01-01');
        const endDate = new Date('2020-01-02');
        const result = await getCountryRevenue('12345', 'United States', startDate, endDate);

        expect(result).toBe(3000);
        expect(console.log).toHaveBeenCalled();
    });

    test('should use default dates if not provided', async () => {
        const mockSales: DateSales[] = [];
        const mockBrowser = {
            runtime: {
                sendMessage: jest.fn((message, callback) => {
                    callback(mockSales);
                }),
                lastError: null,
            },
        };
        getBrowser.mockReturnValue(mockBrowser);

        await getCountryRevenue('12345', 'United States');

        expect(mockBrowser.runtime.sendMessage).toHaveBeenCalled();
    });

    test('should throw error if sales data is undefined', async () => {
        const mockBrowser = {
            runtime: {
                sendMessage: jest.fn((message, callback) => {
                    callback(undefined);
                }),
                lastError: null,
            },
        };
        getBrowser.mockReturnValue(mockBrowser);

        await expect(getCountryRevenue('12345', 'United States')).rejects.toThrow();
    });

    test('should return zero if country not found in sales', async () => {
        const mockSales: DateSales[] = [
            {
                date: '2020-01-01',
                bundleId: '',
                bundleName: '',
                productId: '',
                productName: '',
                type: '',
                game: '',
                platform: '',
                countryCode: 'GB',
                country: 'United Kingdom',
                region: '',
                grossUnitsSold: 0,
                chargebacksOrReturns: 0,
                netUnitsSold: 0,
                basePrice: 0,
                salePrice: 0,
                currency: 'GBP',
                grossSteamSalesUSD: 500,
                chargebacksOrReturnsUSD: 0,
                vatOrTaxUSD: 0,
                netSteamSalesUSD: 500,
                tag: '',
            },
        ];

        const mockBrowser = {
            runtime: {
                sendMessage: jest.fn((message, callback) => {
                    callback(mockSales);
                }),
                lastError: null,
            },
        };
        getBrowser.mockReturnValue(mockBrowser);

        const result = await getCountryRevenue('12345', 'United States');
        expect(result).toBe(0);
    });
});

