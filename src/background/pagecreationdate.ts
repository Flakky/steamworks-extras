const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const makeRecentFallbackDate = (days = 90, now = new Date()): Date => {
    const date = new Date(now.getTime() - days * DAY_IN_MS);
    date.setUTCHours(0, 0, 0, 0);
    return date;
};
export const clampUntrustedPageDate = (date: Date, maxLookbackDays = 365, now = new Date()): Date => {
    const earliestAllowedDate = makeRecentFallbackDate(maxLookbackDays, now);
    return date < earliestAllowedDate ? earliestAllowedDate : date;
};

export const parseStoreReleaseDate = (releaseDate: unknown, now = new Date()): Date | null => {
    if (!releaseDate || typeof releaseDate !== 'object') return null;

    const value = releaseDate as { coming_soon?: unknown; date?: unknown };
    if (value.coming_soon === true || typeof value.date !== 'string' || value.date.trim() === '') {
        return null;
    }

    // The Store API is requested with l=english, so Date.parse receives a
    // stable value such as "Jun 30, 2026".
    const timestamp = Date.parse(`${value.date.trim()} UTC`);
    if (!Number.isFinite(timestamp)) return null;

    const date = new Date(timestamp);
    date.setUTCHours(0, 0, 0, 0);

    if (date.getTime() > now.getTime()) return null;
    return date;
};
