import { findParentByTag } from '../scripts/helpers';

/**
 * Creates a flexible content block with a title and appends it to the main content area
 * @param title - The title to display in the content block
 * @param id - The unique identifier for the content block
 * @returns The created content block element
 */
export const createFlexContentBlock = (doc: Document, title: string, id: string, addToContent: boolean = true): HTMLDivElement => {
  const newBlockElem = doc.createElement('div');
  newBlockElem.id = id;
  newBlockElem.classList.add('extra_content_block');

  const titleElem = doc.createElement('h2');
  titleElem.textContent = title;

  newBlockElem.appendChild(titleElem);

  const loaderDiv = doc.createElement('div');
  loaderDiv.classList.add('loader');
  newBlockElem.appendChild(loaderDiv);

  if (addToContent) getCustomContentBlock(doc)?.appendChild(newBlockElem);

  return newBlockElem;
}

/**
 * Sets the content of a flex content block by its ID
 * @param id - The unique identifier of the content block
 * @param content - The content to set (can be text or document element)
 */
export const setFlexContentBlockContent = (doc: Document, id: string, content: string | Element): void => {
  const blockElement = doc.getElementById(id);
  if (!blockElement) {
    throw new Error(`Content block element not found`);
  }

  setFlexContentBlockContentElem(blockElement, content);
}

/**
 * Sets the content of a flex content block by its element
 * @param blockElement - The content block element
 * @param content - The content to set (can be text or document element)
 */
export const setFlexContentBlockContentElem = (blockElement: Element, content: string | Element): void => {
  const loader = blockElement.querySelector('.loader');
  if (loader) {
    loader.remove();
  }

  const title = blockElement.querySelector('h2');
  blockElement.innerHTML = '';
  if (title) {
    blockElement.appendChild(title);
  }

  if (typeof content === 'string') {
    blockElement.innerHTML += content;
  } else if (content instanceof Element) {
    blockElement.appendChild(content);
  } else {
    console.warn('Invalid content type. Expected string or HTMLElement');
  }
}

/**
 * Creates the main custom content structure with toolbar and content areas
 * Inserts the structure after the header toolbar in the document body
 */
export const createCustomContentBlock = (doc: Document): void => {
  const newBlockElem = doc.createElement('div');
  newBlockElem.id = 'extra_main_block';

  doc.body.insertBefore(newBlockElem, doc.body.children[2]); // After header toolbar

  const extraToolbarBlock = doc.createElement('div');
  extraToolbarBlock.id = 'extra_toolbar_block';

  const contentBlockElem = doc.createElement('div');
  contentBlockElem.id = 'extra_main_content_block';

  newBlockElem.appendChild(extraToolbarBlock);
  newBlockElem.appendChild(contentBlockElem);
}

/**
 * Creates a toolbar block with navigation links organized in dropdown menus
 * @param appID - The Steam app ID to use in the navigation links
 * @returns The created toolbar block element
 */
export const createToolbarBlock = (doc: Document, appID: string | number): HTMLDivElement => {
  const newLinksBlockElem = doc.createElement('div');
  newLinksBlockElem.classList.add('extra_content_block');
  newLinksBlockElem.id = 'extra_links_block';

  const toolbarBlock = getExtraToolbarBlock(doc);
  toolbarBlock?.appendChild(newLinksBlockElem);

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

  const toolbar = doc.createElement('div');
  toolbar.className = 'toolbar';

  toolbarData.forEach(item => {
    const dropdown = doc.createElement('div');
    dropdown.className = 'dropdown';

    const button = doc.createElement('button');
    button.textContent = item.label;

    const dropdownContent = doc.createElement('div');
    dropdownContent.className = 'dropdown-content';

    item.links.forEach(link => {
      const anchor = doc.createElement('a');
      anchor.href = link.href;
      anchor.textContent = link.text;
      dropdownContent.appendChild(anchor);
    });

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
 * @returns The new date range container element
 */
export const moveDateRangeSelectionToTop = (doc: Document): HTMLDivElement => {
  const toolbarBlock = getExtraToolbarBlock(doc);

  const periodSelectBlock = doc.getElementsByClassName('PeriodLinks')[0] as HTMLElement;
  const periodSelectWholeBlock = findParentByTag(periodSelectBlock, 'div');
  if (!periodSelectWholeBlock) throw new Error('Period select whole block not found');

  const newDateRangeContainerElem = doc.createElement('div');
  newDateRangeContainerElem.classList.add('extra_content_block');
  newDateRangeContainerElem.id = 'extra_period_block';

  newDateRangeContainerElem.appendChild(periodSelectWholeBlock);

  toolbarBlock?.appendChild(newDateRangeContainerElem);

  return newDateRangeContainerElem;
}

/**
 * Moves the game title to the top of the toolbar block
 */
export const moveGameTitle = (doc: Document): void => {
  const toolbarBlock = getExtraToolbarBlock(doc);

  const titleElem = doc.getElementsByTagName('h1')[0];

  toolbarBlock?.insertBefore(titleElem, toolbarBlock.firstChild);
}

/**
 * Hides the original main block with all the content which has not been moved to blocks
 */
export const hideOriginalMainBlock = (doc: Document): void => {
  const elem = doc.getElementsByClassName('ContentWrapper')[0] as HTMLElement;
  elem.style.display = 'none';
}

/**
 * Gets the main custom block element
 * @returns The main custom block element
 */
export const getCustomMainBlock = (doc: Document): HTMLElement | null => {
  return doc.getElementById('extra_main_block');
}

/**
 * Gets the main content block element where flexible content blocks are appended
 * @returns The main content block element
 */
export const getCustomContentBlock = (doc: Document): HTMLElement | null => {
  return doc.getElementById('extra_main_content_block');
}

/**
 * Gets the toolbar block element for additional controls and navigation
 * @returns The toolbar block element
 */
export const getExtraToolbarBlock = (doc: Document): HTMLElement | null => {
  return doc.getElementById('extra_toolbar_block');
}

/**
 * Creates a message block with a title and a text.
 *
 * @param {string} type - Type of the message. Can be 'error' or 'warning'
 * @param {string} text - Text of the message
 * @returns {object} - DOM Element
 */
export const createMessageText = (doc: Document, type: 'error' | 'warning', text: string): HTMLParagraphElement => {
  const block = doc.createElement('p');
  const title = doc.createElement('b');

  switch (type) {
    case 'error': {
      title.textContent = 'Steamworks extras error: ';
      block.classList.add('extra_error_text');
      break;
    }
    case 'warning': {
      title.textContent = 'Steamworks extras warning: ';
      block.classList.add('extra_warning_text');
      break;
    }
  }

  const textBlock = doc.createElement('span');
  textBlock.textContent = text;

  block.appendChild(title);
  block.appendChild(textBlock);

  return block;
}
