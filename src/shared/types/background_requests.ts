import { OffscreenParseResponse } from "../../background/offscreen/offscreenmanager";

export type BackgroundMessage =
    | { request: BackgroundMessageType.showOptions; payload: undefined }
    | { request: BackgroundMessageType.makeRequest; payload: { url: string; params?: any } }
    | { request: BackgroundMessageType.getAppIDs; payload: undefined }
    | { request: BackgroundMessageType.getPackageIDs; payload: undefined }
    | { request: BackgroundMessageType.getPageCreationDates; payload: undefined }
    | { request: BackgroundMessageType.getQueueLenght; payload: undefined }
    | { request: BackgroundMessageType.getStatus; payload: undefined }
    | {
        request: BackgroundMessageType.getData;
        payload: {
            type: GetDataType;
            appId: string;
            dateStart?: string;
            dateEnd?: string;
            returnLackData?: boolean;
        }
    }
    | { request: BackgroundMessageType.parseDOM; payload: { htmlText?: string; url?: string; type: string } }
    | { request: BackgroundMessageType.parsedDOM; payload: OffscreenParseResponse } // OffscreenParseResponse - defined in offscreenmanager
    | { request: BackgroundMessageType.updateStats; payload: undefined };

export enum BackgroundMessageType {
    showOptions = "showOptions",
    makeRequest = "makeRequest",
    getAppIDs = "getAppIDs",
    getPackageIDs = "getPackageIDs",
    getPageCreationDates = "getPageCreationDates",
    getQueueLenght = "getQueueLenght",
    getStatus = "getStatus",
    getData = "getData",
    parseDOM = "parseDOM",
    parsedDOM = "parsedDOM",
    updateStats = "updateStats"
}

export enum GetDataType {
    Traffic = 'Traffic',
    Sales = 'Sales',
    Reviews = 'Reviews',
    Wishlists = 'Wishlists',
    WishlistConversions = 'WishlistConversions'
}
