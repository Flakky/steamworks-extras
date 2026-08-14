import { parseFollowers, parsePageCreationDateFromHistory } from '../src/scripts/parser';

describe('parseFollowers', () => {
    const makeDocument = (pagingText: string): Document => {
        const doc = document.implementation.createHTMLDocument();
        doc.body.innerHTML = `<div class="group_paging">${pagingText}</div>`;
        return doc;
    };

    test('parses the English Steam paging summary', () => {
        expect(parseFollowers(makeDocument('1 - 26 of 1,234 Members'))).toBe(1234);
    });

    test('parses a localized paging summary without relying on words', () => {
        expect(parseFollowers(makeDocument('1-26 von 1 234 Mitgliedern'))).toBe(1234);
    });

    test('fails explicitly instead of returning undefined', () => {
        expect(() => parseFollowers(makeDocument('No members'))).toThrow('No followers count found');
    });
});

describe('parsePageCreationDateFromHistory', () => {
    test('returns the earliest publish-history date regardless of row order', () => {
        const doc = document.implementation.createHTMLDocument();
        doc.body.innerHTML = `
            <div id="tab_publish_content">
                <div class="landingTable">
                    <div><span>Revision 2</span><span>User</span><span>Apr 9, 2025 @ 6:51am</span></div>
                    <div><span>Revision 1</span><span>User</span><span>1 Aug, 2024 @ 7:10pm</span></div>
                </div>
            </div>`;

        expect(parsePageCreationDateFromHistory(doc)).toBe('2024-08-01T00:00:00.000Z');
    });

    test('fails when publish history has no dates', () => {
        const doc = document.implementation.createHTMLDocument();
        doc.body.innerHTML = '<div id="tab_publish_content"><div class="landingTable"></div></div>';
        expect(() => parsePageCreationDateFromHistory(doc)).toThrow('No valid date found');
    });
});
