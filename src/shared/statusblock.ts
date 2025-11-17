import { getBrowser } from './browser';

export const createStatusBlock = (): HTMLDivElement => {
  const statusBlock = createStatusBlockElement();
  statusBlock.classList.add('extra_floating_notification');
  document.body.appendChild(statusBlock);

  return statusBlock;
}

export const createStatusBlockElement = (): HTMLDivElement => {
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

export const addStatusBlockToPage = (): void => {
  createStatusBlock();
  startUpdateStatus();
}

export const startUpdateStatus = async (): Promise<void> => {
  const statusElement = document.getElementById('extra_status') as HTMLDivElement;
  statusElement.style.display = 'none';

  const statuses = await readStatuses();
  if (!statuses) {
    console.error('Failed to load extension statuses');
    return;
  }

  updateStatus(statuses);
  setInterval(() => { updateStatus(statuses) }, 3000);
}

export const updateStatus = (statuses: Record<string, any>): void => {
  getBrowser().runtime.sendMessage({ request: "getStatus" }, (status: any) => {
    console.debug('Status:', status);

    if (!statuses) {
      console.warn('Extension statuses not loaded yet.');
      return;
    }

    const statusElement = document.getElementById('extra_status') as HTMLDivElement;
    const statusImage = document.getElementById('extra_status_icon') as HTMLImageElement;
    const statusText = document.getElementById('extra_status_message') as HTMLSpanElement;
    const statusExtraText = document.getElementById('extra_status_extramessage') as HTMLParagraphElement;

    const statusInfo = statuses[`${status.code}`];

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
    statusExtraText.innerHTML = statusInfo.extramessage ? statusInfo.extramessage.replace(/\${(.*?)}/g, (_match: string, p1: string) => status.extraData[p1] || '') : '';
  });
}

const readStatuses = async (): Promise<Record<string, any> | undefined> => {
  console.log('Loading extension statuses...');
  const jsonFilePath = getBrowser().runtime.getURL('data/extensionstatuses.json');

  console.log(jsonFilePath);

  const response = await fetch(jsonFilePath);
  if (response.ok) {
    const json = await response.json();
    return json;
  }
  else {
    return undefined;
  }
}


