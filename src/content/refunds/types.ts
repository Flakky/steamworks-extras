export enum RefundsRangeSplit {
  Lifetime = 0,
  LastWeek = 1,
  LastMonth = 2
}

export class RefundsRegionSelection {
  selectedCountries: string[] = [];
  regions: string[] = [];
}

export enum RefundsTableSplitType {
  Month = "Month",
  Country = "Country",
  Region = "Region",
  Currency = "Currency",
  Platform = "Platform"
}

export enum RefundsChartSplitType {
  Total = "Total",
  Country = "Country",
  Region = "Region",
  Currency = "Currency",
  Platform = "Platform"
}

export enum RefundsChartValueType {
  RefundPercent = "Refund %",
  TotalRefunds = "Total Refunds"
}

export class RefundsChartSelection {
  split: RefundsChartSplitType = RefundsChartSplitType.Total;
  valueType: RefundsChartValueType = RefundsChartValueType.RefundPercent;
}
