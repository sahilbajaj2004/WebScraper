/**
 * Google Maps Lead Scraper — Google Sheets receiver (Apps Script web app)
 * =======================================================================
 *
 * This script lets the browser extension push scraped leads straight into a
 * Google Sheet you own, so you can view and share them online instead of
 * downloading an Excel file.
 *
 * ── ONE-TIME SETUP ─────────────────────────────────────────────────────
 *  1. Go to https://sheets.google.com and create a new spreadsheet (or use
 *     an existing one). Copy its ID from the URL:
 *        https://docs.google.com/spreadsheets/d/<THIS_IS_THE_ID>/edit
 *     and paste it into SHEET_ID below.
 *  2. Open Apps Script (Extensions → Apps Script, or script.google.com),
 *     delete any sample code, and paste THIS entire file in. Click Save.
 *  3. (Optional, recommended) set a SECRET below and paste the same value
 *     into the extension's "Secret" box. Leave it "" to disable the check.
 *  4. Click Deploy → New deployment.
 *       • Select type (gear icon) → Web app
 *       • Execute as:         Me (your account)
 *       • Who has access:     Anyone with the link
 *     Click Deploy, then Authorize access and allow the permissions.
 *  5. Copy the "Web app" URL — it ends in /exec. Paste that URL into the
 *     extension popup's "Google Sheet URL" box.
 *
 * After editing this script later, you must Deploy → Manage deployments →
 * edit (pencil) → Version: New version → Deploy, or the /exec URL keeps
 * running the old code.
 *
 * NOTE: This script opens the spreadsheet explicitly with openById(SHEET_ID).
 * Do NOT use getActiveSpreadsheet() in a web app — there is no "active"
 * spreadsheet during a doPost, so it returns null and nothing gets written.
 * ───────────────────────────────────────────────────────────────────────
 */

// REQUIRED: the ID of the spreadsheet to write to (from its URL).
var SHEET_ID = '1EiT3MsXgy8dPouQIfASgv5gVBrUfuYEQ1cKs_LkrV8k';

// Optional shared secret. If set, the extension must send the same value or
// the request is rejected. Leave as "" to accept any request to your URL.
var SECRET = '';

// Name of the tab written to inside your spreadsheet.
var SHEET_NAME = 'Leads';

// Column order — keep in sync with the extension's output schema.
var HEADERS = ['Name', 'Phone', 'Email', 'Website', 'Address',
               'Category', 'Rating', 'Reviews', 'Scraped At'];

function doPost(e) {
  try {
    Logger.log('doPost: received request');

    if (!e || !e.postData || !e.postData.contents) {
      Logger.log('doPost: no POST body');
      return _json({ success: false, error: 'No POST body received' });
    }
    Logger.log('doPost: raw body = %s', e.postData.contents);

    var payload = JSON.parse(e.postData.contents);

    if (SECRET && payload.token !== SECRET) {
      Logger.log('doPost: secret mismatch');
      return _json({ success: false, error: 'Invalid secret token' });
    }

    var businesses = payload.businesses || [];
    Logger.log('doPost: %s businesses in payload', businesses.length);
    if (!businesses.length) {
      return _json({ success: false, error: 'No businesses in payload' });
    }

    // Open the target spreadsheet explicitly by ID (works in web-app context,
    // bound or standalone). getActiveSpreadsheet() would return null here.
    var ss = SpreadsheetApp.openById(SHEET_ID);
    Logger.log('doPost: opened spreadsheet "%s" (%s)', ss.getName(), ss.getId());

    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      Logger.log('doPost: created tab "%s"', SHEET_NAME);
    } else {
      Logger.log('doPost: using existing tab "%s"', SHEET_NAME);
    }

    var lastRowBefore = sheet.getLastRow();
    Logger.log('doPost: getLastRow() before write = %s', lastRowBefore);

    // Write the header row once (when the sheet is empty).
    if (lastRowBefore === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
      SpreadsheetApp.flush();
      Logger.log('doPost: wrote header row');
    }

    var rows = businesses.map(function (b) {
      return [
        b.name || '',
        b.phone || '',
        b.email || 'N/A (visit website)',
        b.website || '',
        b.address || '',
        b.category || '',
        b.rating || '',
        b.reviews || '',
        b.scraped_at || ''
      ];
    });

    var startRow = sheet.getLastRow() + 1;
    Logger.log('doPost: writing %s rows starting at row %s', rows.length, startRow);

    sheet.getRange(startRow, 1, rows.length, HEADERS.length).setValues(rows);
    SpreadsheetApp.flush();

    var lastRowAfter = sheet.getLastRow();
    Logger.log('doPost: getLastRow() after write = %s (added %s)',
               lastRowAfter, lastRowAfter - lastRowBefore);

    return _json({ success: true, url: ss.getUrl(), added: rows.length });

  } catch (err) {
    Logger.log('doPost ERROR: %s\n%s', err, (err && err.stack) || '(no stack)');
    return _json({ success: false, error: String(err) });
  }
}

// Lets you open the /exec URL in a browser to confirm the deployment is live.
function doGet() {
  return _json({ success: true, status: 'Lead receiver is running. Use POST.' });
}

// Run this manually from the Apps Script editor (Run ▸ testWrite) to verify
// SHEET_ID/permissions independently of the extension. Check Executions log.
function testWrite() {
  var fakeEvent = {
    postData: {
      contents: JSON.stringify({
        businesses: [{
          name: 'TEST ROW', phone: '000', email: 'test@test.com',
          website: 'https://example.com', address: '1 Test St',
          category: 'Test', rating: '5.0', reviews: '1',
          scraped_at: new Date().toLocaleString()
        }]
      })
    }
  };
  var result = doPost(fakeEvent);
  Logger.log('testWrite result: %s', result.getContent());
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
