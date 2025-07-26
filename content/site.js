document.addEventListener('ExtensionRequest', function (e) {
  console.log('Steamworks extras: Requesting data: ', e);
  const request = e.detail;
  const requestId = request.requestId;
  console.log('Steamworks extras: Requesting data: ', request);

  (async () => {
    const data = await helpers.sendMessageAsync(request.data);

    console.log("Steamworks extras: sending requested data back: ", data);

    window.postMessage({ type: 'ExtensionResponse', requestId: requestId, data: data }, '*');
  })();

}, false);

const init = () => {
  console.log('Steamworks extras: Init');
}

init();