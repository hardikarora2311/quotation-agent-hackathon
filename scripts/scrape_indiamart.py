import requests
from bs4 import BeautifulSoup
import csv
import time
import json
import sys

def get_top_results(product, location):
    """Scrape the top 5 product listings from the search results page, including image URLs."""
    url = f"https://dir.indiamart.com/search.mp?ss={product}&cq={location}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.indiamart.com/"
    }

    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.text, "html.parser")
    results = []

    listings = soup.find_all("div", class_="prd-card") or soup.find_all("div", class_="card")
    listings = listings[:5] if listings else []

    for listing in listings:
        try:
            result_id = listing.get("id", "N/A")

            item_name_tag = (
                listing.find("h3", class_="prd-title") or 
                listing.find("div", class_="producttitle") or
                listing.find("h4", class_="prd-name") or
                listing.select_one(".prd-name")
            )
            item_name = item_name_tag.get_text(strip=True) if item_name_tag else "N/A"

            price_section = (
                listing.find("p", class_="price") or 
                listing.find("span", class_="prc") or
                listing.select_one(".price-sec")
            )
            
            if price_section:
                price_text = price_section.text.replace("₹", "").strip()
                price_parts = price_text.split("/")
                item_price = price_parts[0].strip()
                item_unit = price_parts[1].strip() if len(price_parts) > 1 else "N/A"
            else:
                item_price, item_unit = "N/A", "N/A"

            link_tag = (
                listing.find("a", class_="cardlinks") or 
                listing.find("a", class_="prd-link") or
                listing.select_one("a[href]")
            )
            item_url = link_tag["href"] if link_tag and "href" in link_tag.attrs else "N/A"

            supplier_tag = (
                listing.find("div", class_="companyname") or 
                listing.find("p", class_="sup-name") or
                listing.select_one(".company-name")
            )
            supplier_name = supplier_tag.get_text(strip=True) if supplier_tag else "N/A"

            supplier_gst = get_supplier_gst(item_url) if item_url != "N/A" else "N/A"

            # Extract product image source
            image_tag = listing.find("img", class_="productimg")
            image_src = image_tag["src"] if image_tag and "src" in image_tag.attrs else "N/A"

            results.append({
                "id": result_id,
                "name": supplier_name,
                "gstNumber": supplier_gst,
                "products": [item_name],
                "price": item_price,
                "unit": item_unit,
                "url": item_url,
                "image": image_src,  # New field for product image
                "contactDetails": {}
            })

            time.sleep(2)

        except Exception as e:
            print(f"Error processing listing: {e}", file=sys.stderr)
            continue

    return results


def get_supplier_gst(item_url):
    """Scrape the supplier's GST number from the product page."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9"
        }
        
        response = requests.get(item_url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, "html.parser")

        # New method: Look for GST in the new HTML structure
        gst_divs = soup.find_all("div", class_="lh21 pdinb wid3 mb20 verT")
        for div in gst_divs:
            spans = div.find_all("span")
            if len(spans) >= 2 and spans[0].get_text(strip=True) == "GST":
                return spans[1].get_text(strip=True)

        # Fallback: Try previous methods
        # Method 1: Find by class
        gst_section = soup.find("span", class_="fs11 color1")
        if gst_section:
            return gst_section.get_text(strip=True)
        
        # Method 2: Find by text content containing "GST"
        gst_elements = soup.find_all(string=lambda text: text and "GST" in text)
        for element in gst_elements:
            parent = element.parent
            if parent:
                gst_text = parent.get_text(strip=True)
                if "GST" in gst_text and len(gst_text) < 100:  # Reasonable length for GST info
                    return gst_text
        
        # Method 3: Look for GST format (15 chars alphanumeric)
        import re
        text = soup.get_text()
        gst_match = re.search(r'\b[0-9A-Z]{15}\b', text)
        if gst_match:
            return gst_match.group(0)
        
        return "N/A"
    except Exception as e:
        print(f"Error fetching GST from {item_url}: {e}", file=sys.stderr)
        return "N/A"
    """Scrape the supplier's GST number from the product page."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9"
        }
        
        response = requests.get(item_url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Try multiple ways to find GST information
        gst_section = None
        
        # Method 1: Find by class
        gst_section = soup.find("span", class_="fs11 color1")
        
        # Method 2: Find by text content containing "GST"
        if not gst_section:
            gst_elements = soup.find_all(string=lambda text: text and "GST" in text)
            for element in gst_elements:
                parent = element.parent
                if parent:
                    gst_text = parent.get_text(strip=True)
                    if "GST" in gst_text and len(gst_text) < 100:  # Reasonable length for GST info
                        gst_section = parent
                        break
        
        # Method 3: Look for GST format (15 chars alphanumeric)
        if not gst_section:
            import re
            text = soup.get_text()
            gst_match = re.search(r'\b[0-9A-Z]{15}\b', text)
            if gst_match:
                return gst_match.group(0)
        
        return gst_section.get_text(strip=True) if gst_section else "N/A"
    except Exception as e:
        print(f"Error fetching GST from {item_url}: {e}", file=sys.stderr)
        return "N/A"

def save_to_csv(data, filename="indiamart_results.csv"):
    """Save the scraped data to a CSV file."""
    if not data:
        print("No data to save to CSV", file=sys.stderr)
        return
    
    try:
        keys = data[0].keys()
        with open(filename, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=keys)
            writer.writeheader()
            writer.writerows(data)
        print(f"Data saved to {filename}", file=sys.stderr)
    except Exception as e:
        print(f"Error saving CSV: {e}", file=sys.stderr)

if __name__ == "__main__":
    try:
        # Get product and location from command line arguments
        if len(sys.argv) >= 3:
            product = sys.argv[1]
            location = sys.argv[2]
        else:
            # Default values if no arguments provided
            product = "figs"
            location = "delhi"
        
        # Scrape the data
        scraped_data = get_top_results(product, location)
        
        # Output JSON to stdout (for Node.js)
        print(json.dumps(scraped_data))
        
        # Also save to CSV (for convenience)
        save_to_csv(scraped_data)
    except Exception as e:
        print(f"Script error: {e}", file=sys.stderr)
        # Output empty array on error so Node doesn't crash
        print("[]")