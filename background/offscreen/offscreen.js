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
  if(message.parseDOMId  === undefined) return;

  const result = parser.parseDocument(message.htmlText, message.action);

  getBrowser().runtime.sendMessage({ action: 'parsedDOM', id: message.parseDOMId, success: result.success, result: result });
});
