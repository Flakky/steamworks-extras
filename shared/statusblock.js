const createStatusBlock = () => {
  const statusBlock = createStatusBlockElement();
  statusBlock.classList.add('extra_floating_notification');
  statusBlock.style.display = 'none';

  return statusBlock;
}

const createStatusBlockElement = () => {
  const statusBlock = document.createElement('p');
  statusBlock.id = 'extra_status';

  updateStatus();
  setInterval(() => { updateStatus() }, 3000);

  return statusBlock;
}

const startUpdateStatus = () => {
  const statusElement = document.getElementById('extra_status');
  statusElement.style.display = 'none';

  updateStatus();
  setInterval(() => { updateStatus() }, 3000);
}

const updateStatus = () => {
  chrome.runtime.sendMessage({ request: "getStatus" }, res => {
    const statusElement = document.getElementById('extra_status');

    if (res === undefined) {
      statusElement.innerHTML = `Unknown status of extension backend. Try reloading the page or restarting the browser/extension.`;
      statusElement.classList.add('extra_error');
      statusElement.style.display = '';
    }
    if (res.error) {
      statusElement.innerHTML = `<b>${res.status}</b>`;
      statusElement.classList.add('extra_error');
      statusElement.style.display = '';
    }
    if (res.status.includes('Updating stats')) {
      const match = res.status.match(/\((\d+)\)/);
      const number = match ? match[1] : 'unknown';
      statusElement.innerHTML = `<b>Collecting stats about games</b> (${number}).<br>Some data may not be available. Try to refresh the page in a few minutes.`;
      statusElement.classList.add('extra_warning');
      statusElement.style.display = '';
    }
    if (res.status == 'Ready') {
      statusElement.style.display = 'none';
    }
  });
}
