export class GameDataWishlists {
    date: string = "";
    adds: number = 0;
    deletes: number = 0;
    gifts: number = 0;
    activations: number = 0;
    regionalData: Record<string, number> = {};
}

export class GameDataWishlistConversions {
    date: string = "";
    month: string = "";
    purchasesAndActivations: number = 0;
    gifts: number = 0;
    totalConversions: number = 0;
}

export class GameDataTraffic {
    date: string = "";
    categories: Record<string, Record<string, number>> = {};
}

export class GameDataSales {
    date: string = "";
    bundleId: string = "";
    bundleName: string = "";
    productId: string = "";
    productName: string = "";
    type: string = "";
    game: string = "";
    platform: string = "";
    countryCode: string = "";
    country: string = "";
    region: string = "";
    grossUnitsSold: number = 0  ;
    chargebacksOrReturns: number = 0;
    netUnitsSold: number = 0;
    basePrice: number = 0;
    salePrice: number = 0;
    currency: string = "";
    grossSteamSalesUSD: number = 0;
    chargebacksOrReturnsUSD: number = 0;
    vatOrTaxUSD: number = 0;
    netSteamSalesUSD: number = 0;
    tag: string = "";
}
