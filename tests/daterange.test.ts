import { DateRange, isDateInRange, correctDateRange, getDateRangeArray, isSingleDay } from '../src/shared/types/daterange';
import { dateToString } from '../src/scripts/helpers';

describe('DateRange', () => {
    test('should create a DateRange with start and end dates', () => {
        const start = new Date('2025-01-01');
        const end = new Date('2025-01-02');
        const dateRange = new DateRange(start, end);

        expect(dateRange.dateStart).toEqual(start);
        expect(dateRange.dateEnd).toEqual(end);
    });

    test('should allow same date for start and end', () => {
        const date = new Date('2025-01-01');
        const dateRange = new DateRange(date, date);

        expect(dateRange.dateStart).toEqual(date);
        expect(dateRange.dateEnd).toEqual(date);
    });
});

describe('isDateInRange', () => {
    test('should return true when date is within range', () => {
        const dateRange = new DateRange(
            new Date('2025-01-01'),
            new Date('2025-01-05')
        );
        const date = new Date('2025-01-03');

        expect(isDateInRange(date, dateRange)).toBe(true);
    });

    test('should return true when date equals start date', () => {
        const startDate = new Date('2025-01-01');
        const dateRange = new DateRange(startDate, new Date('2025-01-05'));

        expect(isDateInRange(startDate, dateRange)).toBe(true);
    });

    test('should return true when date equals end date', () => {
        const endDate = new Date('2025-01-05');
        const dateRange = new DateRange(new Date('2025-01-01'), endDate);

        expect(isDateInRange(endDate, dateRange)).toBe(true);
    });

    test('should return false when date is before start date', () => {
        const dateRange = new DateRange(
            new Date('2025-01-05'),
            new Date('2025-01-10')
        );
        const date = new Date('2025-01-01');

        expect(isDateInRange(date, dateRange)).toBe(false);
    });

    test('should return false when date is after end date', () => {
        const dateRange = new DateRange(
            new Date('2025-01-01'),
            new Date('2025-01-05')
        );
        const date = new Date('2025-01-10');

        expect(isDateInRange(date, dateRange)).toBe(false);
    });

    test('should handle dates with different times correctly', () => {
        const dateRange = new DateRange(
            new Date('2025-01-01T00:00:00Z'),
            new Date('2025-01-05T23:59:59Z')
        );
        const dateEarly = new Date('2025-01-03T00:00:00Z');
        const dateMid = new Date('2025-01-03T12:00:00Z');
        const dateLate = new Date('2025-01-03T23:59:59Z');

        expect(isDateInRange(dateEarly, dateRange)).toBe(true);
        expect(isDateInRange(dateMid, dateRange)).toBe(true);
        expect(isDateInRange(dateLate, dateRange)).toBe(true);
    });

    test('should handle single day range', () => {
        const date = new Date('2025-01-15');
        const dateRange = new DateRange(date, date);

        expect(isDateInRange(date, dateRange)).toBe(true);
    });

    test('should handle dates across month boundaries', () => {
        const dateRange = new DateRange(
            new Date('2025-01-28'),
            new Date('2025-02-03')
        );
        const dateInRange = new Date('2025-01-30');
        const dateOutOfRange = new Date('2025-02-05');

        expect(isDateInRange(dateInRange, dateRange)).toBe(true);
        expect(isDateInRange(dateOutOfRange, dateRange)).toBe(false);
    });

    test('should handle dates across year boundaries', () => {
        const dateRange = new DateRange(
            new Date('2024-12-28'),
            new Date('2025-01-03')
        );
        const dateInRange = new Date('2025-01-01');
        const dateOutOfRange = new Date('2025-01-05');

        expect(isDateInRange(dateInRange, dateRange)).toBe(true);
        expect(isDateInRange(dateOutOfRange, dateRange)).toBe(false);
    });
});

