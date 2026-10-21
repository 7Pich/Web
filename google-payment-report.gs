const CONFIG = {
  // Leave blank only when this script is created from inside the target Sheet.
  // For a standalone Apps Script Web App, paste the Google Sheet ID here.
  SPREADSHEET_ID: '1p7hFWH9_DiFvR0vi8rLuzcq_FroG772xTAhJtommekM',
  SHEET_NAME: 'Payments'
};

const HEADERS = [
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
];

function doPost(e) {
  try {
    const sheet = getSheet();
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const rows = Array.isArray(payload.payments) ? payload.payments : [];

    if (rows.length) {
      const values = rows.map((payment) => [
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
      sheet.getRange(sheet.getLastRow() + 1, 1, values.length, HEADERS.length).setValues(values);
    }

    return jsonResponse({ ok: true, saved: rows.length, sheet: CONFIG.SHEET_NAME });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

function doGet() {
  try {
    const sheet = getSheet();
    return jsonResponse({
      ok: true,
      sheet: CONFIG.SHEET_NAME,
      rows: Math.max(sheet.getLastRow() - 1, 0)
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

function setupPaymentSheet() {
  const sheet = getSheet();
  return {
    ok: true,
    sheet: CONFIG.SHEET_NAME,
    spreadsheetUrl: sheet.getParent().getUrl()
  };
}

function getSheet() {
  const spreadsheet = getSpreadsheet();
  let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }

  return sheet;
}

function getSpreadsheet() {
  if (CONFIG.SPREADSHEET_ID) {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('Set CONFIG.SPREADSHEET_ID or create this Apps Script from inside the target Google Sheet.');
  }
  return spreadsheet;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
