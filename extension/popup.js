// Popup script for Google Maps Lead Scraper Extension

let scrapedData = [];

document.addEventListener('DOMContentLoaded', function() {
  const scrapeBtn = document.getElementById('scrapeBtn');
  const sendSheetBtn = document.getElementById('sendSheetBtn');
  const exportBtn = document.getElementById('exportBtn');
  const maxResultsInput = document.getElementById('maxResults');
  const sheetUrlInput = document.getElementById('sheetUrl');
  const sheetSecretInput = document.getElementById('sheetSecret');
  const statusEl = document.getElementById('status');
  const countEl = document.getElementById('count');
  const phoneCountEl = document.getElementById('phoneCount');
  const websiteCountEl = document.getElementById('websiteCount');
  const resultsListEl = document.getElementById('resultsList');

  // Restore saved settings and the last scrape so closing/reopening the popup
  // does not lose data.
  chrome.storage.local.get(['sheetUrl', 'sheetSecret', 'scrapedData'], function(saved) {
    if (saved.sheetUrl) sheetUrlInput.value = saved.sheetUrl;
    if (saved.sheetSecret) sheetSecretInput.value = saved.sheetSecret;
    if (Array.isArray(saved.scrapedData) && saved.scrapedData.length) {
      scrapedData = saved.scrapedData;
      updateResults();
      exportBtn.disabled = false;
      sendSheetBtn.disabled = false;
      updateStatus(`Loaded ${scrapedData.length} businesses from last scrape`, 'success');
    }
  });

  // Persist the Sheet settings as they change.
  sheetUrlInput.addEventListener('change', function() {
    chrome.storage.local.set({sheetUrl: sheetUrlInput.value.trim()});
  });
  sheetSecretInput.addEventListener('change', function() {
    chrome.storage.local.set({sheetSecret: sheetSecretInput.value});
  });

  // Check if we're on Google Maps (guard against tabs with no readable URL).
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];
    if (!currentTab || !currentTab.url || !currentTab.url.includes('google.com/maps')) {
      updateStatus('Please open Google Maps first', 'error');
      scrapeBtn.disabled = true;
    }
  });

  // Live progress messages from the content script during a scrape.
  chrome.runtime.onMessage.addListener(function(msg) {
    if (msg && msg.action === 'progress') {
      if (msg.phase === 'loading') {
        updateStatus(`Loading results… ${msg.scraped} found`, 'loading');
      } else {
        updateStatus(`Scraping ${msg.done}/${msg.total}… ${msg.scraped} saved`, 'loading');
        countEl.textContent = msg.scraped;
      }
    }
  });

  // Start scraping when button clicked
  scrapeBtn.addEventListener('click', async function() {
    const maxResults = parseInt(maxResultsInput.value) || 50;

    scrapeBtn.disabled = true;
    exportBtn.disabled = true;
    sendSheetBtn.disabled = true;
    updateStatus('Scraping in progress...', 'loading');
    scrapedData = [];
    updateResults();

    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});

      // Send message to content script to start scraping
      chrome.tabs.sendMessage(
        tab.id,
        {action: 'scrape', maxResults: maxResults},
        function(response) {
          if (chrome.runtime.lastError) {
            const errorMsg = chrome.runtime.lastError.message;

            // Handle "Receiving end does not exist" error specifically
            if (errorMsg.includes('Receiving end does not exist')) {
              updateStatus('Please refresh the Google Maps page (F5) and try again', 'error');
            } else {
              updateStatus('Error: ' + errorMsg, 'error');
            }

            scrapeBtn.disabled = false;
            return;
          }

          if (response && response.success) {
            scrapedData = response.data;
            chrome.storage.local.set({scrapedData: scrapedData});
            updateStatus(`Scraped ${scrapedData.length} businesses`, 'success');
            updateResults();
            exportBtn.disabled = false;
            sendSheetBtn.disabled = scrapedData.length === 0;
            scrapeBtn.disabled = false;
          } else {
            updateStatus('Scraping failed: ' + (response?.error || 'Unknown error'), 'error');
            scrapeBtn.disabled = false;
          }
        }
      );
    } catch (error) {
      updateStatus('Error: ' + error.message, 'error');
      scrapeBtn.disabled = false;
    }
  });

  // Send results to the user's Google Sheet (via their Apps Script web app)
  sendSheetBtn.addEventListener('click', function() {
    if (scrapedData.length === 0) {
      alert('No data to send!');
      return;
    }
    sendToGoogleSheet(scrapedData);
  });

  // Export to Excel (fallback)
  exportBtn.addEventListener('click', function() {
    if (scrapedData.length === 0) {
      alert('No data to export!');
      return;
    }

    exportToExcel(scrapedData);
  });

  async function sendToGoogleSheet(data) {
    const url = sheetUrlInput.value.trim();
    if (!url) {
      updateStatus('Paste your Google Sheet web app URL (see apps_script.gs) under "Google Sheet setup"', 'error');
      return;
    }

    sendSheetBtn.disabled = true;
    updateStatus(`Sending ${data.length} businesses to Google Sheet…`, 'loading');

    try {
      // text/plain keeps this a "simple" request so the browser skips the CORS
      // preflight, which Apps Script web apps do not handle well.
      const res = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'text/plain;charset=utf-8'},
        body: JSON.stringify({businesses: data, token: sheetSecretInput.value})
      });

      const result = await res.json();

      if (result && result.success) {
        updateStatus(`Sent ${result.added} rows to your Google Sheet`, 'success');
        if (result.url) {
          chrome.tabs.create({url: result.url});
        }
      } else {
        updateStatus('Sheet error: ' + (result?.error || 'Unknown error'), 'error');
      }
    } catch (error) {
      updateStatus('Could not reach the web app. Check the URL and that access is "Anyone with the link". (' + error.message + ')', 'error');
    } finally {
      sendSheetBtn.disabled = false;
    }
  }

  function updateStatus(message, type = 'success') {
    statusEl.className = 'status ' + type;
    statusEl.innerHTML = '<p>' + escapeHtml(message) + '</p>';
  }

  function updateResults() {
    countEl.textContent = scrapedData.length;

    const withPhone = scrapedData.filter(b => b.phone).length;
    const withWebsite = scrapedData.filter(b => b.website).length;

    phoneCountEl.textContent = withPhone;
    websiteCountEl.textContent = withWebsite;

    // Display first 10 results in list
    resultsListEl.innerHTML = '';
    const displayData = scrapedData.slice(0, 10);

    displayData.forEach(business => {
      const item = document.createElement('div');
      item.className = 'result-item';

      item.innerHTML = `
        <strong>${escapeHtml(business.name)}</strong>
        ${business.phone ? `<span>${escapeHtml(business.phone)}</span>` : ''}
        ${business.website ? `<span>${escapeHtml(business.website)}</span>` : ''}
        ${business.address ? `<span>${escapeHtml(business.address)}</span>` : ''}
      `;

      resultsListEl.appendChild(item);
    });

    if (scrapedData.length > 10) {
      const more = document.createElement('div');
      more.style.padding = '10px';
      more.style.textAlign = 'center';
      more.style.color = '#666';
      more.style.fontSize = '11px';
      more.textContent = `+ ${scrapedData.length - 10} more businesses`;
      resultsListEl.appendChild(more);
    }
  }

  function exportToExcel(data) {
    // Prepare data for Excel
    const excelData = data.map(business => ({
      'Name': business.name || '',
      'Phone': business.phone || '',
      'Email': business.email || 'N/A (visit website)',
      'Website': business.website || '',
      'Address': business.address || '',
      'Category': business.category || '',
      'Rating': business.rating || '',
      'Reviews': business.reviews || '',
      'Scraped At': business.scraped_at || ''
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    ws['!cols'] = [
      {wch: 30}, // Name
      {wch: 15}, // Phone
      {wch: 25}, // Email
      {wch: 40}, // Website
      {wch: 40}, // Address
      {wch: 20}, // Category
      {wch: 8},  // Rating
      {wch: 10}, // Reviews
      {wch: 20}  // Scraped At
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `google_maps_leads_${timestamp}.xlsx`;

    // Export file
    XLSX.writeFile(wb, filename);

    updateStatus(`Exported to ${filename}`, 'success');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
});
