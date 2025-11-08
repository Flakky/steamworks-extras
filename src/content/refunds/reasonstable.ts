import * as helpers from '../scripts/helpers';
import * as pageblocks from './pageblocks';

export const createReasonsTableBlock = (): void => {
  pageblocks.createFlexContentBlock('Refund reasons', 'extras_reasons_block');
};

export const createReasonsTable = (packageID: number, refundStats: Array<any>): void => {
  const tableBlockElem = document.createElement('div');

  pageblocks.setFlexContentBlockContent('extras_reasons_block', tableBlockElem);

  // Create table element
  const tableElem = document.createElement('table');
  (tableElem as any).id = 'extras_reasons_table';

  // Create table header
  const thead = tableElem.createTHead();
  const headerRow = thead.insertRow();

  const headers = [
    { text: 'Reason' },
    { text: 'Last week' },
    { text: 'Last month' },
    { text: 'Lifetime' },
  ];

  headers.forEach(header => {
    const th = document.createElement('th');
    th.textContent = (header as any).text;
    headerRow.appendChild(th);
  });


  const reasonsLifetime = (refundStats[0] && refundStats[0].refundReasons) || [];
  const reasonsLastWeek = (refundStats[1] && refundStats[1].refundReasons) || [];
  const reasonsLastMonth = (refundStats[2] && refundStats[2].refundReasons) || [];

  console.log('Reasons: ', refundStats);
  console.log('Reasons lifetime: ', reasonsLifetime);
  console.log('Reasons last week: ', reasonsLastWeek);
  console.log('Reasons last month: ', reasonsLastMonth);

  // Get all unique reasons
  const allReasons = new Set<string>([
    ...(reasonsLifetime.map((r: any) => r.category)),
    ...(reasonsLastWeek.map((r: any) => r.category)),
    ...(reasonsLastMonth.map((r: any) => r.category))
  ]);

  console.log('All reasons: ', allReasons);

  // Get total refunds for each period
  const totalLifetime = reasonsLifetime.reduce((a: number, b: any) => a + (b.amount || 0), 0);
  const totalLastWeek = reasonsLastWeek.reduce((a: number, b: any) => a + (b.amount || 0), 0);
  const totalLastMonth = reasonsLastMonth.reduce((a: number, b: any) => a + (b.amount || 0), 0);

  console.log('Total lifetime: ', totalLifetime);
  console.log('Total last week: ', totalLastWeek);
  console.log('Total last month: ', totalLastMonth);

  // Create table body
  const tbody = tableElem.createTBody();

  allReasons.forEach((reason: string) => {
    const row = tbody.insertRow();

    const reasonObj = reasonsLifetime.find((r: any) => r.category === reason) || { category: reason };

    console.log('Reason: ', reason);

    // Reason
    const tdReason = row.insertCell();
    const link = document.createElement('a');
    link.href = "#";
    link.style.cursor = "pointer";
    link.textContent = `► ${reason}`;
    link.onclick = (event) => requestRefundCommentsAndShow(event, packageID, reasonObj, row);
    tdReason.appendChild(link);

    // Refunds last week
    const valLastWeek = ((reasonsLastWeek.find((r: any) => r.category === reason) || {}).amount || 0);
    const tdLastWeek = row.insertCell();
    tdLastWeek.innerHTML = `${valLastWeek} <span class="extras_refunds_percentage">(${(valLastWeek / totalLastWeek * 100).toFixed(2)}%)</span>`;

    // Refunds last month
    const valLastMonth = ((reasonsLastMonth.find((r: any) => r.category === reason) || {}).amount || 0);
    const tdLastMonth = row.insertCell();
    tdLastMonth.innerHTML = `${valLastMonth} <span class="extras_refunds_percentage">(${(valLastMonth / totalLastMonth * 100).toFixed(2)}%)</span>`;

    // Lifetime refunds
    const valLifetime = ((reasonsLifetime.find((r: any) => r.category === reason) || {}).amount || 0);
    const tdLifetime = row.insertCell();
    tdLifetime.innerHTML = `${valLifetime} <span class="extras_refunds_percentage">(${(valLifetime / totalLifetime * 100).toFixed(2)}%)</span>`;
  });

  tableBlockElem.appendChild(tableElem);
}

export const requestRefundCommentsAndShow = async (event: any, packageID: number, reasonObj: any, row: HTMLTableRowElement): Promise<void> => {
  event.preventDefault();

  const link = row.cells[0].querySelector('a') as HTMLAnchorElement | null;

  if ((row.nextSibling as any) && (row.nextSibling as HTMLElement).classList.contains('reason-details-row')) {
    row.parentNode?.removeChild(row.nextSibling as Node);
    if (link) link.textContent = `► ${reasonObj.category}`;
  }
  else{
    if (link) link.textContent = `▼ ${reasonObj.category}`;
    const detailsRow = document.createElement('tr');
    detailsRow.classList.add('reason-details-row');

    const tdComments = document.createElement('td');
    tdComments.colSpan = 4;

    const commentsDiv = document.createElement('div');
    commentsDiv.className = 'extras_refunds_comments';

    const loader = document.createElement('div');
    loader.className = 'loader';
    commentsDiv.appendChild(loader);

    tdComments.appendChild(commentsDiv);
    detailsRow.appendChild(tdComments);

    row.parentNode?.insertBefore(detailsRow, row.nextSibling);

    const comments = await getRefundComments(packageID, reasonObj.id);

    commentsDiv.removeChild(loader); // Remove loader

    if (comments && comments.length > 0) {
      comments.forEach((comment: any) => {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'refund-comment';

        const text = document.createElement('span');
        text.className = 'refund-comment-text';

        if (comment.language) {
          const langSpan = document.createElement('span');
          langSpan.className = 'refund-comment-language';
          langSpan.textContent = `(${comment.language}) `;
          text.appendChild(langSpan);
        }

        text.innerHTML += ' ' + comment.text;
        commentDiv.appendChild(text);

        commentsDiv.appendChild(commentDiv);
      });
    } else {
      const noCommentsDiv = document.createElement('div');
      noCommentsDiv.className = 'refund-no-comments';
      noCommentsDiv.textContent = 'No comments found for this reason.';
      commentsDiv.appendChild(noCommentsDiv);
    }
  }

}

const getRefundComments = async (packageID: number, reasonID: number): Promise<any[]> => {
  const response = await fetch(`https://partner.steampowered.com/package/AjaxRefundText/${packageID}/?packageid=${packageID}&help_issueid=${reasonID}`, {
    credentials: 'include'
  } as RequestInit);

  console.log('Response: ', response);

  if (!response.ok) {
    console.error('Failed to fetch refund comments:', response.status, response.statusText);
    return [];
  }
  const data = await response.json();

  console.log('Data: ', data);

  const result = await helpers.sendMessageAsync({
    request: 'parseDOM',
    htmlText: data.html,
    type: 'RefundComments'
  });

  console.log('Result: ', result);

  return result;
}


