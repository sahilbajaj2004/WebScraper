// Content script for scraping Google Maps
// This script runs on google.com/maps pages

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrape') {
    console.log('Starting scrape with max results:', request.maxResults);

    // Scrape the data
    scrapeGoogleMaps(request.maxResults)
      .then(data => {
        console.log('Scraping completed:', data.length, 'businesses');
        sendResponse({success: true, data: data});
      })
      .catch(error => {
        console.error('Scraping error:', error);
        sendResponse({success: false, error: error.message});
      });

    // Return true to indicate async response
    return true;
  }
});

async function scrapeGoogleMaps(maxResults) {
  const businesses = [];
  const seenNames = new Set();
  const scrapedUrls = new Set();

  await sleep(1000);

  const feedElement = document.querySelector('div[role="feed"]');
  if (!feedElement) {
    throw new Error('Google Maps results not found. Please search for a location first.');
  }

  // Auto-scroll the results panel to load up to maxResults businesses.
  // The feed is virtualized, so we must load entries before collecting them.
  await scrollFeed(feedElement, maxResults);

  // Build list of unique business URLs (not DOM elements). DOM nodes are
  // recycled across clicks, so we hold the cleaned href strings instead and
  // re-find a fresh element on each iteration.
  const uniqueUrls = collectUniqueUrls();

  if (uniqueUrls.length === 0) {
    throw new Error('No businesses found. Try scrolling down to load more results.');
  }

  const totalToScrape = Math.min(uniqueUrls.length, maxResults);
  console.log(`Found ${uniqueUrls.length} unique businesses, will scrape ${totalToScrape}`);

  // Process each unique business
  for (let i = 0; i < totalToScrape; i++) {
    try {
      const targetUrl = uniqueUrls[i];

      // Skip if already scraped this URL
      if (scrapedUrls.has(targetUrl)) {
        console.log(`Skipping already processed URL: ${targetUrl}`);
        continue;
      }

      // Find a fresh element whose cleaned href matches the target. We compare
      // hrefs in JS rather than building a CSS selector from URL fragments
      // (those contain !,:/= and would be an invalid/incorrect selector).
      const feed = document.querySelector('div[role="feed"]');
      const linkElement = Array.from(feed.querySelectorAll('a[href*="/maps/place/"]'))
        .find(a => cleanUrl(a.href) === targetUrl);

      if (linkElement) {
        linkElement.click();
        scrapedUrls.add(targetUrl);
        await sleep(2000); // Increased delay

        const businessData = extractBusinessData();

        if (businessData && businessData.name) {
          const normalizedName = businessData.name.trim().toLowerCase();

          if (!seenNames.has(normalizedName)) {
            seenNames.add(normalizedName);
            businesses.push(businessData);
            console.log(`✓ Scraped (${businesses.length}):`, businessData.name);
          } else {
            console.log(`⊘ Duplicate name skipped:`, businessData.name);
          }
        }
      }

      // Report live progress to the popup (best-effort; popup may be closed).
      reportProgress(i + 1, totalToScrape, businesses.length);
    } catch (error) {
      console.error(`Error scraping business ${i + 1}:`, error);
      continue;
    }
  }

  console.log(`Scraping complete. Total unique businesses: ${businesses.length}`);
  return businesses;
}

// Strip query string and fragment so the same place always has one canonical URL.
function cleanUrl(href) {
  return href.split('?')[0].split('#')[0];
}

// Collect unique, cleaned place URLs from the (already-scrolled) feed, in order.
function collectUniqueUrls() {
  const feed = document.querySelector('div[role="feed"]');
  if (!feed) return [];

  const uniqueUrls = [];
  const seenHrefs = new Set();

  for (const link of feed.querySelectorAll('a[href*="/maps/place/"]')) {
    const href = cleanUrl(link.href);
    if (!seenHrefs.has(href)) {
      seenHrefs.add(href);
      uniqueUrls.push(href);
    }
  }

  return uniqueUrls;
}

// Scroll the results feed until enough places are loaded or no more appear.
// Mirrors scraper.py's _scroll_results; the delays are deliberate rate-limiting.
async function scrollFeed(feed, maxResults) {
  let previousCount = 0;
  let noChangeCount = 0;

  while (true) {
    const count = feed.querySelectorAll('a[href*="/maps/place/"]').length;

    if (count >= maxResults) {
      console.log(`Loaded ${count} results (target ${maxResults})`);
      break;
    }

    if (count === previousCount) {
      noChangeCount++;
      if (noChangeCount >= 3) {
        console.log(`No more results loading. Total: ${count}`);
        break;
      }
    } else {
      noChangeCount = 0;
      reportProgress(0, maxResults, count, 'loading');
    }

    previousCount = count;
    feed.scrollTop = feed.scrollHeight;
    await sleep(1500);
  }
}

// Best-effort progress message to the popup. Wrapped in try/catch because the
// popup may be closed, which makes sendMessage throw "Receiving end does not exist".
function reportProgress(done, total, scraped, phase = 'scraping') {
  try {
    chrome.runtime.sendMessage({ action: 'progress', phase, done, total, scraped });
  } catch (e) {
    // No popup listening — ignore.
  }
}

function extractBusinessData() {
  const business = {
    name: '',
    phone: '',
    email: 'N/A (visit website)',
    website: '',
    address: '',
    category: '',
    rating: '',
    reviews: '',
    scraped_at: new Date().toLocaleString()
  };

  try {
    // Extract business name
    const nameElement = document.querySelector('h1.DUwDvf');
    if (nameElement) {
      business.name = nameElement.textContent.trim();
    }

    // Extract phone number
    const phoneButton = document.querySelector('button[data-item-id*="phone:tel:"]');
    if (phoneButton) {
      const dataItemId = phoneButton.getAttribute('data-item-id');
      const phoneMatch = dataItemId.match(/phone:tel:(.+?)(?:,|$)/);
      if (phoneMatch) {
        business.phone = phoneMatch[1].trim();
      }
    }

    // Alternative phone extraction
    if (!business.phone) {
      const phoneButtons = Array.from(document.querySelectorAll('button[aria-label*="Phone"]'));
      for (const btn of phoneButtons) {
        const ariaLabel = btn.getAttribute('aria-label');
        const phoneMatch = ariaLabel.match(/[\d\s\-\+\(\)]{10,}/);
        if (phoneMatch) {
          business.phone = phoneMatch[0].trim();
          break;
        }
      }
    }

    // Extract website
    const websiteLink = document.querySelector('a[data-item-id="authority"]');
    if (websiteLink) {
      business.website = websiteLink.href;
    }

    // Extract address
    const addressButton = document.querySelector('button[data-item-id="address"]');
    if (addressButton) {
      business.address = addressButton.textContent.trim();
    }

    // Extract rating
    const ratingElement = document.querySelector('span.ceNzKf');
    if (ratingElement) {
      business.rating = ratingElement.textContent.trim();
    }

    // Extract review count
    const reviewsElement = document.querySelector('span.RDApEe');
    if (reviewsElement) {
      const reviewText = reviewsElement.textContent.trim();
      const reviewMatch = reviewText.match(/\(([\d,]+)\)/);
      if (reviewMatch) {
        business.reviews = reviewMatch[1];
      }
    }

    // Extract category
    const categoryButton = document.querySelector('button.DkEaL');
    if (categoryButton) {
      business.category = categoryButton.textContent.trim();
    }

  } catch (error) {
    console.error('Error extracting business data:', error);
  }

  return business;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Initialize
console.log('Google Maps Lead Scraper content script loaded');
