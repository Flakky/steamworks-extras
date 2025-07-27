document.addEventListener('requestTrafficData', function (e) {
  console.log('Requesting traffic data: ', e.detail);

  (async () => {
    await initGameStatsStorage('2004080', 1);
    const trafficData = await getlTrafficData('2004080', new Date('2024-09-20'), new Date());

    const event = new CustomEvent('trafficDataResponse', {
      detail: { 'traffic': trafficData }
    });
    document.dispatchEvent(event);
  })();

}, false);

const init = () => {
  console.log('Init');
}

document.addEventListener('DOMContentLoaded', init);
