class StorageActionRequestReviews extends StorageAction {
  constructor(appID) {
    super();
    this.appID = appID;
    this.executeTimeout = 30;
  }

  async process() {
    return await requestAllReviewsData(this.appID);
  }

  getType() {
    return 'RequestReviews';
  }
}

class StorageActionGetReviews extends StorageAction {
  constructor(appID, dateStart, dateEnd, returnLackData) {
    super();
    this.appID = appID;
    this.dateStart = dateStart;
    this.dateEnd = dateEnd;
    this.returnLackData = returnLackData;
    this.executeTimeout = 10;
  }

  async process() {
    return await getReviewsData(this.appID, this.dateStart, this.dateEnd, this.returnLackData);
  }

  getType() {
    return 'GetReviews';
  }
}

const getReviewsData = async (appID, dateStart, dateEnd, returnLackData) => {
  await waitForDatabaseReady();

  console.debug(`Requesting reviews data for app ${appID}`);

  let records = await readData(appID, 'Reviews');

  if (dateStart && dateEnd) {
    const filteredRecords = records.filter(item => {
      const date = new Date(item['timestamp_created'] * 1000);
      return helpers.isDateInRange(date, dateStart, dateEnd);
    });

    if (!returnLackData) {
      const dateRange = helpers.getDateRangeArray(dateStart, dateEnd, false, true);
      const datesWithData = [...new Set(filteredRecords.map(record => helpers.dateToString(new Date(record['timestamp_created'] * 1000))))];

      const allDatesHaveData = dateRange.every(date => datesWithData.includes(date));

      return allDatesHaveData ? filteredRecords : null;
    }

    return filteredRecords;
  } else {
    return records;
  }
}

const requestAllReviewsData = async (appID) => {
  // Request documentation: https://partner.steamgames.com/doc/store/getreviews

  let cursor = '*'

  let reviews = [];

  while (true) {
    const request_data = {
      'filter': 'recent',
      'language': 'all',
      'review_type': 'all',
      'purchase_type': 'all',
      'num_per_page': 100,
      'cursor': cursor,
      'json': 1
    }

    const params = Object.keys(request_data)
      .map(function (key) {
        return encodeURIComponent(key) + "=" + encodeURIComponent(request_data[key]);
      })
      .join("&");

    const request_url = `https://store.steampowered.com/appreviews/${appID}?${params}`;
    const request_options = {
      'method': 'POST',
      'contentType': 'application/json',
      headers: {
        'Content-Type': 'application/json'
      },
    };

    console.debug(`Sending review request to "${request_url}"`);

    const response = await fetch(request_url, request_options);

    const responseText = await response.text();

    const responseObj = JSON.parse(responseText);

    if (responseObj.reviews === undefined || responseObj.reviews.length == 0) break;

    cursor = responseObj.cursor;

    for (const review of responseObj.reviews) {
      if (review !== undefined) reviews.push(review);
    }
  }

  console.debug(`Reviews result: `, reviews);

  await clearData(appID, 'Reviews');

  await writeData(appID, 'Reviews', reviews);

  return reviews;
}
