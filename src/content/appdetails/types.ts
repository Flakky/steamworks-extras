export type SalesData = {
    allSales: Record<string, any>;
    periodSales: Record<string, any>;
    usRevenue: number;
    periodUsRevenue: number;
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
