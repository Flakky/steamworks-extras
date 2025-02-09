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


  updateStatus();
  setInterval(() => { updateStatus() }, 3000);
});

const bindButton = (id, func) => {
  const button = document.getElementById(id);
  button.addEventListener('click', func);
}

const updateStatus = () => {
  chrome.runtime.sendMessage({ request: "getStatus" }, res => {
    const statusElement = document.getElementById('extra_status');

    if (res === undefined) {
      statusElement.innerHTML = `<b>Status:</b> Unknown`;
      statusElement.classList.add('extra_error');
    }
    if (res.includes('Updating stats')) {
      statusElement.innerHTML = `<b>Status:</b> ${res}`;
      statusElement.classList.add('extra_warning');
    }
    if (res == 'Ready') {
      statusElement.innerHTML = `<b>Status:</b> Ready`;
      statusElement.classList.add('extra_info');
    }
  });
}

const openLink = (link) => {
  console.log('Opening link:', link);
  chrome.tabs.create({ url: link, active: true });
}
