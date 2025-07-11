let parsingQueue = []; // {id, resolve, reject}
let offscreenInitialized = false;

const initOffscreen = async () => {
  if(getBrowser().offscreen === undefined) {
    console.warn('Offscreen is not supported by this browser');
    return;
  }

  const offscreenUrl = getBrowser().runtime.getURL('background/offscreen/offscreen.html');

  const existingOffscreen = await getBrowser().runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  });

  if (existingOffscreen.length > 0) {
    console.warn('Offscreen document already exists, reusing it');
    return;
  }

  await getBrowser().offscreen.createDocument({
    url: offscreenUrl,
    reasons: [getBrowser().offscreen.Reason.DOM_PARSER],
    justification: 'Parse HTML using DOM in background script'
  });

  console.debug('Offscreen document created');
}

const processParsedDOM = (message) => {
  console.debug('Steamworks extras: Processing parsed DOM message: ', message);
  
  if(message.request !== 'parsedDOM'
    || message.id === undefined
    || message.result === undefined) {
    console.warn('Invalid parsed DOM message received: ', message);
    return;
  }

  console.debug('Parsing DOM completed', message.result);

  const { id, result, success } = message;

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

    if(getBrowser().offscreen === undefined) {
      try{
        const result = parser.parseDocument(htmlText, request);

        console.debug('Parsing DOM completed', result);

        if(result.success) resolve(result.result);
        else reject(new Error(result.result));
      }
      catch(error) {
        reject(error);
      }
    }
    else {
      const id = crypto.randomUUID();
      parsingQueue.push({ id, resolve, reject });
  
      await getBrowser().runtime.sendMessage({
        parseDOMId: id,
        action: request,
        htmlText: htmlText
      });
    }
  });
}
