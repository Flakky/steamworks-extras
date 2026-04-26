export type GameTraffic = {
    date: string;
    categories: Record<string, PageCategoryTraffic>;
}

export type PageCategoryTraffic = {
    impressions: number;
    visits: number;
    ownerImpressions: number;
    ownerVisits: number;
    featureTraffic: Record<string, PageFeatureTraffic>;
}

export type PageFeatureTraffic = {
    impressions: number;
    visits: number;
    ownerImpressions: number;
    ownerVisits: number;
}

export type DateTraffic = {
    date: string;
    impressions: number;
    visits: number;
    ownerImpressions: number;
    ownerVisits: number;
    pageCategory: string;
    pageFeature: string;
}

export const dateTrafficFieldMap: Record<string, keyof DateTraffic> = {
    'Date': 'date',
    'Impressions': 'impressions',
    'Visits': 'visits',
    'Owner Impressions': 'ownerImpressions',
    'Owner Visits': 'ownerVisits',
    'Page / Category': 'pageCategory',
    'Page / Feature': 'pageFeature',
}
