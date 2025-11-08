import { Chart } from "chart.js";

export class WishlistsData {
  data: any[] = [];
}

export class WishlistConversionsData {
  data: any[] = [];
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
