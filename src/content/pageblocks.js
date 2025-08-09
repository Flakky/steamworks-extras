/**
 * Creates a flexible content block with a title and appends it to the main content area
 * @param {string} title - The title to display in the content block
 * @param {string} id - The unique identifier for the content block
 * @returns {HTMLElement} The created content block element
 */
const createFlexContentBlock = (title, id, addToContent = true) => {
  const newBlockElem = document.createElement('div');
  newBlockElem.id = id;
  newBlockElem.classList.add('extra_content_block');

  const titleElem = document.createElement('h2');
  titleElem.textContent = title;

  newBlockElem.appendChild(titleElem);

  const loaderDiv = document.createElement('div');
  loaderDiv.classList.add('loader');
  newBlockElem.appendChild(loaderDiv);

  if(addToContent) getCustomContentBlock().appendChild(newBlockElem);

  return newBlockElem;
}

/**
 * Sets the content of a flex content block by its ID
 * @param {string} id - The unique identifier of the content block
 * @param {string|HTMLElement} content - The content to set (can be text or HTML element)
 */
const setFlexContentBlockContent = (id, content) => {
  const blockElement = document.getElementById(id);
  setFlexContentBlockContentElem(blockElement, content);
}

/**
 * Sets the content of a flex content block by its element
 * @param {HTMLElement} blockElement - The content block element
 * @param {string|HTMLElement} content - The content to set (can be text or HTML element)
 */
const setFlexContentBlockContentElem = (blockElement, content) => {
  if (!blockElement) {
    console.warn(`Content block element not found`);
    return;
  }

  // Remove the loader if it exists
  const loader = blockElement.querySelector('.loader');
  if (loader) {
    loader.remove();
  }

  // Clear existing content except the title
  const title = blockElement.querySelector('h2');
  blockElement.innerHTML = '';
  if (title) {
    blockElement.appendChild(title);
  }

  // Add the new content
  if (typeof content === 'string') {
    blockElement.innerHTML += content;
  } else if (content instanceof HTMLElement) {
    blockElement.appendChild(content);
  } else {
    console.warn('Invalid content type. Expected string or HTMLElement');
  }
}

/**
 * Creates the main custom content structure with toolbar and content areas
 * Inserts the structure after the header toolbar in the document body
 */
const createCustomContentBlock = () => {
  const newBlockElem = document.createElement('div');
  newBlockElem.id = 'extra_main_block';

  document.body.insertBefore(newBlockElem, document.body.children[2]); // After header toolbar

  const extraToolbarBlock = document.createElement('div');
  extraToolbarBlock.id = 'extra_toolbar_block';

  const contentBlockElem = document.createElement('div');
  contentBlockElem.id = 'extra_main_content_block';

  newBlockElem.appendChild(extraToolbarBlock);
  newBlockElem.appendChild(contentBlockElem);
}

/**
 * Creates a toolbar block with navigation links organized in dropdown menus
 * @param {string} appID - The Steam app ID to use in the navigation links
 * @returns {HTMLElement} The created toolbar block element
 */
