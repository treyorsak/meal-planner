"""
Scrapes letmeplandinner.blogspot.com for recipes published in 2010, 2011, 2012.
Uses the Blogger JSON feed API — no authentication required.

Output: data/blogspot_recipes.json
Run from the meal-planner/ directory:
    python scripts/scrape_blogspot.py
"""

import json
import re
import time
import urllib.request
import urllib.parse
from html.parser import HTMLParser
from pathlib import Path

FEED_BASE = (
    "https://letmeplandinner.blogspot.com/feeds/posts/default"
    "?alt=json"
    "&published-min=2010-01-01T00:00:00"
    "&published-max=2013-01-01T00:00:00"
    "&max-results=50"
    "&start-index={start}"
)

INGREDIENT_LINE_RE = re.compile(
    r"^(\d[\d/\s]*\s*)?(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons"
    r"|lb|lbs|pound|pounds|oz|ounce|ounces|g|gram|grams|kg|can|cans|pkg|package"
    r"|bunch|clove|cloves|slice|slices|pinch|dash|jar|bottle|stick|sticks"
    r"|head|heads|sprig|sprigs)\b",
    re.IGNORECASE,
)
QUANTITY_START_RE = re.compile(r"^\d[\d./\s]*")
INSTRUCTION_RE = re.compile(r"[.?!]$|^(preheat|mix|stir|bake|cook|add|combine|place"
                             r"|pour|heat|remove|let|serve|season|bring|reduce|whisk"
                             r"|spread|top|cut|chop|dice|slice|drain|rinse|melt|fry"
                             r"|boil|simmer|roast|grill|toss|fold|beat|cream|knead"
                             r"|roll|shape|cover|refrigerate|freeze|thaw|marinate)\b",
                             re.IGNORECASE)


class HTMLStripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self.reset()
        self.parts = []
        self.in_br = False

    def handle_starttag(self, tag, attrs):
        if tag == "br":
            self.parts.append("\n")

    def handle_data(self, data):
        self.parts.append(data)

    def get_text(self):
        return "".join(self.parts)


def strip_html(html: str) -> str:
    s = HTMLStripper()
    s.feed(html)
    return s.get_text()


def is_ingredient_line(line: str) -> bool:
    line = line.strip()
    if not line or len(line) > 120:
        return False
    if INSTRUCTION_RE.search(line) and len(line) > 50:
        return False
    if INGREDIENT_LINE_RE.match(line):
        return True
    if QUANTITY_START_RE.match(line):
        return True
    return False


def parse_ingredients(html_content: str) -> list[str]:
    text = strip_html(html_content)
    lines = [l.strip() for l in text.splitlines()]
    ingredients = []
    found_any = False
    # Collect consecutive ingredient-like lines; stop on first long instruction block
    for line in lines:
        if not line:
            continue
        if is_ingredient_line(line):
            ingredients.append(line)
            found_any = True
        elif found_any and len(ingredients) >= 3:
            # Stop collecting once we hit non-ingredient content after a block
            break
    return ingredients


def fetch_feed(start: int) -> dict:
    url = FEED_BASE.format(start=start)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode("utf-8"))


def get_alternate_link(links: list) -> str:
    for link in links:
        if link.get("rel") == "alternate":
            return link.get("href", "")
    return ""


def parse_entry(entry: dict) -> dict | None:
    title = entry.get("title", {}).get("$t", "").strip()
    if not title:
        return None
    url = get_alternate_link(entry.get("link", []))
    published = entry.get("published", {}).get("$t", "")
    content_html = entry.get("content", {}).get("$t", "")
    ingredients = parse_ingredients(content_html)
    # Skip posts with no ingredient-like content (announcements, etc.)
    if len(ingredients) < 2:
        return None
    post_id = entry.get("id", {}).get("$t", url)
    return {
        "id": re.sub(r"[^a-z0-9]", "-", title.lower())[:60],
        "title": title,
        "url": url,
        "published": published[:10],
        "source": "blogspot",
        "servings": 4,
        "ingredients": ingredients,
    }


def main():
    recipes = []
    seen_ids: set[str] = set()
    start = 1
    total_fetched = 0

    print("Fetching blogspot recipes (2010–2012)...")
    while True:
        try:
            data = fetch_feed(start)
        except Exception as e:
            print(f"  Error at start={start}: {e}")
            break

        feed = data.get("feed", {})
        entries = feed.get("entry", [])
        if not entries:
            break

        for entry in entries:
            recipe = parse_entry(entry)
            if recipe and recipe["id"] not in seen_ids:
                seen_ids.add(recipe["id"])
                recipes.append(recipe)

        total_fetched += len(entries)
        print(f"  Fetched {total_fetched} posts, {len(recipes)} valid recipes so far...")

        # Check if more pages exist
        links = feed.get("link", [])
        has_next = any(l.get("rel") == "next" for l in links)
        if not has_next:
            break

        start += 50
        time.sleep(0.5)

    out_path = Path("data/blogspot_recipes.json")
    out_path.parent.mkdir(exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(recipes, f, indent=2, ensure_ascii=False)

    print(f"\nDone. {len(recipes)} recipes saved to {out_path}")


if __name__ == "__main__":
    main()
