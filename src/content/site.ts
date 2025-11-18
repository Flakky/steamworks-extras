import { defaultSettings } from "../data/defaultsettings";
import { correctDateRange, getCalculationToday, isStringEmpty, dateFromString } from "../scripts/helpers";
import { getBrowser } from "../shared/browser";
import { DateRange } from "../shared/types/daterange";

export const readChartColors = async (): Promise<Record<string, string>> => {
    const jsonFilePath = getBrowser().runtime.getURL('data/chartcolors.json');

    const response = await fetch(jsonFilePath);
    const chartColors = await response.json();

    return chartColors;
};

export const getDefaultSettings = async (): Promise<Record<string, any>> => {
    const settings = await getBrowser().storage.local.get(defaultSettings);
    return settings;
};

export const getCurrentURL = (): string => {
    return window.location.href;
};

/**
 * Gets the date range from the URL. The URL should be in the format:
 * https://partner.steampowered.com/app/details/AppID/?dateStart=2024-08-21&dateEnd=2024-08-27
 * @param url - The URL to get the date range from
 * @returns The date range
 */
export const getDateRangeFromURL = (url: string): DateRange => {
    const urlObj = new URL(url);
    const urlParams = urlObj.searchParams

    const dateStartString: string = urlParams.get('dateStart') || '';
    const dateEndString: string = urlParams.get('dateEnd') || '';

    let today = getCalculationToday();

    let dateStart = today;
    let dateEnd = today;

    const isToday = urlParams.get('specialPeriod') === 'today'
        || (!urlParams.has('dateStart') && !urlParams.has('dateEnd'));

    if (!isToday) {
        if (!isStringEmpty(dateStartString)) dateStart = dateFromString(dateStartString);
        if (!isStringEmpty(dateEndString)) dateEnd = dateFromString(dateEndString);
    }

    correctDateRange(dateStart, dateEnd);

    return new DateRange(dateStart, dateEnd);
}
