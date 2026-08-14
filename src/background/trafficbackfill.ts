export type MissingTrafficDate = {
    appid: string;
    date: Date;
};

export const DEFAULT_TRAFFIC_BACKFILL_BATCH_SIZE = 120;

/**
 * Select a bounded, recent-first batch while giving every app a fair share.
 * Remaining dates are discovered again on the next scheduled update.
 */
export const selectTrafficBackfillBatch = (
    datesByApp: MissingTrafficDate[][],
    limit = DEFAULT_TRAFFIC_BACKFILL_BATCH_SIZE
): MissingTrafficDate[] => {
    if (!Number.isFinite(limit) || limit <= 0) return [];

    const queues = datesByApp
        .map(dates => [...dates].sort((a, b) => b.date.getTime() - a.date.getTime()))
        .filter(dates => dates.length > 0);
    const batch: MissingTrafficDate[] = [];

    while (batch.length < limit && queues.some(queue => queue.length > 0)) {
        for (const queue of queues) {
            const next = queue.shift();
            if (next !== undefined) batch.push(next);
            if (batch.length >= limit) break;
        }
    }

    return batch;
};
