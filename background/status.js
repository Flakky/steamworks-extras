extensionStatus = {
  "status": "ok", // ok, warning, error
  "message": "Extension is off",
  "extraData": {}
}

setExtensionStatus = (status, message, extraData = {}) => {
  extensionStatus.status = status;
  extensionStatus.message = message;
  extensionStatus.extraData = extraData;

  console.debug(`Steamworks extras: New extension status: ${status} - ${message}`);
}
