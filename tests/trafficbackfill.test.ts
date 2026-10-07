import { selectTrafficBackfillBatch } from '../src/background/trafficbackfill';

const request = (appid: string, date: string) => ({ appid, date: new Date(`${date}T00:00:00.000Z`) });

describe('selectTrafficBackfillBatch', () => {
    test('bounds the number of queued historical requests', () => {
        const dates = Array.from({ length: 500 }, (_, index) =>
            request('1', `2025-01-${String((index % 28) + 1).padStart(2, '0')}`));

        expect(selectTrafficBackfillBatch([dates], 120)).toHaveLength(120);
    });

    test('selects recent dates first without mutating the input', () => {
        const dates = [request('1', '2025-01-01'), request('1', '2025-01-03'), request('1', '2025-01-02')];

        expect(selectTrafficBackfillBatch([dates], 2).map(item => item.date.toISOString())).toEqual([
            '2025-01-03T00:00:00.000Z',
            '2025-01-02T00:00:00.000Z'
        ]);
        expect(dates[0].date.toISOString()).toBe('2025-01-01T00:00:00.000Z');
    });

    test('shares the batch between apps instead of starving later apps', () => {
        const appOne = [request('1', '2025-01-03'), request('1', '2025-01-02'), request('1', '2025-01-01')];
        const appTwo = [request('2', '2025-01-03'), request('2', '2025-01-02'), request('2', '2025-01-01')];

        expect(selectTrafficBackfillBatch([appOne, appTwo], 4).map(item => item.appid)).toEqual(['1', '2', '1', '2']);
    });
});
