const createReasonsTableBlock = () => {
  createFlexContentBlock('Refund reasons', 'extras_reasons_block');
};

const createReasonsTable = () => {
  const tableBlockElem = document.createElement('div');

  setFlexContentBlockContent('extras_reasons_block', tableBlockElem);

  // Create table element
  const tableElem = document.createElement('table');
  tableElem.id = 'extras_reasons_table';

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
    th.textContent = header.text;
    headerRow.appendChild(th);
  });


  const reasonsLifetime = (refundStats[0] && refundStats[0].refundReasons) || {};
  const reasonsLastWeek = (refundStats[1] && refundStats[1].refundReasons) || {};
  const reasonsLastMonth = (refundStats[2] && refundStats[2].refundReasons) || {};

  console.log('Steamworks extras: Reasons: ', refundStats);
  console.log('Steamworks extras: Reasons lifetime: ', reasonsLifetime);
  console.log('Steamworks extras: Reasons last week: ', reasonsLastWeek);
  console.log('Steamworks extras: Reasons last month: ', reasonsLastMonth);

  // Get all unique reasons
  const allReasons = new Set([
    ...(reasonsLifetime.map(r => r.category)),
    ...(reasonsLastWeek.map(r => r.category)),
    ...(reasonsLastMonth.map(r => r.category))
  ]);

  console.log('Steamworks extras: All reasons: ', allReasons);

  // Get total refunds for each period
  const totalLifetime = reasonsLifetime.reduce((a, b) => a + (b.amount || 0), 0);
  const totalLastWeek = reasonsLastWeek.reduce((a, b) => a + (b.amount || 0), 0);
  const totalLastMonth = reasonsLastMonth.reduce((a, b) => a + (b.amount || 0), 0);

  console.log('Steamworks extras: Total lifetime: ', totalLifetime);
  console.log('Steamworks extras: Total last week: ', totalLastWeek);
  console.log('Steamworks extras: Total last month: ', totalLastMonth);

  // Create table body
  const tbody = tableElem.createTBody();

  allReasons.forEach(reason => {
    const row = tbody.insertRow();

    const reasonObj = reasonsLifetime.find(r => r.category === reason);

    console.log('Steamworks extras: Reason: ', reason);

    // Reason
    const tdReason = row.insertCell();
    const link = document.createElement('a');
    link.href = "#";
    link.style.cursor = "pointer";
    link.textContent = `► ${reason}`;
    link.onclick = (event) => requestRefundCommentsAndShow(event, reasonObj, row);
    tdReason.appendChild(link);

    // Refunds last week
    const valLastWeek = (reasonsLastWeek.find(r => r.category === reason) || {}).amount || 0;
    const tdLastWeek = row.insertCell();
    tdLastWeek.innerHTML = `${valLastWeek} <span class="extras_refunds_percentage">(${(valLastWeek / totalLastWeek * 100).toFixed(2)}%)</span>`;

    // Refunds last month
    const valLastMonth = (reasonsLastMonth.find(r => r.category === reason) || {}).amount || 0;
    const tdLastMonth = row.insertCell();
    tdLastMonth.innerHTML = `${valLastMonth} <span class="extras_refunds_percentage">(${(valLastMonth / totalLastMonth * 100).toFixed(2)}%)</span>`;

    // Lifetime refunds
    const valLifetime = (reasonsLifetime.find(r => r.category === reason) || {}).amount || 0;
    const tdLifetime = row.insertCell();
    tdLifetime.innerHTML = `${valLifetime} <span class="extras_refunds_percentage">(${(valLifetime / totalLifetime * 100).toFixed(2)}%)</span>`;
  });

  tableBlockElem.appendChild(tableElem);
}

const requestRefundCommentsAndShow = async (event, reasonObj, row) => {
  event.preventDefault();

  const link = row.cells[0].querySelector('a');

  if (row.nextSibling && row.nextSibling.classList.contains('reason-details-row')) {
    row.parentNode.removeChild(row.nextSibling);
    link.textContent = `► ${reasonObj.category}`;
  }
  else{
    link.textContent = `▼ ${reasonObj.category}`;
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

    row.parentNode.insertBefore(detailsRow, row.nextSibling);

    const comments = await getRefundComments(reasonObj.id);

    commentsDiv.removeChild(loader); // Remove loader

    if (comments && comments.length > 0) {
      comments.forEach(comment => {
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

const getRefundComments = async (reasonID) => {
  const packageID = getPackageID();
  const response = await fetch(`https://partner.steampowered.com/package/AjaxRefundText/${packageID}/?packageid=${packageID}&help_issueid=${reasonID}`, {
    credentials: 'include'
  });

  console.log('Steamworks extras: Response: ', response);

  if (!response.ok) {
    console.error('Failed to fetch refund comments:', response.status, response.statusText);
    return [];
  }
  const data = await response.json();

  console.log('Steamworks extras: Data: ', data);
  
  const result = await helpers.sendMessageAsync({
    request: 'parseDOM',
    htmlText: data.html,
    type: 'RefundComments'
  });

  console.log('Steamworks extras: Result: ', result);
 
  return result;
}