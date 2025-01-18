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
    statusElement.innerText = res;
  });
}
