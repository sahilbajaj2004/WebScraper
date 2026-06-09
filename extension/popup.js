// Popup script for Google Maps Lead Scraper Extension

let scrapedData = [];

document.addEventListener('DOMContentLoaded', function() {
  const scrapeBtn = document.getElementById('scrapeBtn');
  const exportBtn = document.getElementById('exportBtn');
  const maxResultsInput = document.getElementById('maxResults');
  const statusEl = document.getElementById('status');
  const countEl = document.getElementById('count');
  const phoneCountEl = document.getElementById('phoneCount');
  const websiteCountEl = document.getElementById('websiteCount');
  const resultsListEl = document.getElementById('resultsList');

  // Check if we're on Google Maps
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];
    if (!currentTab.url.includes('google.com/maps')) {
      updateStatus('Please open Google Maps first', 'error');
      scrapeBtn.disabled = true;
    }
  });

  // Start scraping when button clicked
  scrapeBtn.addEventListener('click', async function() {
    const maxResults = parseInt(maxResultsInput.value) || 50;

    scrapeBtn.disabled = true;
    exportBtn.disabled = true;
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
            updateStatus(`Scraped ${scrapedData.length} businesses`, 'success');
            updateResults();
            exportBtn.disabled = false;
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

  // Export to Excel
  exportBtn.addEventListener('click', function() {
    if (scrapedData.length === 0) {
      alert('No data to export!');
      return;
    }

    exportToExcel(scrapedData);
  });

  function updateStatus(message, type = 'success') {
    statusEl.className = 'status ' + type;
    statusEl.innerHTML = '<p>' + message + '</p>';
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
      'Scraped At': new Date().toLocaleString()
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
