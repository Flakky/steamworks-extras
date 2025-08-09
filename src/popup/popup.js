document.addEventListener('DOMContentLoaded', () => {
  bindButton('optionsButton', () => {
    getBrowser().runtime.sendMessage({ request: "showOptions" }, res => { });
  });

  bindButton('discordButton', () => {
    openLink('https://discord.gg/k8BA8YSHQ6');
  });
  bindButton('gitButton', () => {
    openLink('https://github.com/Flakky/steamworks-extras');
  });
  bindButton('updateButton', () => {
    getBrowser().runtime.sendMessage({ request: "updateStats" }, res => { });
    updateStatus();
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
  getBrowser().tabs.create({ url: link, active: true });
}
