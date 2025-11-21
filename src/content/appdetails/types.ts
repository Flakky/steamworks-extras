import { Review } from "../../shared/types/review";

export type SalesData = {
    allSales: Record<string, any>;
    periodSales: Record<string, any>;
    usRevenue: number;
    periodUsRevenue: number;
}

export type ReviewsData = {
    reviews: Review[];
}

export type RevenueMap = {
    gross: number;
    net: number;
    royaltyAfterSteamShare: number;
    royaltyAfterUSShare: number;
    royaltyAfterExtraGrossTake: number;
    royaltyAfterExtraNetTake: number;
    revenueAfterOtherRoyalties: number;
    revenueAfterTax: number;
    finalRevenue: number;
}

export type RoyaltiesAndTaxesMap = {
    usSalesTax: number;
    grossRoyalties: number;
    netRoyalties: number;
    otherRoyalties: number;
    localTax: number;
    royaltiesAfterTax: number;
}

export enum ReviewChartSplit {
    Total = 'Total',
    Vote = 'Vote',
    Language = 'Language',
}

export type SalesChartViewSelection = {
    split: SalesChartSplit;
    valueType: SalesChartValueType;
}

export enum SalesChartSplit {
    Total = 'Total',
    Country = 'Country',
    Region = 'Region',
    Currency = 'Currency',
    Platform = 'Platform',
}

export enum SalesChartValueType {
    GrossSteamSalesUSD = 'Gross Steam Sales (USD)',
    NetSteamSalesUSD = 'Net Steam Sales (USD)',
    GrossUnitsSold = 'Gross Units Sold',
    NetUnitsSold = 'Net Units Sold',
    ChargebackReturns = 'Chargeback/Returns',
    ChargebackReturnsUSD = 'Chargeback/Returns (USD)',
}
