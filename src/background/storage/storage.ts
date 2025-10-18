import { StorageActionGetSales } from './storage_sales';
import { StorageActionGetReviews } from './storage_reviews';
import { StorageActionGetWishlistConversions } from './storage_wishlistconversions';
import { StorageActionGetWishlists } from './storage_wishlists';
import { StorageActionGetTraffic } from './storage_traffic';
import { StorageActionsQueue } from './storagequeue';

const getDataFromDB = async (queue: StorageActionsQueue, type: string, appId: string, dateStart: Date, dateEnd: Date, returnLackData = true): Promise<any> => {

    const startDate = dateStart ? dateStart : new Date();
    const endDate = dateEnd ? dateEnd : new Date();

    let action: StorageAction | null = null;

    switch (type) {
        case "Traffic": {
            action = new StorageActionGetTraffic(appId, startDate, endDate, returnLackData);
            break;
        }
        case "Sales": {
            action = new StorageActionGetSales(appId, startDate, endDate, returnLackData);
            break;
        }
        case "Reviews": {
            action = new StorageActionGetReviews(appId, startDate, endDate, returnLackData);
            break;
        }
        case "Wishlists": {
            action = new StorageActionGetWishlists(appId, startDate, endDate, returnLackData);
            break;
        }
        case "WishlistConversions": {
            action = new StorageActionGetWishlistConversions(appId, startDate, endDate, returnLackData);
            break;
        }
    }

    if (action === null) {
        throw new Error(`Unknown data type: ${type}`);
    }

    return await queue.insertToQueue(action);
}
