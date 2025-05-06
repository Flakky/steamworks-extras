let offscreenDocument = null;
let parsingQueue = []; // {id, resolve, reject}

const initOffscreen = async () => {
  const offscreenUrl = chrome.runtime.getURL('background/offscreen/offscreen.html');

  await chrome.offscreen.createDocument({
    url: offscreenUrl,
    reasons: [chrome.offscreen.Reason.DOM_PARSER],
    justification: 'Parse HTML using DOM in background script'
  });

  console.debug('Offscreen document created');
}

const processParsedDOM = (message) => {
  if(message.request !== 'parsedDOM'
    || message.id === undefined
    || message.result === undefined) {
    console.warn('Invalid parsed DOM message received: ', message);
    return;
  }

  console.debug('Parsing DOM completed', message.result);

  const { id, result } = message;

  const parsingAction = parsingQueue.find(action => action.id === id);
  if(!parsingAction) {
    console.warn('Parsing action not found in queue: ', id);
    return;
  }

  if(message.success) parsingAction.resolve(result);
  else parsingAction.reject(new Error(result));
}

const parseDOM = (htmlText, request) => {
  return new Promise(async (resolve, reject) => {
    console.debug('Parsing DOM started: ', request);

    const id = crypto.randomUUID();
    parsingQueue.push({ id, resolve, reject });

    await chrome.runtime.sendMessage({
      parseDOMId: id,
      action: request,
      htmlText: htmlText
    });
  });
}
