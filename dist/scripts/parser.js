let parser = {};

parser.parseDocument = (htmlText, parseType) => {
  let result = null;
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
      case 'RefundComments':
        result = parser.parseRefundComments(doc);
        break;
    }
  }
  catch (error) {
    success = false;
    result = error.toString();
  }

  return { success: success, result: result };
}

parser.parsePackageIDs = (doc) => {
  const table = doc.querySelector('.appLandingStorePackagesCtn');
  if (!table) {
    throw new Error('No table found');
  }

  const packageIDs = [];
  const rows = table.querySelectorAll('.tr');

  if (rows.length === 0) {
    throw new Error('No rows found');
  }

  rows.forEach(row => {
    const link = row.querySelector('a[href^="https://partner.steamgames.com/store/packagelanding/"]');
    if (link) {
      const urlParts = link.href.split('/');
      const packageID = urlParts[urlParts.length - 1];
      packageIDs.push(packageID);
    }
  });

  return packageIDs;
}

parser.parsePageCreationDate = (doc) => {
  const startDateElem = doc.getElementById('start_date');

  const startDate = startDateElem.value;

  if (!startDate) {
    throw new Error('No "start_date" element found');
  }

  if (!startDate) {
    throw new Error('No valid link with "all history" text found');
  }

  return new Date(startDate);
}

parser.parseWishlistData = (doc) => {
  const table = doc.querySelector('.grouping_table');

  if (!table) {
    throw new Error('No table found');
  }

  const rows = table.querySelectorAll('tr');
  const wishlistRows = [];

  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    cells.forEach(cell => {
      if (cell.textContent.trim() === 'Wishlists') {
        wishlistRows.push(row);
      }
    });
  });

  if (wishlistRows.length === 0) {
    throw new Error('No wishlist rows found');
  }

  let wishlists = {};

  wishlistRows.forEach(row => {
    const cells = row.querySelectorAll('td');
    let wishlistCount = 0;
    let country = '';

    cells.forEach((cell, index) => {
      if (cell.textContent.trim() === 'Wishlists') {
        wishlistCount = cells[index + 1].textContent.trim();

        if (typeof wishlistCount === 'string' && wishlistCount.startsWith('(') && wishlistCount.endsWith(')')) {
          wishlistCount = -parseInt(wishlistCount.slice(1, -1));
        } else {
          wishlistCount = parseInt(wishlistCount) || 0;
        }
      }
      if (index === 1) {
        const countryLink = cell.querySelector('a');
        if (countryLink) {
          country = countryLink.textContent.trim();
        }
      }
    });

    wishlists[country] = wishlistCount;
  });

  return wishlists;
}

parser.parseAppIDs = (doc) => {
  const links = doc.querySelectorAll('a[href*="partner.steampowered.com/app/details/"]');
  const appIDs = [];

  links.forEach(link => {
    if (!/demo$/i.test(link.textContent.trim())) {
      const urlParts = link.href.split('/');
      const appIDIndex = urlParts.indexOf('details') + 1;
      if (appIDIndex > 0 && appIDIndex < urlParts.length) {
        appIDs.push(urlParts[appIDIndex]);
      }
    }
  });

  return appIDs;
}

parser.parseFollowers = (doc) => {
  const groupPagingElement = doc.querySelector('.group_paging');
  if (!groupPagingElement) {
    throw new Error('No element with class "group_paging" found');
  }

  const text = groupPagingElement.textContent;
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

parser.parseRefundStats = (doc) => {
  const contentCenter = doc.querySelector('.content_center');
  if (!contentCenter) {
    throw new Error('No element with class "content_center" found');
  }

  const tables = contentCenter.querySelectorAll('table');

  const table = tables[0];
  if (!table) {
    throw new Error('No table found in content_center');
  }

  const rows = table.querySelectorAll('tbody tr');
  if (rows.length === 0) {
    throw new Error('No rows found in table');
  }

  let stats = {};

  rows.forEach(row => {
    const cells = row.querySelectorAll('td');

    if (cells.length >= 3) {
      const firstCellText = cells[0].textContent.trim();
      const secondCellText = cells[1].textContent.trim();
      const thirdCellText = cells[2].textContent.trim();
      
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
    const reasonsTable = tables[1];
    const reasonRows = reasonsTable.querySelectorAll('tbody tr');
    const refundReasons = [];

    reasonRows.forEach(row => {
      const tds = row.querySelectorAll('td');
      if (tds.length >= 2) {
        const a = tds[0].querySelector('a');
        if (a && a.getAttribute('onclick')) {
          const onclick = a.getAttribute('onclick');

          // Extract category ID from onclick="Refund_LoadText( '723544', '115' ); return false;"
          const match = onclick.match(/Refund_LoadText\(\s*'[^']*',\s*'(\d+)'\s*\)/);

          if (match) {
            const id = parseInt(match[1], 10);
            const category = a.textContent.trim();
            const amountText = tds[1].textContent.replace(/,/g, '').trim();
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

parser.parseRefundComments = (doc) => {
  const comments = [];
  const table = doc.querySelector('.refund_notes_table');
  if (table) {
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
      const obj = {};
      const langElem = row.querySelector('.refund_note_language');
      const textElem = row.querySelector('.refund_note_text');
      if (langElem) {
        obj.language = langElem.textContent.replace(/^\(|\)$/g, '').trim();
      }
      if (textElem) {
        obj.text = textElem.textContent.trim();
      }
      if (obj.text) {
        comments.push(obj);
      }
    });
  }
  return comments;
}