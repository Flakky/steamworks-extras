let parser: any = {};

parser.parseDocument = (htmlText: string, parseType: string): { success: boolean; result: any } => {
  let result: any = null;
  let success = true;

  try {
    const domParser = new DOMParser();
    const doc = domParser.parseFromString(htmlText, 'text/html');

    switch (parseType) {
      case 'parsePackageID':
        result = parser.parsePackageIDs(doc);
        break;
      case 'parseWishlistData':
        result = parser.parseWishlistData(doc);
        break;
      case 'parsePageCreationDate':
        result = parser.parsePageCreationDate(doc);
        break;
      case 'parseAppIDs':
        result = parser.parseAppIDs(doc);
        break;
      case 'followers':
        result = parser.parseFollowers(doc);
        break;
      case 'RefundStats':
        result = parser.parseRefundStats(doc);
        break;
      case 'parsePageID':
        result = parser.parsePageID(doc);
        break;
      case 'RefundComments':
        result = parser.parseRefundComments(doc);
        break;
    }
  }
  catch (error: any) {
    success = false;
    result = error.toString();
  }

  return { success: success, result: result };
}

parser.parsePackageIDs = (doc: Document): any[] => {
  const table = doc.querySelector('.appLandingStorePackagesCtn');
  if (!table) {
    throw new Error('No table found');
  }

  const packageIDs: any[] = [];
  const rows = table.querySelectorAll('.tr');

  if (rows.length === 0) {
    throw new Error('No rows found');
  }

  rows.forEach((row: Element) => {
    const link = row.querySelector('a[href^="https://partner.steamgames.com/store/packagelanding/"]') as HTMLAnchorElement | null;
    if (link) {
      const urlParts = link.href.split('/');
      const packageID = urlParts[urlParts.length - 1];
      packageIDs.push(packageID);
    }
  });

  return packageIDs;
}

parser.parsePageCreationDate = (doc: Document): Date => {
  const startDateElem = doc.getElementById('start_date') as any;

  const startDate = startDateElem.value;

  if (!startDate) {
    throw new Error('No "start_date" element found');
  }

  if (!startDate) {
    throw new Error('No valid link with "all history" text found');
  }

  return new Date(startDate);
}

parser.parseWishlistData = (doc: Document): any => {
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

parser.parseAppIDs = (doc: Document): any[] => {
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

parser.parseFollowers = (doc: Document): number | void => {
  const groupPagingElement = doc.querySelector('.group_paging');
  if (!groupPagingElement) {
    throw new Error('No element with class "group_paging" found');
  }

  const text = groupPagingElement.textContent || '';
  const match = text.match(/of\s+([\d,]+)\s+Members/);

  if (match) {
    const membersStr = match[1];
    const followers = parseInt(membersStr.replace(/,/g, ''));
    console.log(followers);
    return followers;
  } else {
    console.log("No followers match found");
  }
}

parser.parseRefundStats = (doc: Document): any => {
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

  let stats: any = {};

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

parser.parseRefundComments = (doc: Document): any[] => {
  const comments: any[] = [];
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

parser.parsePageID = (doc: Document): string => {
  const link = doc.querySelector('a[href*="https://partner.steamgames.com/admin/game/edit/"]');
  if(!link) {
    throw new Error('No valid page ID link found');
  }
  const href = (link as HTMLAnchorElement).href;
  const match = href.match(/https:\/\/partner\.steamgames\.com\/admin\/game\/edit\/(\d+)/);
  if (match) {
    return match[1];
  }
  throw new Error('No valid page ID link found');
}


parser.parsePageCreationDateFromHistory = (doc: Document): string => {
  const parentDiv = doc.querySelector('#tab_publish_content');
  if (!parentDiv) {
    throw new Error('No div with id "tab_publish_content" found');
  }
  const landingTableDiv = parentDiv.querySelector('.landingTable');
  if (!landingTableDiv) {
    throw new Error('No div with class "landingTable" found inside #tab_publish_content');
  }

  const children = landingTableDiv.children;
  if (!children || children.length === 0) {
    throw new Error('No children found in landingTableDiv');
  }
  const lastElement = children[children.length - 1];

  const thirdChild = lastElement.children && lastElement.children.length >= 3 ? lastElement.children[2] : null;

  // INSERT_YOUR_CODE
  if (!thirdChild) {
    throw new Error('No third child found in lastElement');
  }
  const dateText = thirdChild.textContent.trim();
  // Example: "1 Aug, 2022 @ 6:51am "
  const dateMatch = dateText.match(/^(\d{1,2}) (\w+), (\d{4})/);
  if (!dateMatch) {
    throw new Error('Date format not recognized in thirdChild');
  }
  const day = dateMatch[1].padStart(2, '0');
  const monthStr = dateMatch[2];
  const year = dateMatch[3];

  const monthMap = {
    Jan: '01',
    Feb: '02',
    Mar: '03',
    Apr: '04',
    May: '05',
    Jun: '06',
    Jul: '07',
    Aug: '08',
    Sep: '09',
    Oct: '10',
    Nov: '11',
    Dec: '12'
  };

  const month = monthMap[monthStr as keyof typeof monthMap];
  if (!month) {
    throw new Error('Month not recognized: ' + monthStr);
  }

  const formattedDate = `${year}-${month}-${day}`;
  return formattedDate;
}
