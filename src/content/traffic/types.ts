export enum TrafficChartDataType {
    Impressions = 'Impressions',
    Visits = 'Visits',
    ClickThroughRate = 'Click Through Rate',
}

export enum TrafficPresetType {
    Clear = 'Clear (Total)',
    Top5 = 'Top5',
    Top10 = 'Top10',
    External = 'External websites',
}

export class TrafficTypeSelection {
    type: TrafficChartDataType = TrafficChartDataType.Visits;
}

export class TrafficCategorySelection {
    categories: string[] = [];
    subcategories: TrafficCategorySubcategory[] = [];
}

export class TrafficCategorySubcategory {
    category: string = '';
    subCategory: string = '';
}