const createToolbarBlock = (appID) => {
  const newLinksBlockElem = document.createElement('div');
  newLinksBlockElem.classList.add('extra_content_block');
  newLinksBlockElem.id = 'extra_links_block';

  const toolbarBlock = getExtraToolbarBlock();
  toolbarBlock.appendChild(newLinksBlockElem);

  const dateUrlParams = new URLSearchParams(window.location.search);
  const dateStart = dateUrlParams.get('dateStart');
  const dateEnd = dateUrlParams.get('dateEnd');
  const dateParamsString = dateStart && dateEnd ? `?dateStart=${dateStart}&dateEnd=${dateEnd}` : '';

  const toolbarData = [
    {
      label: 'General',
      links: [
        { text: 'Store page', href: `http://store.steampowered.com/app/${appID}` },
        { text: 'Steamworks page', href: `https://partner.steamgames.com/apps/landing/${appID}` },
        { text: 'Sales', href: `https://partner.steampowered.com/app/details/${appID}/${dateParamsString}` },
        { text: 'Wishlists', href: `https://partner.steampowered.com/app/wishlist/${appID}/${dateParamsString}` },
        { text: 'Traffic', href: `https://partner.steamgames.com/apps/navtrafficstats/${appID}` },
      ]
    },
    {
      label: 'Regional reports',
      links: [
        { text: 'Regional sales report', href: `https://partner.steampowered.com/region/?appID=${appID}` },
        { text: 'Regional key activations report', href: `https://partner.steampowered.com/cdkeyreport.php?appID=${appID}` },
        { text: 'Downloads by Region', href: `https://partner.steampowered.com/nav_regions.php?downloads=1&appID=${appID}` }
      ]
    },
    {
      label: 'Hardware',
      links: [
        { text: 'Hardware survey', href: `https://partner.steampowered.com/survey2.php?appID=${appID}` },
        { text: 'Controller stats', href: `https://partner.steampowered.com/app/controllerstats/${appID}/` },
        { text: 'Remote Play stats', href: `https://partner.steampowered.com/app/remoteplay/${appID}/` }
      ]
    }
  ];

  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';

  toolbarData.forEach(item => {
    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown';

    const button = document.createElement('button');
    button.textContent = item.label;

    const dropdownContent = document.createElement('div');
    dropdownContent.className = 'dropdown-content';

    item.links.forEach(link => {
      const anchor = document.createElement('a');
      anchor.href = link.href;
      anchor.textContent = link.text;
      dropdownContent.appendChild(anchor);
    });

    // Assemble the dropdown
    dropdown.appendChild(button);
    dropdown.appendChild(dropdownContent);
    toolbar.appendChild(dropdown);
  });

  newLinksBlockElem.appendChild(toolbar);

  return newLinksBlockElem;
}

/**
 * Creates a new date range selection block and appends it to the content block
 * Will only work if the date range selection block is on a page
 * @returns {HTMLElement} The new date range container element
 */
const moveDateRangeSelectionToTop = () => {
  const toolbarBlock = getExtraToolbarBlock();

  const periodSelectBlock = document.getElementsByClassName('PeriodLinks')[0];
  const periodSelectWholeBlock = helpers.findParentByTag(periodSelectBlock, 'div');

  const newDateRangeContainerElem = document.createElement('div');
  newDateRangeContainerElem.classList.add('extra_content_block');
  newDateRangeContainerElem.id = 'extra_period_block';

  newDateRangeContainerElem.appendChild(periodSelectWholeBlock);

  toolbarBlock.appendChild(newDateRangeContainerElem);

  return newDateRangeContainerElem;
}

/**
 * Moves the game title to the top of the toolbar block
 */
const moveGameTitle = () => {
  const toolbarBlock = getExtraToolbarBlock();

  const titleElem = document.getElementsByTagName('h1')[0];

  toolbarBlock.insertBefore(titleElem, toolbarBlock.firstChild);
}

/**
 * Hides the original main block with all the content which has not been moved to blocks
 */
const hideOriginalMainBlock = () => {
  const elem = document.getElementsByClassName('ContentWrapper')[0];
  elem.style.display = 'none';
}

/**
 * Gets the main custom block element
 * @returns {HTMLElement|null} The main custom block element
 */
const getCustomMainBlock = () => {
  return document.getElementById('extra_main_block');
}

/**
 * Gets the main content block element where flexible content blocks are appended
 * @returns {HTMLElement|null} The main content block element
 */
const getCustomContentBlock = () => {
  return document.getElementById('extra_main_content_block');
}

/**
 * Gets the toolbar block element for additional controls and navigation
 * @returns {HTMLElement|null} The toolbar block element
 */
const getExtraToolbarBlock = () => {
  return document.getElementById('extra_toolbar_block');
}