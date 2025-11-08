import { dateToString } from "../../scripts/helpers";

export class DateRange {
  dateStart: Date;
  dateEnd: Date;

  constructor(dateStart: Date, dateEnd: Date) {
    this.dateStart = dateStart;
    this.dateEnd = dateEnd;
  }
}

/**
 * Checks if a given date is in a given date range.
 *
 * @param {Date} date - Date to check
 * @param {DateRange} dateRange - Date range to check
 * @returns {boolean} - True if the date is in the range, false otherwise
 */
export const isDateInRange = (date: Date, dateRange: DateRange): boolean => {
  const start = new Date(dateRange.dateStart.getFullYear(), dateRange.dateStart.getMonth(), dateRange.dateStart.getUTCDate());
  const end = new Date(dateRange.dateEnd.getFullYear(), dateRange.dateEnd.getMonth(), dateRange.dateEnd.getUTCDate(), 23, 59, 59, 999);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getUTCDate(), 12, 0, 0, 0); // To be sure the date is inside start and end

  return target >= start && target <= end;
}

/**
 * Corrects a given date range to be a full day.
 *
 * @param {DateRange} dateRange - Date range to correct
 *
 * @example
 * // returns 2025-01-01 00:00:00 and 2025-01-02 23:59:59
 * correctDateRange(new Date('2025-01-01'), new Date('2025-01-02'));
 */
export const correctDateRange = (dateRange: DateRange) => {
  dateRange.dateStart = new Date(Date.UTC(
    dateRange.dateStart.getUTCFullYear(),
    dateRange.dateStart.getUTCMonth(),
    dateRange.dateStart.getUTCDate(),
    0, 0, 0, 0
  ));

  dateRange.dateEnd = new Date(Date.UTC(
    dateRange.dateEnd.getUTCFullYear(),
    dateRange.dateEnd.getUTCMonth(),
    dateRange.dateEnd.getUTCDate(),
    23, 59, 59, 999
  ));
}

/**
 * Returns an array of dates between a given date range.
 *
 * @param {DateRange} dateRange - Date range to get the array of dates from
 * @param {boolean} reverse - [Optional] If true, the array will be reversed
 * @param {boolean} outputDateStrings - [Optional] If true, the array will contain date strings instead of Date objects
 * @returns {Array} - Array of dates
 *
 * @example
 * // returns ['2020-01-20', '2020-01-21', '2020-01-22']
 * getDateRangeArray(new Date('2020-01-20'), new Date('2020-01-22'));
 */
export const getDateRangeArray = (dateRange: DateRange, reverse?: boolean, outputDateStrings?: boolean): Array<Date | string> => {
  const days: Array<Date | string> = [];

  let day = new Date(dateRange.dateStart);
  while (day <= dateRange.dateEnd) {
    if (outputDateStrings) {
      const formattedDate = dateToString(day);
      days.push(formattedDate);
    }
    else days.push(new Date(day))

    // Move to the next day
    day.setDate(day.getDate() + 1);
  }

  if (reverse) days.reverse();

  return days;
}
