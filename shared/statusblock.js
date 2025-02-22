extensionStatuses = undefined

const createStatusBlock = () => {
  const statusBlock = createStatusBlockElement();
  statusBlock.classList.add('extra_floating_notification');
  document.body.appendChild(statusBlock);

  return statusBlock;
}

const createStatusBlockElement = () => {
  console.log('Creating status block...');
  const statusBlock = document.createElement('p');
  statusBlock.style.display = 'none';
  statusBlock.id = 'extra_status';

  return statusBlock;
}

const startUpdateStatus = () => {
  const statusElement = document.getElementById('extra_status');
  statusElement.style.display = 'none';

  readStatuses();
  updateStatus();
  setInterval(() => { updateStatus() }, 3000);
}

const updateStatus = () => {
  chrome.runtime.sendMessage({ request: "getStatus" }, status => {
    console.debug('Status:', status);

    if (!extensionStatuses) {
      console.warn('Extension statuses not loaded yet.');
      return;
    }

    const statusElement = document.getElementById('extra_status');

    const statusInfo = extensionStatuses[`${status.code}`];

    console.debug('Status info:', statusInfo);

    if (status.code === 0) {
      statusElement.classList.add('extra_info');
      statusElement.style.display = 'none';
    }
    if (status.code >= 10 && status.code < 100) {
      statusElement.classList.add('extra_warning');
      statusElement.style.display = '';

    }
    if (status.code >= 100) {
      statusElement.classList.add('extra_error');
      statusElement.style.display = '';
    }

    const extramessage = statusInfo.extramessage ? statusInfo.extramessage.replace(/\${(.*?)}/g, (match, p1) => status.extraData[p1] || '') : '';
    statusElement.innerHTML = `<b>${statusInfo.message}</b>${extramessage !== '' ? `<br>${extramessage}` : ''}`;
  });
}

const readStatuses = () => {
  console.log('Loading extension statuses...');
  const jsonFilePath = chrome.runtime.getURL('data/extensionstatuses.json');

  console.log(jsonFilePath);

  fetch(jsonFilePath).then(response => {
    if (response.ok) {
      response.json().then(json => {
        console.log('Extension statuses loaded.');
        extensionStatuses = json;
      });
    }
    else {
      console.error('Failed to load extension statuses');
    }
  });
}
