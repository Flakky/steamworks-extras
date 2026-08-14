import { clampUntrustedPageDate, makeRecentFallbackDate, parseStoreReleaseDate } from '../src/background/pagecreationdate';

describe('page creation date fallbacks', () => {
    const now = new Date('2026-08-14T12:00:00.000Z');

    test('parses a released Store API date', () => {
        expect(parseStoreReleaseDate({ coming_soon: false, date: 'Jun 30, 2026' }, now)?.toISOString())
            .toBe('2026-06-30T00:00:00.000Z');
    });

    test('does not use a coming-soon or future Store date', () => {
        expect(parseStoreReleaseDate({ coming_soon: true, date: 'Sep 1, 2026' }, now)).toBeNull();
        expect(parseStoreReleaseDate({ coming_soon: false, date: 'Sep 1, 2026' }, now)).toBeNull();
    });

    test('caps an untrusted 2014 traffic date to one year', () => {
        expect(clampUntrustedPageDate(new Date('2014-01-01T00:00:00.000Z'), 365, now).toISOString())
            .toBe('2025-08-14T00:00:00.000Z');
    });

    test('uses a 90-day bounded fallback when every source fails', () => {
        expect(makeRecentFallbackDate(90, now).toISOString()).toBe('2026-05-16T00:00:00.000Z');
    });
});
