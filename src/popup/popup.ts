import { getBrowser } from '../shared/browser';
import { createStatusBlockElement, updateStatus, startUpdateStatus } from '../shared/statusblock';

document.addEventListener('DOMContentLoaded', () => {
  bindButton('optionsButton', () => {
    getBrowser().runtime.sendMessage({ request: "showOptions" });
  });

  bindButton('discordButton', () => {
    openLink('https://discord.gg/k8BA8YSHQ6');
  });
  bindButton('gitButton', () => {
    openLink('https://github.com/Flakky/steamworks-extras');
  });
  bindButton('updateButton', () => {
    getBrowser().runtime.sendMessage({ request: "updateStats" });
    updateStatus();
  });

  const statusBlock = createStatusBlockElement();
  document.body.appendChild(statusBlock);

  startUpdateStatus();
});

const bindButton = (id: string, func: () => void) => {
  const button = document.getElementById(id);
  if(button) {
    button.addEventListener('click', () => func());
  }
}

const openLink = (link: string) => {
  console.log('Opening link:', link);
  getBrowser().tabs.create({ url: link, active: true });
}
