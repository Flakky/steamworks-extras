declare const browser: any; // WebExtension polyfill (may be undefined in Chrome)

// Universal getter for browser API
export const getBrowser = (): any => {
  if (typeof browser !== 'undefined') {
    return browser;
  } else if (typeof chrome !== 'undefined') {
    return chrome;
  } else {
    throw new Error('No browser API found');
  }
}
