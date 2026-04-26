export type DateSales = {
    date: string;
    bundleId: string;
    bundleName: string;
    productId: string;
    productName: string;
    type: string;
    game: string;
    platform: string;
    countryCode: string;
    country: string;
    region: string;
    grossUnitsSold: number;
    chargebacksOrReturns: number;
    netUnitsSold: number;
    basePrice: number;
    salePrice: number;
    currency: string;
    grossSteamSalesUSD: number;
    chargebacksOrReturnsUSD: number;
    vatOrTaxUSD: number;
    netSteamSalesUSD: number;
    tag: string;
}

export const dateSalesFieldMap: Record<string, keyof DateSales> = {
    'Date': 'date',
    'Bundle(ID#)': 'bundleId',
    'Bundle Name': 'bundleName',
    'Product(ID#)': 'productId',
    'Product Name': 'productName',
    'Type': 'type',
    'Game': 'game',
    'Platform': 'platform',
    'Country Code': 'countryCode',
    'Country': 'country',
    'Region': 'region',
    'Gross Units Sold': 'grossUnitsSold',
    'Chargeback/Returns': 'chargebacksOrReturns',
    'Net Units Sold': 'netUnitsSold',
    'Base Price': 'basePrice',
    'Sale Price': 'salePrice',
    'Currency': 'currency',
    'Gross Steam Sales (USD)': 'grossSteamSalesUSD',
    'Chargeback/Returns (USD)': 'chargebacksOrReturnsUSD',
    'VAT/Tax (USD)': 'vatOrTaxUSD',
    'Net Steam Sales (USD)': 'netSteamSalesUSD',
    'Tag': 'tag',
};
