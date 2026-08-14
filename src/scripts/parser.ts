import { findElementByText, isStringEmpty, tryConvertStringToNumber } from "./helpers";

export const parseDocument = (htmlText: string, parseType: string): { success: boolean; result: any } => {
    console.log('Parsing document: ', parseType);

    let result: any = null;
    let success = true;

    try {
        const domParser = new DOMParser();
        const doc = domParser.parseFromString(htmlText, 'text/html');

        switch (parseType) {
            case 'parsePackageID':
                result = parsePackageIDs(doc);
                break;
            case 'parseWishlistData':
                result = parseWishlistData(doc);
                break;
            case 'parseAppIDs':
                result = parseAppIDs(doc);
                break;
            case 'parsePackageIDs':
                result = parsePackageIDs(doc);
                break;
            case 'parsePageCreationDate':
                result = parsePageCreationDate(doc);
                break;
            case 'parsePageCreationDateFromHistory':
                result = parsePageCreationDateFromHistory(doc);
                break;
            case 'followers':
                result = parseFollowers(doc);
                break;
            case 'RefundStats':
                result = parseRefundStats(doc);
                break;
            case 'RefundComments':
                result = parseRefundComments(doc);
                break;
        }
    }
    catch (error: any) {
        success = false;
        result = error.toString();
        console.error('Error parsing document: ', error);
    }

    return { success: success, result: result };
}

const parsePackageIDs = (doc: Document): string[] => {
    const storePackageTitle = findElementByText('div', 'Store packages', doc);
    if (!storePackageTitle) {
        throw new Error('No store package title found');
    }

    const storePackageSection = storePackageTitle.parentElement;
    if (!storePackageSection) {
        throw new Error('No store package section found');
    }

    const storePackageRows = storePackageSection.getElementsByClassName('tr');
    if (storePackageRows.length === 0) {
        throw new Error('No store package rows found');
    }

    const packageIDs: string[] = [];

    console.log('Store package rows: ', storePackageRows);

    // Skip the first row because it is the header
    for (let i = 1; i < storePackageRows.length; i++) {
        const packageElement = storePackageRows[i].children[0] as Element;

        console.log('Package element: ', packageElement);

        if (packageElement === undefined || isStringEmpty(packageElement.textContent)) continue;
        packageIDs.push(packageElement.textContent.trim());
    }

    return packageIDs;
}

const parsePageCreationDate = (doc: Document): Date => {
    const startDateElem = doc.getElementById('start_date');
    if (!startDateElem) {
        throw new Error('No "start_date" element found');
    }
  
    const startDate = (startDateElem as HTMLInputElement).value;
  
    if (!startDate) {
      throw new Error('No "start_date" element found');
    }
  
    if (!startDate) {
      throw new Error('No valid link with "all history" text found');
    }
  
    return new Date(startDate);
  }

export const parsePageCreationDateFromHistory = (doc: Document): string => {
    const historyTable = doc.querySelector('#tab_publish_content .landingTable');
    if (!historyTable) {
        throw new Error('No publish history table found');
    }

    const monthMap: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    const timestamps: number[] = [];

    for (const row of Array.from(historyTable.children)) {
        const text = row.textContent || '';
        const dayFirstMatches = text.matchAll(/(\d{1,2})\s+([A-Za-z]{3,9})[,]?\s+(\d{4})/g);
        const monthFirstMatches = text.matchAll(/([A-Za-z]{3,9})\s+(\d{1,2})[,]?\s+(\d{4})/g);

        for (const match of dayFirstMatches) {
            const month = monthMap[match[2].slice(0, 3).toLowerCase()];
            if (month === undefined) continue;
            timestamps.push(Date.UTC(Number(match[3]), month, Number(match[1])));
        }
        for (const match of monthFirstMatches) {
            const month = monthMap[match[1].slice(0, 3).toLowerCase()];
            if (month === undefined) continue;
            timestamps.push(Date.UTC(Number(match[3]), month, Number(match[2])));
        }
    }

    const validTimestamps = timestamps.filter(timestamp => Number.isFinite(timestamp) && timestamp <= Date.now());
    if (validTimestamps.length === 0) {
        throw new Error('No valid date found in publish history');
    }

    return new Date(Math.min(...validTimestamps)).toISOString();
}

const parseWishlistData = (doc: Document): any => {
    const table = doc.querySelector('.grouping_table');

    if (!table) {
        throw new Error('No table found');
    }

    const rows = table.querySelectorAll('tr');
    const wishlistRows: Element[] = [];

    rows.forEach((row: Element) => {
        const cells = row.querySelectorAll('td');
        cells.forEach((cell: Element) => {
            if ((cell.textContent || '').trim() === 'Wishlists') {
                wishlistRows.push(row);
            }
        });
    });

    if (wishlistRows.length === 0) {
        throw new Error('No wishlist rows found');
    }

    let wishlists: any = {};

    wishlistRows.forEach((row: Element) => {
        const cells = row.querySelectorAll('td');
        let wishlistCount: any = 0;
        let country = '';

        cells.forEach((cell: Element, index: number) => {
            const cellText = (cell.textContent || '').trim();
            if (cellText === 'Wishlists') {
                wishlistCount = (cells[index + 1] as Element).textContent?.trim() as any;

                if (typeof wishlistCount === 'string' && wishlistCount.startsWith('(') && wishlistCount.endsWith(')')) {
                    wishlistCount = -parseInt(wishlistCount.slice(1, -1));
                } else {
                    wishlistCount = parseInt(wishlistCount) || 0;
                }
            }
            if (index === 1) {
                const countryLink = cell.querySelector('a');
                if (countryLink) {
                    country = (countryLink.textContent || '').trim();
                }
            }
        });

        wishlists[country] = wishlistCount;
    });

    return wishlists;
}

