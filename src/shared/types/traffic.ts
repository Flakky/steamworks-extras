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
