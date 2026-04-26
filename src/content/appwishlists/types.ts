import { Chart } from "chart.js";
import { GameWishlists, GameWishlistConversions } from "../../shared/types/wishlists";

export class WishlistsData {
    data: GameWishlists[] = [];
}

export class WishlistConversionsData {
    data: GameWishlistConversions[] = [];
}

export class WishlistChart {
    chart: Chart | null = null;
    wishlistChartType: WishlistChartType = WishlistChartType.Actions;
    chartColors: Record<string, string> = {};
}

export class WishlistRegionSelection {
    selectedCountries: string[] = [];
    regions: string[] = [];
}

export enum WishlistTableType {
    Date = 'Date',
    Country = 'Country',
    Region = 'Region'
}

export class WishlistTableTypeSelection {
    type: WishlistTableType = WishlistTableType.Date;
}

export type WishlistTableData = {
    split: string;
    adds: number;
    deletes: number;
    gifts: number;
    activations: number;
}


export enum WishlistChartType {
    Actions = 'Actions',
    Country = 'Country',
    Region = 'Region'
}

export enum WishlistChartActionsType {
    Adds = 'Adds',
    Deletes = 'Deletes',
    Gifts = 'Gifts',
    Activations = 'Activations'
}
