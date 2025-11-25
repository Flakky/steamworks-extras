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
    regionalData: Record<string, number>;
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
