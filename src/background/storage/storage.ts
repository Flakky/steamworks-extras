import { StorageActionGetSales } from './storage_sales';
import { StorageActionGetReviews } from './storage_reviews';
import { StorageActionGetWishlistConversions } from './storage_wishlistconversions';
import { StorageActionGetRegionalWishlists, StorageActionGetWishlists } from './storage_wishlists';
import { StorageActionGetTraffic } from './storage_traffic';
import { StorageAction } from './storageaction';
import { DateRange } from '../../shared/types/daterange';
import { GetDataType } from '../../shared/types/background_requests';

export const getDataFromDB = async (type: GetDataType, appId: string, dateRange: DateRange, returnLackData = true): Promise<any> => {

    let action: StorageAction | null = null;

    switch (type) {
        case GetDataType.Traffic: {
            action = new StorageActionGetTraffic(appId, dateRange, returnLackData);
            break;
        }
        case GetDataType.Sales: {
            action = new StorageActionGetSales(appId, dateRange, returnLackData);
            break;
        }
        case GetDataType.Reviews: {
            action = new StorageActionGetReviews(appId, dateRange, returnLackData);
            break;
        }
        case GetDataType.Wishlists: {
            action = new StorageActionGetWishlists(appId, dateRange, returnLackData);
            break;
        }
        case GetDataType.WishlistsRegional: {
            action = new StorageActionGetRegionalWishlists(appId, dateRange, returnLackData);
            break;
        }
        case GetDataType.WishlistConversions: {
            action = new StorageActionGetWishlistConversions(appId, dateRange, returnLackData);
            break;
        }
    }

    if (action === null) {
        throw new Error(`Unknown data type: ${type}`);
    }

    // Reads do not go through the requests queue: they are read-only, writes
    // are atomic, and otherwise the page would wait behind long network requests.
    return await action.execute();
}
