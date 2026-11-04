import { requestAllReviews } from '../src/background/storage/storage_reviews';

const reply = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

describe('requestAllReviews', () => {
    afterEach(() => { delete (globalThis as any).fetch; });

    test('pages through IUserReviewsService until the page without reviews', async () => {
        const fetchMock = jest.fn()
            .mockResolvedValueOnce(reply({ response: { cursor: 'c1', query_summary: { total_reviews: 2 }, reviews: [{ recommendationid: '1' }, { recommendationid: '2' }] } }))
            .mockResolvedValueOnce(reply({ response: { cursor: 'c1' } }));
        (globalThis as any).fetch = fetchMock;

        const reviews = await requestAllReviews('3658030');

        expect(reviews.map(review => review.recommendationid)).toEqual(['1', '2']);
        const url = new URL(fetchMock.mock.calls[1][0]);
        expect(url.origin + url.pathname).toBe('https://api.steampowered.com/IUserReviewsService/GetAppReviews/v1/');
        expect(JSON.parse(url.searchParams.get('input_json')!)).toEqual({
            appid: 3658030, filter: 1, languages: ['all'], review_type: 0, purchase_type: 1, num_per_page: 100, cursor: 'c1'
        });
    });

    test('rejects an answer that is not a reviews page', async () => {
        (globalThis as any).fetch = jest.fn().mockResolvedValue(reply({}));

        await expect(requestAllReviews('1')).rejects.toThrow('unexpected reviews response');
    });
});
