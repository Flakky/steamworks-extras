export enum TrafficChartDataType {
  Impressions = 'Impressions',
  Visits = 'Visits',
  ClickThroughRate = 'Click Through Rate',
}

export class TrafficCategorySelection {
  categories: string[] = [];
  subcategories: TrafficCategorySubcategory[] = [];
}

export class TrafficCategorySubcategory {
  category: string = '';
  subCategory: string = '';
}
