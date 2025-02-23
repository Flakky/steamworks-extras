document.addEventListener('DOMContentLoaded', () => {
  bindButton('optionsButton', () => {
    chrome.runtime.sendMessage({ request: "showOptions" }, res => { });
  });

  bindButton('discordButton', () => {
    openLink('https://discord.gg/k8BA8YSHQ6');
  });
  bindButton('gitButton', () => {
    openLink('https://github.com/Flakky/steamworks-extras');
  });

  const statusBlock = createStatusBlockElement();
  document.body.appendChild(statusBlock);

  startUpdateStatus();
});

const bindButton = (id, func) => {
  const button = document.getElementById(id);
  button.addEventListener('click', func);
}

const openLink = (link) => {
  console.log('Opening link:', link);
  chrome.tabs.create({ url: link, active: true });
}