export const parseAppIDs = (doc: Document): any[] => {
    const links = doc.querySelectorAll('a[href*="partner.steampowered.com/app/details/"]');
    const appIDs: any[] = [];

    links.forEach((link: Element) => {
        const linkText = (link.textContent || '').trim();
        if (!/demo$/i.test(linkText)) {
            const href = (link as HTMLAnchorElement).href;
            const urlParts = href.split('/');
            const appIDIndex = urlParts.indexOf('details') + 1;
            if (appIDIndex > 0 && appIDIndex < urlParts.length) {
                appIDs.push(urlParts[appIDIndex]);
            }
        }
    });

    return appIDs;
}

export const parseFollowers = (doc: Document): number => {
    const groupPagingElement = doc.querySelector('.group_paging');
    if (!groupPagingElement) {
        throw new Error('No element with class "group_paging" found');
    }

    const text = groupPagingElement.textContent || '';
    // Steam localizes this string (for example, "1 - 26 of 41 Members"),
    // so do not depend on English words. The total is the largest number in
    // the paging summary because it is never smaller than the range endpoints.
    const numbers = (text.match(/\d[\d\s,.]*/g) || [])
        .map(value => Number(value.replace(/\D/g, '')))
        .filter(value => Number.isFinite(value));

    if (numbers.length === 0) {
        throw new Error(`No followers count found in paging text: "${text.trim()}"`);
    }

    return Math.max(...numbers);
}

export const parseRefundStats = (doc: Document): any => {
    const contentCenter = doc.querySelector('.content_center');
    if (!contentCenter) {
        throw new Error('No element with class "content_center" found');
    }

    const tables = contentCenter.querySelectorAll('table');

    const table = tables[0] as HTMLTableElement | undefined;
    if (!table) {
        throw new Error('No table found in content_center');
    }

    const rows = table.querySelectorAll('tbody tr');
    if (rows.length === 0) {
        throw new Error('No rows found in table');
    }

    let stats = {
        grossUnits: 0,
        grossUnitsPercentage: 0,
        units: 0,
        unitsPercentage: 0,
        refundReasons: [] as any[]
    };

    rows.forEach((row: Element) => {
        const cells = row.querySelectorAll('td');

        if (cells.length >= 3) {
            const firstCellText = (cells[0].textContent || '').trim();
            const secondCellText = (cells[1].textContent || '').trim();
            const thirdCellText = (cells[2].textContent || '').trim();

            const value = parseFloat(secondCellText) || 0;
            const percentage = parseFloat(thirdCellText.replace(/,/g, '')) || 0;


            if (firstCellText === 'Gross units returned') {
                stats.grossUnits = value;
                stats.grossUnitsPercentage = percentage;
            } else if (firstCellText === 'Refunded units') {
                stats.units = value;
                stats.unitsPercentage = percentage;
            }
        }
    });

    if (tables.length >= 2) {
        const reasonsTable = tables[1] as HTMLTableElement;
        const reasonRows = reasonsTable.querySelectorAll('tbody tr');
        const refundReasons: any[] = [];

        reasonRows.forEach((row: Element) => {
            const tds = row.querySelectorAll('td');
            if (tds.length >= 2) {
                const a = tds[0].querySelector('a');
                if (a && a.getAttribute('onclick')) {
                    const onclick = a.getAttribute('onclick') as string;

                    // Extract category ID from onclick="Refund_LoadText( '723544', '115' ); return false;"
                    const match = onclick.match(/Refund_LoadText\(\s*'[^']*',\s*'(\d+)'\s*\)/);

                    if (match) {
                        const id = parseInt(match[1], 10);
                        const category = (a.textContent || '').trim();
                        const amountText = (tds[1].textContent || '').replace(/,/g, '').trim();
                        const amount = parseInt(amountText, 10) || 0;
                        refundReasons.push({ id, category, amount });
                    }
                }
            }
        });


        stats.refundReasons = refundReasons;
    }

    return stats;
}

export const parseRefundComments = (doc: Document): any[] => {
    const comments: { language: string; text: string }[] = [];

    const table = doc.querySelector('.refund_notes_table');
    if (table) {
        const rows = table.querySelectorAll('tr');
        rows.forEach((row: Element) => {
            const obj: any = {};
            const langElem = row.querySelector('.refund_note_language');
            const textElem = row.querySelector('.refund_note_text');
            if (langElem) {
                obj.language = (langElem.textContent || '').replace(/^\(|\)$/g, '').trim();
            }
            if (textElem) {
                obj.text = (textElem.textContent || '').trim();
            }
            if (obj.text) {
                comments.push(obj);
            }
        });
    }
    return comments;
}