describe('correctDateRange', () => {
    test('should set start date to beginning of day (00:00:00 UTC)', () => {
        const dateRange = new DateRange(
            new Date('2025-01-15T12:30:45Z'),
            new Date('2025-01-20T18:20:10Z')
        );

        correctDateRange(dateRange);

        expect(dateRange.dateStart.getUTCHours()).toBe(0);
        expect(dateRange.dateStart.getUTCMinutes()).toBe(0);
        expect(dateRange.dateStart.getUTCSeconds()).toBe(0);
        expect(dateRange.dateStart.getUTCMilliseconds()).toBe(0);
    });

    test('should set end date to end of day (23:59:59.999 UTC)', () => {
        const dateRange = new DateRange(
            new Date('2025-01-15T12:30:45Z'),
            new Date('2025-01-20T18:20:10Z')
        );

        correctDateRange(dateRange);

        expect(dateRange.dateEnd.getUTCHours()).toBe(23);
        expect(dateRange.dateEnd.getUTCMinutes()).toBe(59);
        expect(dateRange.dateEnd.getUTCSeconds()).toBe(59);
        expect(dateRange.dateEnd.getUTCMilliseconds()).toBe(999);
    });

    test('should preserve the date part while correcting time', () => {
        const startDate = new Date('2025-01-15T12:30:45Z');
        const endDate = new Date('2025-01-20T18:20:10Z');
        const dateRange = new DateRange(startDate, endDate);

        correctDateRange(dateRange);

        expect(dateRange.dateStart.getUTCFullYear()).toBe(2025);
        expect(dateRange.dateStart.getUTCMonth()).toBe(0); // January is 0
        expect(dateRange.dateStart.getUTCDate()).toBe(15);

        expect(dateRange.dateEnd.getUTCFullYear()).toBe(2025);
        expect(dateRange.dateEnd.getUTCMonth()).toBe(0);
        expect(dateRange.dateEnd.getUTCDate()).toBe(20);
    });

    test('should work with dates that already have correct times', () => {
        const dateRange = new DateRange(
            new Date('2025-01-15T00:00:00Z'),
            new Date('2025-01-20T23:59:59.999Z')
        );

        correctDateRange(dateRange);

        expect(dateRange.dateStart.getUTCHours()).toBe(0);
        expect(dateRange.dateEnd.getUTCHours()).toBe(23);
    });

    test('should modify the dateRange object in place', () => {
        const originalStart = new Date('2025-01-15T12:30:45Z');
        const originalEnd = new Date('2025-01-20T18:20:10Z');
        const dateRange = new DateRange(originalStart, originalEnd);

        correctDateRange(dateRange);

        // The dates should be different objects with corrected times
        expect(dateRange.dateStart).not.toBe(originalStart);
        expect(dateRange.dateEnd).not.toBe(originalEnd);
    });
});

describe('getDateRangeArray', () => {
    test('should return array of Date objects by default', () => {
        const dateRange = new DateRange(
            new Date('2025-01-20'),
            new Date('2025-01-22')
        );

        const result = getDateRangeArray(dateRange);

        expect(result).toHaveLength(3);
        expect(result[0]).toBeInstanceOf(Date);
        expect(result[1]).toBeInstanceOf(Date);
        expect(result[2]).toBeInstanceOf(Date);
    });

    test('should include all dates in range', () => {
        const dateRange = new DateRange(
            new Date('2025-01-20'),
            new Date('2025-01-22')
        );

        const result = getDateRangeArray(dateRange) as Date[];

        expect(dateToString(result[0])).toBe('2025-01-20');
        expect(dateToString(result[1])).toBe('2025-01-21');
        expect(dateToString(result[2])).toBe('2025-01-22');
    });

    test('should include single day when start equals end', () => {
        const date = new Date('2025-01-20');
        const dateRange = new DateRange(date, date);

        const result = getDateRangeArray(dateRange);

        expect(result).toHaveLength(1);
        expect(dateToString(result[0] as Date)).toBe('2025-01-20');
    });

    test('should return date strings when outputDateStrings is true', () => {
        const dateRange = new DateRange(
            new Date('2025-01-20'),
            new Date('2025-01-22')
        );

        const result = getDateRangeArray(dateRange, false, true) as string[];

        expect(result).toHaveLength(3);
        expect(typeof result[0]).toBe('string');
        expect(result[0]).toBe('2025-01-20');
        expect(result[1]).toBe('2025-01-21');
        expect(result[2]).toBe('2025-01-22');
    });

    test('should reverse array when reverse is true', () => {
        const dateRange = new DateRange(
            new Date('2025-01-20'),
            new Date('2025-01-22')
        );

        const result = getDateRangeArray(dateRange, true) as Date[];

        expect(result).toHaveLength(3);
        expect(dateToString(result[0])).toBe('2025-01-22');
        expect(dateToString(result[1])).toBe('2025-01-21');
        expect(dateToString(result[2])).toBe('2025-01-20');
    });

    test('should reverse date strings when both reverse and outputDateStrings are true', () => {
        const dateRange = new DateRange(
            new Date('2025-01-20'),
            new Date('2025-01-22')
        );

        const result = getDateRangeArray(dateRange, true, true) as string[];

        expect(result).toHaveLength(3);
        expect(result[0]).toBe('2025-01-22');
        expect(result[1]).toBe('2025-01-21');
        expect(result[2]).toBe('2025-01-20');
    });

    test('should handle range across month boundaries', () => {
        const dateRange = new DateRange(
            new Date('2025-01-30'),
            new Date('2025-02-02')
        );

        const result = getDateRangeArray(dateRange, false, true) as string[];

        expect(result).toHaveLength(4);
        expect(result[0]).toBe('2025-01-30');
        expect(result[1]).toBe('2025-01-31');
        expect(result[2]).toBe('2025-02-01');
        expect(result[3]).toBe('2025-02-02');
    });

    test('should handle range across year boundaries', () => {
        const dateRange = new DateRange(
            new Date('2024-12-30'),
            new Date('2025-01-02')
        );

        const result = getDateRangeArray(dateRange, false, true) as string[];

        expect(result).toHaveLength(4);
        expect(result[0]).toBe('2024-12-30');
        expect(result[1]).toBe('2024-12-31');
        expect(result[2]).toBe('2025-01-01');
        expect(result[3]).toBe('2025-01-02');
    });

    test('should handle longer date ranges', () => {
        const dateRange = new DateRange(
            new Date('2025-01-01'),
            new Date('2025-01-07')
        );

        const result = getDateRangeArray(dateRange);

        expect(result).toHaveLength(7);
    });

    test('should work with corrected date ranges', () => {
        const dateRange = new DateRange(
            new Date('2025-01-20T12:30:45Z'),
            new Date('2025-01-22T18:20:10Z')
        );
        correctDateRange(dateRange);

        const result = getDateRangeArray(dateRange, false, true) as string[];

        expect(result).toHaveLength(3);
        expect(result[0]).toBe('2025-01-20');
        expect(result[1]).toBe('2025-01-21');
        expect(result[2]).toBe('2025-01-22');
    });

    test('should create new Date objects (not references)', () => {
        const dateRange = new DateRange(
            new Date('2025-01-20'),
            new Date('2025-01-21')
        );

        const result = getDateRangeArray(dateRange) as Date[];

        // Modify the first date
        result[0].setDate(25);

        // Original dateRange should not be affected
        expect(dateToString(dateRange.dateStart)).toBe('2025-01-20');
    });
});

