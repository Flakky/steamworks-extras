export const getPageContentElem = (doc: Document): HTMLElement => {
  const pageContentElem = doc.getElementsByClassName('AdminPageContent') as HTMLCollectionOf<HTMLElement>;
  return pageContentElem[0];
}

export const hideOldElements = (doc: Document) => {
  const pageContentElem = getPageContentElem(doc);


  for (let i = 11; i <= 15; i++) {
    const child = pageContentElem.children[i] as HTMLElement;
    if (!child) {
      continue;
    }

    child.style.display = 'none';
    return;
  }

  throw new Error('Old elements not found');
}
