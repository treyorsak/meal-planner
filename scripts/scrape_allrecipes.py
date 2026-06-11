"""
Scrapes top-rated dinner recipes from allrecipes.com.
Uses requests + BeautifulSoup. Falls back to Playwright if blocked.

Output: data/allrecipes_recipes.json
Run from the meal-planner/ directory:
    pip install requests beautifulsoup4
    python scripts/scrape_allrecipes.py
"""

import json
import re
import time
import sys
from pathlib import Path

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Install dependencies: pip install requests beautifulsoup4")
    sys.exit(1)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# Pages that yield recipe links — mix of category + search pages
CATEGORY_URLS = [
    "https://www.allrecipes.com/search?q=dinner&sort=top-rated",
    "https://www.allrecipes.com/search?q=chicken+dinner&sort=top-rated",
    "https://www.allrecipes.com/search?q=beef+dinner&sort=top-rated",
    "https://www.allrecipes.com/search?q=pork+dinner&sort=top-rated",
    "https://www.allrecipes.com/search?q=pasta+dinner&sort=top-rated",
    "https://www.allrecipes.com/search?q=casserole+dinner&sort=top-rated",
    "https://www.allrecipes.com/recipes/17562/dinner/?sort=top-rated",
    "https://www.allrecipes.com/recipes/80/main-dish/",
]

TARGET_COUNT = 60
BLOCK_THRESHOLD = 0.4  # switch to playwright if >40% requests fail


def fetch_html(url: str, session: requests.Session) -> str | None:
    try:
        resp = session.get(url, headers=HEADERS, timeout=15)
        if resp.status_code == 200:
            return resp.text
        return None
    except Exception:
        return None


def extract_recipe_links(html: str, base_url: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    links = set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if re.search(r"/recipe/\d+/", href):
            if href.startswith("http"):
                links.add(href.split("?")[0])
            elif href.startswith("/"):
                links.add("https://www.allrecipes.com" + href.split("?")[0])
    return list(links)


def parse_servings(soup: BeautifulSoup) -> int:
    for tag in soup.find_all(["span", "div"], class_=re.compile(r"servings|yield", re.I)):
        text = tag.get_text()
        m = re.search(r"(\d+)", text)
        if m:
            return int(m.group(1))
    # Try structured data
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            if isinstance(data, list):
                data = data[0]
            yield_val = data.get("recipeYield", "")
            m = re.search(r"(\d+)", str(yield_val))
            if m:
                return int(m.group(1))
        except Exception:
            pass
    return 4


def parse_ingredients(soup: BeautifulSoup) -> list[str]:
    # Try structured data first (most reliable)
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            if isinstance(data, list):
                data = data[0]
            ingredients = data.get("recipeIngredient", [])
            if ingredients:
                return [i.strip() for i in ingredients if i.strip()]
        except Exception:
            pass
    # Fall back to HTML
    items = []
    for li in soup.find_all("li", class_=re.compile(r"ingredient", re.I)):
        text = li.get_text(separator=" ", strip=True)
        if text:
            items.append(text)
    return items


def parse_recipe_page(url: str, html: str) -> dict | None:
    soup = BeautifulSoup(html, "html.parser")

    # Title
    title_tag = soup.find("h1")
    if not title_tag:
        return None
    title = title_tag.get_text(strip=True)
    if not title:
        return None

    ingredients = parse_ingredients(soup)
    if len(ingredients) < 3:
        return None

    servings = parse_servings(soup)
    slug = re.sub(r"[^a-z0-9]", "-", title.lower())[:60]

    return {
        "id": f"ar-{slug}",
        "title": title,
        "url": url,
        "source": "allrecipes",
        "servings": servings,
        "ingredients": ingredients,
    }


def fetch_with_playwright(url: str) -> str | None:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("Install playwright: pip install playwright && playwright install chromium")
        return None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(url, timeout=20000)
            page.wait_for_load_state("networkidle", timeout=15000)
            html = page.content()
            browser.close()
            return html
    except Exception as e:
        print(f"  Playwright error: {e}")
        return None


def main():
    session = requests.Session()
    recipe_urls: list[str] = []
    seen_urls: set[str] = set()

    print("Collecting recipe URLs from category pages...")
    for cat_url in CATEGORY_URLS:
        html = fetch_html(cat_url, session)
        if html:
            links = extract_recipe_links(html, cat_url)
            for link in links:
                if link not in seen_urls:
                    seen_urls.add(link)
                    recipe_urls.append(link)
            print(f"  {cat_url} -> {len(links)} links")
        time.sleep(1)

    print(f"\nFound {len(recipe_urls)} unique recipe URLs. Scraping up to {TARGET_COUNT}...")

    recipes = []
    failures = 0
    attempts = 0
    use_playwright = False

    for url in recipe_urls[:TARGET_COUNT * 2]:
        if len(recipes) >= TARGET_COUNT:
            break

        attempts += 1
        if use_playwright:
            html = fetch_with_playwright(url)
        else:
            html = fetch_html(url, session)
            if html is None:
                failures += 1
                if attempts >= 5 and failures / attempts > BLOCK_THRESHOLD:
                    print("  Too many failures — switching to Playwright...")
                    use_playwright = True

        if html:
            recipe = parse_recipe_page(url, html)
            if recipe:
                recipes.append(recipe)
                print(f"  [{len(recipes):2d}] {recipe['title']} ({recipe['servings']} servings)")
        else:
            print(f"  Skipped (blocked/error): {url}")

        time.sleep(1.5)

    out_path = Path("data/allrecipes_recipes.json")
    out_path.parent.mkdir(exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(recipes, f, indent=2, ensure_ascii=False)

    print(f"\nDone. {len(recipes)} recipes saved to {out_path}")


if __name__ == "__main__":
    main()
