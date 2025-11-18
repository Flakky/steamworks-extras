import { setFlexContentBlockContent } from "../pageblocks";
import { getCurrentURL, getDateRangeFromURL } from "../site";
import { ReviewsData } from "./types";
import { isDateInRange } from "../../shared/types/daterange";

export const createReviewsTable = (doc: Document) => {
    const reviesTableElem = doc.createElement('table');
    reviesTableElem.id = 'extras_reviews_table';

    setFlexContentBlockContent(doc, 'extra_reviews_table_block', reviesTableElem);
}

export const updateReviewsTable = (doc: Document, reviews: ReviewsData) => {
    if (reviews == undefined) return;

    const reviesTableElem = doc.getElementById('extras_reviews_table') as HTMLTableElement;
    if (!reviesTableElem) {
        throw new Error('Reviews table not found');
    }

    const addRowCell = (row: HTMLTableRowElement, innerHTML: string) => {
        const cellElem = doc.createElement('td');
        cellElem.innerHTML = innerHTML;

        row.appendChild(cellElem);
        return cellElem;
    }

    // Column name rows
    const columns = ['Language', 'Total', 'Positive', 'Negative', 'Ratio'];

    const columnNamesRow = reviesTableElem.insertRow(0);
    for (const column of columns) {
        addRowCell(columnNamesRow, column);
    }

    const dateRange = getDateRangeFromURL(getCurrentURL());

    let languageReviewsStats: Record<string, { Positive: number, Negative: number }> = {};

    for (const review of reviews.reviews) {
        const reviewDate = new Date(review.timestamp_created * 1000); // Timestamp is in seconds on Steam

        if (!isDateInRange(reviewDate, dateRange)) continue;

        if (!languageReviewsStats[review.language]) languageReviewsStats[review.language] = {
            "Positive": 0,
            "Negative": 0
        }
        languageReviewsStats[review.language][review.voted_up ? "Positive" : "Negative"] = languageReviewsStats[review.language][review.voted_up ? "Positive" : "Negative"] + 1;
    }

    for (const [key, value] of Object.entries(languageReviewsStats)) {
        const row = reviesTableElem.insertRow(reviesTableElem.rows.length);
        const positive = value['Positive'];
        const negative = value['Negative'];
        addRowCell(row, key);
        addRowCell(row, (positive + negative).toString());
        addRowCell(row, positive.toString());
        addRowCell(row, negative.toString());

        const percentage = (positive / (positive + negative) * 100);
        const percentageText = `${percentage.toFixed(1)} %`;

        const startColor = { r: 220, g: 0, b: 0 };
        const endColor = { r: 0, g: 220, b: 0 };

        const factor = Math.min(1, Math.max(0, (percentage - 40) / 60));

        const result = {
            r: Math.round(startColor.r + factor * (endColor.r - startColor.r)),
            g: Math.round(startColor.g + factor * (endColor.g - startColor.g)),
            b: Math.round(startColor.b + factor * (endColor.b - startColor.b))
        };

        const percentageCell = addRowCell(row, percentageText);
        percentageCell.style.color = `rgba(${result.r}, ${result.g}, ${result.b}, 1)`;
    }
}
