# 🗺️ Google Maps Lead Scraper - Browser Extension

Extract business leads from Google Maps directly in your Brave browser. Perfect for cold calling, web development outreach, and lead generation.

## ✨ Features

- **One-Click Scraping** - Extract business data while browsing Google Maps
- **Comprehensive Data** - Name, phone, email, website, address, rating, reviews, category
- **Google Sheet Export** - Push results straight into an online Google Sheet you can view & share
- **Excel Export** - Or download results as a local `.xlsx` spreadsheet (fallback)
- **Auto-Scroll** - Loads results for you up to your chosen max
- **Live Progress** - See the count climb as it scrapes; data is saved if you close the popup
- **Fast & Efficient** - Scrapes up to 500 businesses in minutes

## 📋 What Gets Extracted

| Field | Description |
|-------|-------------|
| Name | Business name |
| Phone | Phone number |
| Email | Usually N/A (visit website to find) |
| Website | Business website URL |
| Address | Full street address |
| Category | Business type (restaurant, dentist, etc.) |
| Rating | Google Maps star rating |
| Reviews | Number of reviews |
| Scraped At | When the row was scraped |

## 📤 Sending Results to a Google Sheet

The extension can push your leads into an **online Google Sheet** that you own and can share.
This uses a small Google Apps Script "web app" — no Google Cloud project or sign-in
configuration required, and it works in Brave.

### One-time setup

