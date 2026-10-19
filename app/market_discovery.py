"""Daily public-source market discovery; no private scraping or fabricated metrics."""
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen
from xml.etree import ElementTree

QUERIES = [
    "Nha Trang tours excursions travel operators",
    "Nha Trang Vietnam activities booking platforms",
    "Cam Ranh Dalat Phan Rang tours marketplace",
    "Нячанг экскурсии туристические агентства",
    "나트랑 투어 예약 플랫폼",
    "芽庄 旅游 一日游 预订 平台",
    "Nha Trang tur rezervasyon acenteleri",
]
MAX_ITEMS = 15


def fetch_feed(query):
    url = "https://news.google.com/rss/search?q=" + quote(query) + "&hl=en-US&gl=US&ceid=US:en"
    req = Request(url, headers={"User-Agent": "GetTravelMarketResearch/1.0"})
    with urlopen(req, timeout=18) as response:
        data = response.read(2_000_000)
    root = ElementTree.fromstring(data)
    items = []
    for node in root.findall("./channel/item")[:MAX_ITEMS]:
        title = node.findtext("title", "").strip()
        link = node.findtext("link", "").strip()
        if title and link.startswith("https://"):
            items.append({"title": title, "url": link, "published": node.findtext("pubDate", "")})
    return items


def run():
    observations, errors, seen = [], [], set()
    for query in QUERIES:
        try:
            for item in fetch_feed(query):
                if item["url"] not in seen:
                    seen.add(item["url"])
                    observations.append({"query": query, **item})
        except Exception as exc:
            errors.append({"query": query, "error_type": type(exc).__name__})
    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "Google News public RSS (news discovery, not verified competitor or traffic data)",
        "status": "ok" if not errors else "partial" if observations else "unavailable",
        "observations": observations,
        "errors": errors,
        "disclaimer": "Candidates require human/official-source verification; no sales, traffic or registration claims.",
    }
    target = Path(os.getenv("MARKET_REPORT_PATH", "reports/latest.json"))
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Market discovery: {len(observations)} results, {len(errors)} source errors; report {target}")
    return output


if __name__ == "__main__":
    run()
