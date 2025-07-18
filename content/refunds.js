let salesAllTime = undefined;
let appID = undefined;

const init = async () => {
  console.log("Steamworks extras: Init refunds page");

  // Recreate the page structure
  createCustomContentBlock();
  moveGameTitle();
  
  await requestAppID();

  createToolbarBlock(getAppID());
  addStatusBlockToPage();
  hideOriginalMainBlock();

  createRefundsTableBlock();

  await requestSales();

  createRefundsTable();

};

const requestAppID = async () => {
    const packageID = getPackageID();

    const packageIDsMap = await helpers.sendMessageAsync({ request: 'getPackageIDs' });
    console.log('Steamworks extras: Package IDs map: ', packageIDsMap);

    let foundAppID = undefined;
    for (const [appId, packageIds] of Object.entries(packageIDsMap)) {
        if (Array.isArray(packageIds) && packageIds.includes(packageID)) {
            foundAppID = appId;
            break;
        }
    }
    appID = foundAppID;

    console.log('Steamworks extras: App ID: ', appID);
}

const getPackageID = () => {
    const url = window.location.href;
    try {
        const match = url.match(/\/package\/refunds\/(\d+)/);
        if (match && match[1]) {
            return match[1];
        }
    } catch (e) {
        console.error('Failed to extract package ID from URL:', e);
    }
    return undefined;
};

const getAppID = () => {
    return appID;
};

const requestSales = async () => {

    console.log('Steamworks extras: Requesting sales data...');

    salesAllTime = await helpers.sendMessageAsync({ request: 'getData', type: 'Sales', appId: getAppID() });
    console.debug('Steamworks extras: Sales data received: ', salesAllTime);

}

init();