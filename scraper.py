#!/usr/bin/env python3
"""
Google Maps Business Scraper
Extracts business information for lead generation
"""

import asyncio
import re
import time
from typing import List, Dict, Optional
from playwright.async_api import async_playwright, Page
import pandas as pd
from datetime import datetime


class GoogleMapsScraper:
    def __init__(self, headless: bool = False):
        self.headless = headless
        self.results = []

    async def search_google_maps(self, query: str, max_results: int = 50) -> List[Dict]:
        """
        Search Google Maps and extract business information

        Args:
            query: Search query (e.g., "restaurants in New York")
            max_results: Maximum number of results to scrape

        Returns:
            List of business dictionaries
        """
        async with async_playwright() as p:
            # Launch browser
            browser = await p.chromium.launch(headless=self.headless)
            context = await browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            )
            page = await context.new_page()

            try:
                # Navigate to Google Maps
                print(f"Searching for: {query}")
                await page.goto("https://www.google.com/maps", wait_until="networkidle")

                # Search for the query
                search_box = page.locator('input#searchboxinput')
                await search_box.fill(query)
                await search_box.press('Enter')

                # Wait for results to load
                await page.wait_for_timeout(3000)

                # Scroll and collect results
                await self._scroll_results(page, max_results)

                # Extract business information
                businesses = await self._extract_businesses(page, max_results)

                print(f"Found {len(businesses)} businesses")
                self.results = businesses

            except Exception as e:
                print(f"Error during scraping: {e}")
            finally:
                await browser.close()

        return self.results

    async def _scroll_results(self, page: Page, max_results: int):
        """Scroll the results panel to load more businesses"""
        print("Scrolling to load results...")

        # Find the scrollable results container
        results_selector = 'div[role="feed"]'

        try:
            await page.wait_for_selector(results_selector, timeout=10000)

            previous_count = 0
            no_change_count = 0

            while True:
                # Scroll the results panel
                await page.evaluate(f'''
                    const feed = document.querySelector('{results_selector}');
                    if (feed) feed.scrollTop = feed.scrollHeight;
                ''')

                await page.wait_for_timeout(2000)

                # Count current results
                current_results = await page.locator('div[role="feed"] > div > div > a').count()

                if current_results >= max_results:
                    print(f"Reached target of {max_results} results")
                    break

                if current_results == previous_count:
                    no_change_count += 1
                    if no_change_count >= 3:
                        print(f"No more results found. Total: {current_results}")
                        break
                else:
                    no_change_count = 0

                previous_count = current_results
                print(f"Loaded {current_results} results...")

        except Exception as e:
            print(f"Error scrolling results: {e}")

    async def _extract_businesses(self, page: Page, max_results: int) -> List[Dict]:
        """Extract business information from the results"""
        businesses = []

        # Get all business links
        business_links = await page.locator('div[role="feed"] > div > div > a').all()

        total_to_process = min(len(business_links), max_results)
        print(f"Extracting information from {total_to_process} businesses...")

        for idx, link in enumerate(business_links[:total_to_process]):
            try:
                print(f"Processing business {idx + 1}/{total_to_process}...")

                # Click on the business
                await link.click()
                await page.wait_for_timeout(2000)

                # Extract business details
                business_data = await self._extract_business_details(page)

                if business_data:
                    businesses.append(business_data)
                    print(f"  ✓ Extracted: {business_data.get('name', 'Unknown')}")

                # Small delay to avoid rate limiting
                await page.wait_for_timeout(1000)

            except Exception as e:
                print(f"  ✗ Error extracting business {idx + 1}: {e}")
                continue

        return businesses

    async def _extract_business_details(self, page: Page) -> Optional[Dict]:
        """Extract detailed information from a business page"""
        try:
            business = {
                'name': '',
                'phone': '',
                'email': '',
                'address': '',
                'website': '',
                'rating': '',
                'reviews_count': '',
                'category': '',
                'scraped_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }

            # Extract business name
            try:
                name_elem = page.locator('h1.DUwDvf')
                business['name'] = await name_elem.inner_text(timeout=5000)
            except:
                pass

            # Extract phone number
            try:
                phone_button = page.locator('button[data-item-id*="phone"]')
                phone_text = await phone_button.get_attribute('data-item-id', timeout=5000)
                if phone_text:
                    phone_match = re.search(r'phone:tel:([\d\s\-\+\(\)]+)', phone_text)
                    if phone_match:
                        business['phone'] = phone_match.group(1).strip()
            except:
                # Alternative method
                try:
                    phone_elem = page.locator('button[data-tooltip="Copy phone number"]')
                    business['phone'] = await phone_elem.inner_text(timeout=3000)
                except:
                    pass

            # Extract address
            try:
                address_button = page.locator('button[data-item-id="address"]')
                business['address'] = await address_button.inner_text(timeout=5000)
            except:
                pass

            # Extract website
            try:
                website_link = page.locator('a[data-item-id="authority"]')
                website_href = await website_link.get_attribute('href', timeout=5000)
                if website_href:
                    business['website'] = website_href
            except:
                pass

            # Extract rating
            try:
                rating_elem = page.locator('span.ceNzKf')
                rating_text = await rating_elem.inner_text(timeout=3000)
                business['rating'] = rating_text.strip()
            except:
                pass

            # Extract reviews count
            try:
                reviews_elem = page.locator('span.RDApEe')
                reviews_text = await reviews_elem.inner_text(timeout=3000)
                # Extract number from "(1,234)"
                reviews_match = re.search(r'\(([\d,]+)\)', reviews_text)
                if reviews_match:
                    business['reviews_count'] = reviews_match.group(1)
            except:
                pass

            # Extract category
            try:
                category_button = page.locator('button.DkEaL')
                business['category'] = await category_button.inner_text(timeout=3000)
            except:
                pass

            # Email extraction (rarely available on Google Maps)
            # Would need to visit the website to find email
            business['email'] = 'N/A (visit website)'

            return business if business['name'] else None

        except Exception as e:
            print(f"    Error extracting details: {e}")
            return None

    def save_to_excel(self, filename: str = None):
        """Save results to Excel file"""
        if not self.results:
            print("No results to save")
            return

        if filename is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'google_maps_leads_{timestamp}.xlsx'

        # Create DataFrame
        df = pd.DataFrame(self.results)

        # Reorder columns
        column_order = ['name', 'phone', 'email', 'website', 'address',
                       'category', 'rating', 'reviews_count', 'scraped_at']
        df = df[column_order]

        # Save to Excel
        df.to_excel(filename, index=False, engine='openpyxl')
        print(f"\n✓ Data saved to: {filename}")
        print(f"Total records: {len(self.results)}")


async def main():
    """Main function to run the scraper"""
    print("=" * 60)
    print("Google Maps Business Scraper")
    print("For Lead Generation - Web Development Services")
    print("=" * 60)
    print()

    # Get search query from user
    query = input("Enter search query (e.g., 'restaurants in New York'): ").strip()

    if not query:
        print("Error: Please provide a search query")
        return

    # Get max results
    try:
        max_results_input = input("Maximum results to scrape (default 50): ").strip()
        max_results = int(max_results_input) if max_results_input else 50
    except ValueError:
        max_results = 50

    # Ask if user wants to see browser
    show_browser = input("Show browser while scraping? (y/n, default n): ").strip().lower()
    headless = show_browser != 'y'

    print()
    print("Starting scraper...")
    print()

    # Create scraper and run
    scraper = GoogleMapsScraper(headless=headless)

    try:
        results = await scraper.search_google_maps(query, max_results)

        if results:
            # Save to Excel
            scraper.save_to_excel()

            # Print summary
            print("\n" + "=" * 60)
            print("SUMMARY")
            print("=" * 60)
            print(f"Total businesses scraped: {len(results)}")
            print(f"Businesses with phone numbers: {sum(1 for r in results if r['phone'])}")
            print(f"Businesses with websites: {sum(1 for r in results if r['website'])}")
            print(f"Businesses with addresses: {sum(1 for r in results if r['address'])}")
        else:
            print("\nNo results found. Please try a different search query.")

    except Exception as e:
        print(f"\nError during scraping: {e}")


if __name__ == "__main__":
    asyncio.run(main())
