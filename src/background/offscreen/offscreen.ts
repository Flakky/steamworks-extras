import { getBrowser } from '../../shared/browser';

getBrowser().runtime.onMessage.addListener((message: any, sender: any, sendResponse: (response: any) => void) => {
  if(message.parseDOMId  === undefined) return;

  const result = parser.parseDocument(message.htmlText, message.action);

  getBrowser().runtime.sendMessage({ request: 'parsedDOM', id: message.parseDOMId, success: result.success, result: result.result });
});
