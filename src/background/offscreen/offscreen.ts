import { getBrowser } from '../../shared/browser';
import { parseDocument } from '../../scripts/parser';
import { OffscreenParseResponse } from './offscreenmanager';
import { BackgroundMessageType } from '../../shared/types/background_requests';

console.log('Init offscreen');

getBrowser().runtime.onMessage.addListener((message: any, sender: any, sendResponse: (response: any) => void) => {
  if (message.parseDOMId === undefined) return;

  const result = parseDocument(message.htmlText, message.action);

  const payload: OffscreenParseResponse = {
    id: message.parseDOMId,
    request: message.action,
    result: result.result,
    success: result.success
  }

  getBrowser().runtime.sendMessage({ request: BackgroundMessageType.parsedDOM, payload });
});
