document.addEventListener('DOMContentLoaded', () => {
  const exampleButton = document.getElementById('optionsButton');
  exampleButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ request: "showOptions" }, res => { });
  });

  updateStatus();
  setInterval(() => { updateStatus() }, 3000);
});

const updateStatus = () => {
  chrome.runtime.sendMessage({ request: "getStatus" }, res => {
    const statusElement = document.getElementById('status');

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
