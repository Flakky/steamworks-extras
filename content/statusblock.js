const createStatusBlock = () => {
  const statusBlock = document.createElement('p');
  statusBlock.id = 'extra_status';
  statusBlock.classList.add('extra_floating_notification');
  statusBlock.style.display = 'none';

  updateStatus();
  setInterval(() => { updateStatus() }, 3000);

  return statusBlock;
}

const updateStatus = () => {
  chrome.runtime.sendMessage({ request: "getStatus" }, res => {
    const statusElement = document.getElementById('extra_status');

    if (res === undefined) {
      statusElement.innerHTML = `Unknown status of extension backend. Try reloading the page or restarting the browser/extension.`;
      statusElement.classList.add('extra_error');
      statusElement.style.display = '';
    }
    if (res.includes('Updating stats')) {
      const match = res.match(/\((\d+)\)/);
      const number = match ? match[1] : 'unknown';
      statusElement.innerHTML = `<b>Collecting stats about games</b> (${number}).<br>Some data may not be available. Try to refresh the page in a few minutes.`;
      statusElement.classList.add('extra_warning');
      statusElement.style.display = '';
    }
    if (res == 'Ready') {
      statusElement.style.display = 'none';
    }
  });
}
