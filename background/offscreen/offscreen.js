const getBrowser = () => {
  if (typeof browser !== 'undefined') {
    return browser;
  } else if (typeof chrome !== 'undefined') {
    return chrome;
  } else {
    throw new Error('No browser API found');
  }
}

getBrowser().runtime.onMessage.addListener((message, sender, sendResponse) => {
  let result = undefined;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(message.htmlText, 'text/html');

    switch (message.action) {
      case 'parsePackageID':
        result = parsePackageIDs(doc);
        break;
      case 'parseWishlistData':
        result = parseWishlistData(doc);
        break;
      case 'parsePageCreationDate':
        result = parsePageCreationDate(doc);
        break;
      case 'parseAppIDs':
        result = parseAppIDs(doc);
        break;
    }
  }
  catch (error) {
    result = error.toString();
  }

  getBrowser().runtime.sendMessage({ action: 'parsedDOM', result: result });
});

const parsePackageIDs = (doc) => {
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

const parsePageCreationDate = (doc) => {
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

const parseWishlistData = (doc) => {
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

const parseAppIDs = (doc) => {
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
