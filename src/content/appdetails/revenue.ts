import { getSummaryTable } from "./layout";
import { RevenueMap, RoyaltiesAndTaxesMap } from "./types";

export const getTotalRevenue = (doc: Document, gross: boolean): number => {
    const table = getSummaryTable(doc);
    if (!table) return 0;

    const rows = table.rows;
    const revenueCell = rows[gross ? 0 : 1].cells[1];

    let revenue = revenueCell.textContent.split(' ')[0]; // Remove percentage if shown by settings

    revenue = revenue.replace('$', '');
    revenue = revenue.replace(/,/g, '');

    const revenueNumber = parseInt(revenue);

    return revenueNumber;
}

export const getRevenueMap = (gross: number, net: number, usGross: number, royaltiesAndTaxes: RoyaltiesAndTaxesMap): RevenueMap => {
    const shareMap = getRevenuePercentageMap(gross, net, usGross, royaltiesAndTaxes);

    return {
        gross: gross,
        net: net,
        royaltyAfterSteamShare: gross * shareMap.royaltyAfterSteamShare,
        royaltyAfterUSShare: gross * shareMap.royaltyAfterUSShare,
        royaltyAfterExtraGrossTake: gross * shareMap.royaltyAfterExtraGrossTake,
        royaltyAfterExtraNetTake: gross * shareMap.royaltyAfterExtraNetTake,
        revenueAfterOtherRoyalties: gross * shareMap.revenueAfterOtherRoyalties,
        revenueAfterTax: gross * shareMap.revenueAfterTax,
        finalRevenue: gross * shareMap.finalRevenue,
    }
}

export const getRevenuePercentageMap = (gross: number, net: number, usGross: number, royaltiesAndTaxes: RoyaltiesAndTaxesMap): RevenueMap => {
    const usRevenueShare = (usGross <= 0 ? 0 : usGross) * (gross <= 0 ? 0 : 1 / gross);

    const grossShare = 1.0;
    const netShare = net / gross;
    const royaltyAfterSteamShare = netShare * 0.7;

    const royaltyAfterUSShare = royaltyAfterSteamShare - (((netShare * usRevenueShare) * 0.7) * royaltiesAndTaxes.usSalesTax / 100);
    const royaltyAfterExtraGrossTake = royaltyAfterUSShare - (grossShare * (royaltiesAndTaxes.grossRoyalties / 100));
    const royaltyAfterExtraNetTake = royaltyAfterExtraGrossTake - (royaltyAfterExtraGrossTake * (royaltiesAndTaxes.netRoyalties / 100));
    const revenueAfterOtherRoyalties = royaltyAfterExtraNetTake - (royaltyAfterExtraNetTake * (royaltiesAndTaxes.otherRoyalties / 100));
    const revenueAfterTax = revenueAfterOtherRoyalties - (revenueAfterOtherRoyalties * (royaltiesAndTaxes.localTax / 100));
    const finalRevenue = revenueAfterTax - (revenueAfterTax * (royaltiesAndTaxes.royaltiesAfterTax / 100));

    return {
        gross: grossShare,
        net: netShare,
        royaltyAfterSteamShare: royaltyAfterSteamShare,
        royaltyAfterUSShare: royaltyAfterUSShare,
        royaltyAfterExtraGrossTake: royaltyAfterExtraGrossTake,
        royaltyAfterExtraNetTake: royaltyAfterExtraNetTake,
        revenueAfterOtherRoyalties: revenueAfterOtherRoyalties,
        revenueAfterTax: revenueAfterTax,
        finalRevenue: finalRevenue,
    };
}
