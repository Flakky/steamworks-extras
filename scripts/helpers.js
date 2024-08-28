let helpers = {}

helpers.numberWithCommas = (x) => {
    return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ","); // https://stackoverflow.com/questions/2901102/how-to-format-a-number-with-commas-as-thousands-separators
}

helpers.findElementByText = (tag, text) => {
    const elements = document.getElementsByTagName(tag);

    for (let element of elements) {
        if (element.textContent.trim() === text) {
            return element;
        }
    }

    return null;
}

helpers.findParentByTag = (element, tagName) => {

    tagName = tagName.toUpperCase();

    while (element && element.parentNode) {
        element = element.parentNode;
        if (element.tagName === tagName) {
            return element;
        }
    }

    return null;
}