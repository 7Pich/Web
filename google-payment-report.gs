const SHEET_NAME = 'Payments';

function doPost(e) {
  const sheet = getSheet();
  const payload = JSON.parse(e.postData.contents || '{}');
  const rows = Array.isArray(payload.payments) ? payload.payments : [];

  rows.forEach((payment) => {
    sheet.appendRow([
      new Date(),
      payment.date || '',
      payment.time || '',
      payment.amount || '',
      payment.currency || 'USD',
      payment.paidBy || '',
      payment.method || '',
      payment.business || '',
      payment.transactionId || payment.trx || '',
      payment.apv || ''
    ]);
  });

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, saved: rows.length }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Saved At',
      'Date',
      'Time',
      'Amount',
      'Currency',
      'Paid By',
      'Method',
      'Business',
      'Transaction ID',
      'APV'
    ]);
  }

  return sheet;
}