describe('isSingleDay', () => {
    test('should return true when start and end are the same date', () => {
        const date = new Date('2025-01-15');
        const dateRange = new DateRange(date, date);

        expect(isSingleDay(dateRange)).toBe(true);
    });

    test('should return true when dates are the same day but different times', () => {
        const dateRange = new DateRange(
            new Date('2025-01-15T00:00:00Z'),
            new Date('2025-01-15T23:59:59Z')
        );

        expect(isSingleDay(dateRange)).toBe(true);
    });

    test('should return true when dates are the same day with different UTC times', () => {
        const dateRange = new DateRange(
            new Date('2025-01-15T12:30:45Z'),
            new Date('2025-01-15T18:20:10Z')
        );

        expect(isSingleDay(dateRange)).toBe(true);
    });

    test('should return false when dates are different days in same month', () => {
        const dateRange = new DateRange(
            new Date('2025-01-15'),
            new Date('2025-01-16')
        );

        expect(isSingleDay(dateRange)).toBe(false);
    });

    test('should return false when dates span multiple days', () => {
        const dateRange = new DateRange(
            new Date('2025-01-15'),
            new Date('2025-01-20')
        );

        expect(isSingleDay(dateRange)).toBe(false);
    });

    test('should return false when dates are different months', () => {
        const dateRange = new DateRange(
            new Date('2025-01-31'),
            new Date('2025-02-01')
        );

        expect(isSingleDay(dateRange)).toBe(false);
    });

    test('should return false when dates are different years', () => {
        const dateRange = new DateRange(
            new Date('2024-12-31'),
            new Date('2025-01-01')
        );

        expect(isSingleDay(dateRange)).toBe(false);
    });

    test('should return false when dates are same day number but different months', () => {
        const dateRange = new DateRange(
            new Date('2025-01-15'),
            new Date('2025-02-15')
        );

        expect(isSingleDay(dateRange)).toBe(false);
    });

    test('should return false when dates are same day and month but different years', () => {
        const dateRange = new DateRange(
            new Date('2024-01-15'),
            new Date('2025-01-15')
        );

        expect(isSingleDay(dateRange)).toBe(false);
    });

    test('should work correctly after correctDateRange is called', () => {
        const dateRange = new DateRange(
            new Date('2025-01-15T12:30:45Z'),
            new Date('2025-01-15T18:20:10Z')
        );
        correctDateRange(dateRange);

        expect(isSingleDay(dateRange)).toBe(true);
    });

    test('should return false for multi-day range after correctDateRange is called', () => {
        const dateRange = new DateRange(
            new Date('2025-01-15T12:30:45Z'),
            new Date('2025-01-20T18:20:10Z')
        );
        correctDateRange(dateRange);

        expect(isSingleDay(dateRange)).toBe(false);
    });
});

