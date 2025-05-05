extensionStatus = {
  code: 0,
  extraData: {}
}

setExtentionStatus = (statusCode, extraData = {}) => {
  extensionStatus.code = statusCode;
  extensionStatus.extraData = extraData;

  console.debug(`Steamworks extras: New extension status: ${statusCode}`);
}
