document.addEventListener('DOMContentLoaded', () => {
  const exampleButton = document.getElementById('optionsButton');
  exampleButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ request: "showOptions" }, res => { });
  });
});
