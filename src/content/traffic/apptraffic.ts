import '../../shared/log';
import { getDefaultSettings, readChartColors } from "../site";
import { addStatusBlockToPage } from "../../shared/statusblock";
import { DateRange } from "../../shared/types/daterange";
import { hideOldElements } from "./layout";
import { dateToString, getDataFromStorage } from "../../scripts/helpers";
import { TrafficCategorySelection, TrafficChartDataType, TrafficPresetType } from "./types";
import { createChart, updateTrafficChart } from "./chart";
import { addTableCheckboxes, getExternalWebsiteSubcategories, getTopCategories, updateSelectedChartCategories } from "./table";
import { createCheckPresets } from "./presets";
import { GameTraffic } from "../../shared/types/traffic";
import { GetDataType } from "../../shared/types/background_requests";

const init = async () => {
    console.log("Init");

    const settings = await getDefaultSettings();
    if (!settings) {
        throw new Error('Settings not found');
    }

    const chartColors = await readChartColors();
    if (!chartColors) {
        throw new Error('Chart colors not found');
    }

    const appID = getAppID();
    if (!appID) {
        throw new Error('App ID not found');
    }

    const doc = document;

    const trafficData = await getTrafficData(doc, appID);
    if (!trafficData) {
        throw new Error('Traffic data not found');
    }

    hideOldElements(doc);

    const categorySelection = new TrafficCategorySelection();

    const trafficChart = createChart(doc, trafficData, TrafficChartDataType.Impressions, categorySelection, chartColors);

    addTableCheckboxes(doc, categorySelection, (catSelection: TrafficCategorySelection) => {
        updateTrafficChart(doc, trafficData, trafficChart, TrafficChartDataType.Impressions, catSelection, chartColors);
    });


    addStatusBlockToPage();

    createCheckPresets(doc, (preset: TrafficPresetType) => {
        switch (preset) {
            case TrafficPresetType.Clear:
                categorySelection.categories = [];
                categorySelection.subcategories = [];
                break;
            case TrafficPresetType.Top5:
                categorySelection.categories = getTopCategories(doc, 5);
                break;
            case TrafficPresetType.Top10:
                categorySelection.categories = getTopCategories(doc, 10);
                break;
            case TrafficPresetType.External:
                categorySelection.subcategories = getExternalWebsiteSubcategories(doc).map(subcategory => ({ category: 'External', subCategory: subcategory }));
                break;
        }

        updateSelectedChartCategories(doc, categorySelection);
        updateTrafficChart(doc, trafficData, trafficChart, TrafficChartDataType.Impressions, categorySelection, chartColors);
    });
}

const getAppID = () => {
    const url = window.location.href;

    // Regular expression to extract the appID
    const regex = /navtrafficstats\/(\d+)/;
    const match = url.match(regex);

    if (!match) return;

    return match[1];
}

export const getDateRangeOfCurrentPage = (doc: Document): DateRange => {
    const startDateElem = doc.getElementById('start_date') as HTMLInputElement;
    const endDateElem = doc.getElementById('end_date') as HTMLInputElement;

    if (!startDateElem || !endDateElem) {
        throw new Error('Start or end date element not found');
    }

    const dateStart = new Date(startDateElem.value);
    const dateEnd = new Date(endDateElem.value);

    return { dateStart, dateEnd };
}

const getTrafficData = async (doc: Document, appID: string): Promise<GameTraffic[]> => {
    console.log("Requesting traffic data");

    const { dateStart, dateEnd } = getDateRangeOfCurrentPage(doc);

    const trafficData = await getDataFromStorage(
        GetDataType.Traffic,
        appID,
        dateToString(dateStart),
        dateToString(dateEnd),
        true
    );

    return trafficData as GameTraffic[];
}

init();