1. Go to [sheets.google.com](https://sheets.google.com) and create a new blank spreadsheet.
2. In that sheet, open **Extensions → Apps Script** and delete any sample code.
3. Copy the contents of [`extension/apps_script.gs`](extension/apps_script.gs) into the editor and **Save**.
4. *(Optional)* set a `SECRET` value at the top of the script, and paste the same value into the
   extension's **Secret** box.
5. Click **Deploy → New deployment**:
   - Type (gear icon) → **Web app**
   - **Execute as:** Me
   - **Who has access:** Anyone with the link
   - Click **Deploy**, then authorize access.
6. Copy the **Web app URL** (it ends in `/exec`).

### Using it

1. Open the extension popup and expand **Google Sheet setup**.
2. Paste the `/exec` URL (and Secret, if you set one). It's saved for next time.
3. Scrape as usual, then click **Send to Google Sheet** — a new tab opens your sheet with the rows.

> ⚠️ **Privacy note:** Unlike the local Excel export, sending to a Google Sheet uploads your
> scraped leads to your Google account. The data goes to *your* sheet, but it does leave the browser.

## 🚀 Installation (Brave Browser)

### Step 1: Download the Extension

Download or clone this repository to your computer:
```bash
git clone https://github.com/yourusername/webscraper.git
cd WebScraper/extension
```

Or download the ZIP and extract it.

### Step 2: Enable Developer Mode

1. Open Brave browser
2. Go to `brave://extensions/`
3. Toggle **"Developer mode"** (top right corner)

### Step 3: Load the Extension

1. Click **"Load unpacked"** button
2. Navigate to the `extension` folder
3. Click **"Select Folder"**

### Step 4: Verify Installation

- You should see "Google Maps Lead Scraper" in your extensions
- A purple map icon should appear in your toolbar

## 📖 How to Use

### Basic Usage

1. **Go to Google Maps**
   - Open [google.com/maps](https://www.google.com/maps)

2. **Search for businesses**
   - Example: "restaurants in New York"
   - Example: "dentists in Los Angeles"
   - Example: "real estate agents in Miami"

3. **Scroll to load results**
   - Scroll down in the results panel (left side)
   - Load as many businesses as you want to scrape
   - Tip: Scroll slowly to let Google load results

4. **Click the extension icon**
   - Purple map icon in your browser toolbar
   - Extension popup will open

5. **Set max results**
   - Default: 50 businesses
   - Range: 1-500
   - Higher numbers take longer

6. **Click "Start Scraping"**
   - Extension will click through each business
   - You'll see progress in the popup
   - Don't close the tab while scraping!

7. **Export your leads**
   - Click **"Send to Google Sheet"** to push them online (see setup above), or
   - Click **"Download Excel"** to save a local `google_maps_leads_TIMESTAMP.xlsx`

### Example Workflow

```
Search: "coffee shops in Manhattan"
↓
Scroll results panel to load 30 businesses
↓
Open extension popup
↓
Set max results: 30
↓
Click "Start Scraping"
↓
Wait 45 seconds (~1.5s per business)
↓
Click "Download Excel"
↓
Open in Excel/Google Sheets
```

## 💡 Tips for Best Results

### Search Queries

✅ **Good queries:**
- "restaurants in Brooklyn"
- "dentists near Central Park"
- "plumbers in Queens NY"
- "gyms in Manhattan"

❌ **Avoid:**
- Too broad: "restaurants" (millions of results)
- Too narrow: "vegan gluten-free restaurant on 5th street" (1-2 results)

### Scraping Strategy

1. **Scroll first, scrape later** - Load all results before scraping
2. **Start small** - Test with 10-20 businesses first
3. **Don't rush** - The built-in delays prevent rate limiting
4. **Stay on tab** - Don't switch tabs during scraping
5. **Filter later** - Scrape everything, filter in Excel

### Cold Calling Workflow

1. **Target no-website businesses**
   - Filter Excel: Website column = empty
   - These businesses need your services!

2. **Check ratings**
   - Focus on 3.5+ stars, 20+ reviews
   - Established businesses are better prospects

3. **Prepare your pitch**
   - "I noticed you don't have a website..."
   - "Your competitors online are getting X% more customers..."

4. **Track your calls**
   - Add columns: "Called", "Status", "Follow-up Date"

## 🔧 Troubleshooting

### "Please open Google Maps first"

**Problem:** Extension only works on Google Maps  
**Solution:** Navigate to google.com/maps before opening extension

### "No businesses found"

**Problem:** No search results loaded  
**Solutions:**
- Make sure you've searched for something
- Scroll down to load results
- Try a different search query

### Scraping Stops or Freezes

**Problem:** Browser might be rate limiting  
**Solutions:**
- Reduce max results (try 20-30 instead of 100)
- Wait a few minutes, then try again
- Restart browser

### Missing Phone Numbers

**Problem:** Not all businesses list phone numbers  
**Why:** Some businesses don't add phone to Google Maps  
**Solution:** Visit their website (also good for finding emails)

### No Excel Download

**Problem:** Export button not working  
**Solutions:**
- Check if popup blocker is enabled (disable it)
- Make sure you have scraped data first
- Try clicking "Start Scraping" again

### Extension Not Loading

**Problem:** Extension won't install  
**Solutions:**
- Make sure you selected the `extension` folder, not the parent folder
- Check that `manifest.json` is in the selected folder
- Try removing and re-adding the extension

### Google Maps Changed Layout

**Problem:** Scraping fails with errors  
**Why:** Google sometimes updates their website  
**Solution:** The extension may need updates to handle new layout

## 🎯 Use Cases

### Web Development Agency
- Find local businesses without websites
- Cold call to offer web design services
- Target specific niches (restaurants, salons, etc.)

### Marketing Agency
- Build prospect lists for SEO/PPC services
- Find businesses with low ratings (offer reputation management)
- Export competitor lists for clients

### Real Estate
- Find agents in specific areas
- Build contact lists for networking
- Research market competition

### General Lead Generation
- Any B2B service targeting local businesses
- Market research and competitor analysis
- Building contact databases

## ⚠️ Legal & Ethical Notes

**Important Disclaimers:**

1. **Terms of Service**
   - Web scraping may violate Google's Terms of Service
   - Use at your own risk
   - We are not responsible for any consequences

2. **Rate Limiting**
   - Extension includes delays to be respectful
   - Do NOT modify code to scrape faster
   - Excessive scraping may result in IP bans

3. **Data Privacy**
   - Handle scraped data responsibly
   - Comply with GDPR, CCPA, and local privacy laws
   - Only use data for legitimate business purposes

4. **Cold Calling Laws**
   - Check local telemarketing regulations
   - Respect "Do Not Call" lists
   - Follow CAN-SPAM Act for emails

5. **Fair Use**
   - Don't scrape for reselling data
   - Don't create competing directories
   - Use for your own business development only

## 🛠️ Technical Details

- **Built with:** Vanilla JavaScript, Chrome Extensions API
- **Works on:** Brave, Chrome, Edge (Chromium-based browsers)
- **Manifest:** Version 3
- **Storage:** All data in-browser, nothing stored on servers
- **Export:** Uses SheetJS (xlsx library) for Excel generation

## 📁 File Structure

```
extension/
├── manifest.json          # Extension configuration
├── popup.html            # Extension popup UI
├── popup.js              # Popup logic & Excel export
├── content.js            # Google Maps scraper
├── styles.css            # Popup styling
├── apps_script.gs        # Google Apps Script web app (paste into Google Sheets)
└── icons/
    ├── icon16.png        # Toolbar icon
    ├── icon48.png        # Extension manager icon
    └── icon128.png       # Chrome Web Store icon
```

## 🔄 Updates

To update the extension:

1. Download/pull the latest code
2. Go to `brave://extensions/`
3. Click the refresh icon on the extension card

## 🐛 Known Limitations

- Emails are rarely available on Google Maps (need to visit websites)
- Max ~500 results per scrape (Google Maps limitation)
- Requires manual scrolling to load all results
- Scraping speed limited to ~1.5s per business (by design)

## 📝 Changelog

### Version 1.0.0 (2026-06-09)
- Initial release
- Basic scraping functionality
- Excel export
- Support for 500+ businesses


## 🤝 Support

For issues or questions:
- Check troubleshooting section above
- Review Google Maps layout (might have changed)
- Ensure you're on google.com/maps (not other map services)

## 📄 License

MIT License - Use at your own risk

---

**Disclaimer:** This tool is for educational purposes and legitimate business development. Always respect website terms of service and local regulations regarding web scraping, data collection, and cold calling.
