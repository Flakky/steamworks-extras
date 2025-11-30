export type DateWishlists = {
    date: string;
    adds: number;
    deletes: number;
    gifts: number;
    activations: number;
    [region: string]: number | string; // region names as keys (should be number), date as string
}

export type GameWishlists = {
    date: string;
    adds: number;
    deletes: number;
    gifts: number;
    activations: number;
    regionalData: Record<string, GameWishlistsWithRegionalData>;
}

export type GameWishlistsWithRegionalData = {
    adds: number;
    deletes: number;
    gifts: number;
    activations: number;
}

export const dateWishlistsFieldMap: Record<string, keyof DateWishlists> = {
    'DateLocal': 'date',
    'Adds': 'adds',
    'Deletes': 'deletes',
    'Gifts': 'gifts',
    'PurchasesAndActivations': 'activations',
}

export type GameWishlistConversions = {
    date: string;
    monthConversions: Record<string, GameWishlistMonthConversions>;
}

export type GameWishlistMonthConversions = {
    totalConversions: number;
    gifts: number
    purchasesAndActivations: number;
}

export type DateWishlistConversions = {
    date: string;
    month: string;
    purchasesAndActivations: number;
    gifts: number
    totalConversions: number;
}

export const dateWishlistConversionsFieldMap: Record<string, keyof DateWishlistConversions> = {
    'DateLocal': 'date',
    'MonthCohort': 'month',
    'PurchasesAndActivations': 'purchasesAndActivations',
    'Gifts': 'gifts',
    'TotalConversions': 'totalConversions',
}

export type DateWishlistRegional = {
    date: string;
    country: string;
    region: string;
    adds: number;
    deletes: number;
    gifts: number;
    activations: number;
}

export const dateWishlistRegionalFieldMap: Record<string, keyof DateWishlistRegional> = {
    'DateLocal': 'date',
    'Country': 'country',
    'Region': 'region',
    'Adds': 'adds',
    'Deletes': 'deletes',
    'Gifts': 'gifts',
    'PurchasesAndActivations': 'activations',
}