import { StorageActionGetSales } from './storage_sales';
import { StorageActionGetReviews } from './storage_reviews';
import { StorageActionGetWishlistConversions } from './storage_wishlistconversions';
import { StorageActionGetWishlists } from './storage_wishlists';
import { StorageActionGetTraffic } from './storage_traffic';
import { StorageActionsQueue } from './storagequeue';
import { StorageAction } from './storageaction';
import { DateRange } from '../../shared/types/daterange';

export const getDataFromDB = async (queue: StorageActionsQueue, type: string, appId: string, dateRange: DateRange, returnLackData = true): Promise<any> => {

    let action: StorageAction | null = null;

    switch (type) {
        case "Traffic": {
            action = new StorageActionGetTraffic(appId, dateRange, returnLackData);
            break;
        }
        case "Sales": {
            action = new StorageActionGetSales(appId, dateRange, returnLackData);
            break;
        }
        case "Reviews": {
            action = new StorageActionGetReviews(appId, dateRange, returnLackData);
            break;
        }
        case "Wishlists": {
            action = new StorageActionGetWishlists(appId, dateRange, returnLackData);
            break;
        }
        case "WishlistConversions": {
            action = new StorageActionGetWishlistConversions(appId, dateRange, returnLackData);
            break;
        }
    }

    if (action === null) {
        throw new Error(`Unknown data type: ${type}`);
    }

    return await queue.insertToQueue(action);
}
