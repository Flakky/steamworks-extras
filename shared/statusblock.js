extensionStatuses = undefined

const createStatusBlock = () => {
  const statusBlock = createStatusBlockElement();
  statusBlock.classList.add('extra_floating_notification');
  document.body.appendChild(statusBlock);

  return statusBlock;
}

const createStatusBlockElement = () => {
  console.log('Creating status block...');

  const statusBlock = document.createElement('div');
  statusBlock.style.display = 'none';
  statusBlock.id = 'extra_status';

  const icon = document.createElement('img');
  icon.id = 'extra_status_icon';
  icon.src = getBrowser().runtime.getURL('assets/status_info.png');

  const statusText = document.createElement('span');
  statusText.id = 'extra_status_message';
  statusText.textContent = '';

  const extraText = document.createElement('p');
  extraText.id = 'extra_status_extramessage';
  extraText.textContent = '';

  statusBlock.appendChild(icon);
  statusBlock.appendChild(statusText);
  statusBlock.appendChild(extraText);

  return statusBlock;
}

const addStatusBlockToPage = () => {
  const statusBlock = createStatusBlock();
  startUpdateStatus();
}

const startUpdateStatus = () => {
  const statusElement = document.getElementById('extra_status');
  statusElement.style.display = 'none';

  readStatuses();
  updateStatus();
  setInterval(() => { updateStatus() }, 3000);
}

const updateStatus = () => {
  getBrowser().runtime.sendMessage({ request: "getStatus" }, status => {
    console.debug('Status:', status);

    if (!extensionStatuses) {
      console.warn('Extension statuses not loaded yet.');
      return;
    }

    const statusElement = document.getElementById('extra_status');
    const statusImage = document.getElementById('extra_status_icon');
    const statusText = document.getElementById('extra_status_message');
    const statusExtraText = document.getElementById('extra_status_extramessage');

    const statusInfo = extensionStatuses[`${status.code}`];

    statusElement.classList.remove('extra_info', 'extra_warning', 'extra_error');

    if (status.code === 0) {
      statusElement.classList.add('extra_info');
      statusElement.style.display = 'none';
      statusImage.src = getBrowser().runtime.getURL('assets/status_info.png');
    }
    if (status.code >= 10 && status.code < 100) {
      statusElement.classList.add('extra_warning');
      statusElement.style.display = '';
      statusImage.src = getBrowser().runtime.getURL('assets/status_warning.png');

    }
    if (status.code >= 100) {
      statusElement.classList.add('extra_error');
      statusElement.style.display = '';
      statusImage.src = getBrowser().runtime.getURL('assets/status_error.png');
    }

    statusText.innerHTML = statusInfo.message;
    statusExtraText.innerHTML = statusInfo.extramessage ? statusInfo.extramessage.replace(/\${(.*?)}/g, (match, p1) => status.extraData[p1] || '') : '';
  });
}

const readStatuses = () => {
  console.log('Loading extension statuses...');
  const jsonFilePath = getBrowser().runtime.getURL('data/extensionstatuses.json');

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
