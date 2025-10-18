export const extensionStatus = {
  code: 0,
  extraData: {}
}

export const setExtentionStatus = (statusCode: number, extraData: Record<string, any> = {}) => {
  extensionStatus.code = statusCode;
  extensionStatus.extraData = extraData;

  console.debug(`Steamworks extras: New extension status: ${statusCode}`);
}
