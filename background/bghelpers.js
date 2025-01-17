let bghelpers = {}

bghelpers.getPageCreationDate = async (appID, stringify) => {
  const pagesCreationDate = await chrome.storage.local.get("pagesCreationDate");
  const pageCreationDate = new Date(pagesCreationDate.pagesCreationDate[appID]) || new Date(2014, 0, 0);

  if (stringify) return helpers.dateToString(pageCreationDate);

  return pageCreationDate;
}
