import * as helpers from '../scripts/helpers';

/**
 * Creates a flexible content block with a title and appends it to the main content area
 * @param title - The title to display in the content block
 * @param id - The unique identifier for the content block
 * @returns The created content block element
 */
export const createFlexContentBlock = (title: string, id: string, addToContent: boolean = true): HTMLDivElement => {
  const newBlockElem = document.createElement('div');
  newBlockElem.id = id;
  newBlockElem.classList.add('extra_content_block');

  const titleElem = document.createElement('h2');
  titleElem.textContent = title;

  newBlockElem.appendChild(titleElem);

  const loaderDiv = document.createElement('div');
  loaderDiv.classList.add('loader');
  newBlockElem.appendChild(loaderDiv);

  if (addToContent) getCustomContentBlock()?.appendChild(newBlockElem);

  return newBlockElem;
}

/**
 * Sets the content of a flex content block by its ID
 * @param id - The unique identifier of the content block
 * @param content - The content to set (can be text or HTML element)
 */
export const setFlexContentBlockContent = (id: string, content: string | HTMLElement): void => {
  const blockElement = document.getElementById(id);
  setFlexContentBlockContentElem(blockElement as HTMLElement | null, content);
}

/**
 * Sets the content of a flex content block by its element
 * @param blockElement - The content block element
 * @param content - The content to set (can be text or HTML element)
 */
export const setFlexContentBlockContentElem = (blockElement: HTMLElement | null, content: string | HTMLElement): void => {
  if (!blockElement) {
    console.warn(`Content block element not found`);
    return;
  }

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
export const createCustomContentBlock = (): void => {
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
 * @param appID - The Steam app ID to use in the navigation links
 * @returns The created toolbar block element
 */
export const createToolbarBlock = (appID: string | number): HTMLDivElement => {
  const newLinksBlockElem = document.createElement('div');
  newLinksBlockElem.classList.add('extra_content_block');
  newLinksBlockElem.id = 'extra_links_block';

  const toolbarBlock = getExtraToolbarBlock();
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
export const moveDateRangeSelectionToTop = (): HTMLDivElement => {
  const toolbarBlock = getExtraToolbarBlock();

  const periodSelectBlock = document.getElementsByClassName('PeriodLinks')[0] as HTMLElement;
  const periodSelectWholeBlock = helpers.findParentByTag(periodSelectBlock, 'div');
  if (!periodSelectWholeBlock) throw new Error('Period select whole block not found');

  const newDateRangeContainerElem = document.createElement('div');
  newDateRangeContainerElem.classList.add('extra_content_block');
  newDateRangeContainerElem.id = 'extra_period_block';

  newDateRangeContainerElem.appendChild(periodSelectWholeBlock);

  toolbarBlock?.appendChild(newDateRangeContainerElem);

  return newDateRangeContainerElem;
}

/**
 * Moves the game title to the top of the toolbar block
 */
export const moveGameTitle = (): void => {
  const toolbarBlock = getExtraToolbarBlock();

  const titleElem = document.getElementsByTagName('h1')[0];

  toolbarBlock?.insertBefore(titleElem, toolbarBlock.firstChild);
}

/**
 * Hides the original main block with all the content which has not been moved to blocks
 */
export const hideOriginalMainBlock = (): void => {
  const elem = document.getElementsByClassName('ContentWrapper')[0] as HTMLElement;
  elem.style.display = 'none';
}

/**
 * Gets the main custom block element
 * @returns The main custom block element
 */
export const getCustomMainBlock = (): HTMLElement | null => {
  return document.getElementById('extra_main_block');
}

/**
 * Gets the main content block element where flexible content blocks are appended
 * @returns The main content block element
 */
export const getCustomContentBlock = (): HTMLElement | null => {
  return document.getElementById('extra_main_content_block');
}

/**
 * Gets the toolbar block element for additional controls and navigation
 * @returns The toolbar block element
 */
export const getExtraToolbarBlock = (): HTMLElement | null => {
  return document.getElementById('extra_toolbar_block');
}


