#!/usr/bin/env python3
"""Refresh data/stores.json from the live refundgod.io region pages.

Usage:
  cd /app && python3 scripts/refresh-from-live.py

This pulls https://refundgod.io/{usa,canada,eu,uk}/ HTML, extracts the
store text, parses each store entry (separated by em/en dashes), and
emits a clean data/stores.json (preserving admin metadata like
`tags`, `prismaticGlow`, `logoUrl`, and stable `id` for stores that
already exist by normalized-name match).

After running:
  yarn seed -- --reset
"""
import json
import re
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup

REGION_URLS = {
    "USA": "https://refundgod.io/usa/",
    "CAD": "https://refundgod.io/canada/",
    "EU":  "https://refundgod.io/eu/",
    "UK":  "https://refundgod.io/uk/",
}

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "stores.json"


def fetch(url: str) -> str:
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", errors="ignore")


def extract_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for sel in ["script", "style", "nav", "header", "footer", "noscript", "form"]:
        for n in soup.select(sel):
            n.decompose()
    for cls in ["elementor-location-header", "elementor-location-footer", "site-header", "site-footer"]:
        for n in soup.select("." + cls):
            n.decompose()
    main = soup.find("main") or soup.find("article") or soup.body
    if not main:
        return ""
    text = main.get_text("\n", strip=False)
    lines = [l.rstrip() for l in text.splitlines()]
    out = []
    blank = 0
    for l in lines:
        if l.strip() == "":
            blank += 1
            if blank <= 1:
                out.append("")
        else:
            blank = 0
            out.append(l)

    # Coalesce per-letter span runs back into words (the live site styles
    # certain headings letter-by-letter, e.g. 'GOOGLESTORE').
    lines2 = "\n".join(out).split("\n")
    fixed = []
    i = 0
    while i < len(lines2):
        j = i
        run = []
        while j < len(lines2) and len(lines2[j].strip()) == 1 and lines2[j].strip().isalpha():
            run.append(lines2[j].strip())
            j += 1
        if len(run) >= 3:
            fixed.append("".join(run))
            i = j
        else:
            fixed.append(lines2[i])
            i += 1
    return "\n".join(fixed).strip()


SECTION_HEADINGS = [
    (re.compile(r"^\s*meal\s*plan", re.I),                              "Meal Plans"),
    (re.compile(r"^\s*electronics\b.*high.*resell", re.I),              "Electronics"),
    (re.compile(r"^\s*electronics?\s*[/&]\s*high.*resell", re.I),       "Electronics"),
    (re.compile(r"^\s*electronics\b", re.I),                            "Electronics"),
    (re.compile(r"^\s*high\s*resell\s*items", re.I),                    "Electronics"),
    (re.compile(r"^\s*sports?\s*[/&]\s*outdoor", re.I),                 "Other"),
    (re.compile(r"^\s*outdoor\s*[/&]\s*food", re.I),                    "Food"),
    (re.compile(r"^\s*home\s*goods", re.I),                             "Home"),
    (re.compile(r"^\s*home\s*[/&]\s*furniture", re.I),                  "Home"),
    (re.compile(r"^\s*furniture", re.I),                                "Home"),
    (re.compile(r"^\s*jewel(?:ry|ery|lery)", re.I),                     "Jewelry"),
    (re.compile(r"^\s*food\b", re.I),                                   "Food"),
    (re.compile(r"^\s*travel\b", re.I),                                 "Other"),
    (re.compile(r"^\s*clothing\s*[/&]\s*home", re.I),                   "Clothing"),
    (re.compile(r"^\s*clothing\b", re.I),                               "Clothing"),
    (re.compile(r"^\s*netherlands\s+clothing", re.I),                   "Clothing"),
    (re.compile(r"^\s*france\s+clothing", re.I),                        "Clothing"),
]

SKIP_PATTERNS = [
    re.compile(p, re.I) for p in [
        r"^\s*skip to content",
        r"^\s*back to (regions|home)",
        r"^\s*view rules",
        r"^\s*for information on how things work",
        r"^\s*store list (last )?updated",
        r"^\s*\*store list last updated",
        r"^\s*if ever there is a question received",
        r"^\s*usa\s+stores?\s+list\s*$",
        r"^\s*canada\s+stores?\s*$",
        r"^\s*eu\s+stores?\s+list\s*$",
        r"^\s*uk\s+stores?\s+list\s*$",
        r"^\s*stores\s+price\s+limits",
        r"^\s*stores\s*[-–—]\s*price\s+limits",
        r"^\s*\(click .* (rules|instructions)\)",
    ]
]


def is_separator(line: str) -> bool:
    s = line.strip()
    if not s:
        return False
    if re.match(r"^[—–\-=<>\s]+$", s) and any(c in s for c in ("\u2014", "\u2013", "-", "=")):
        return True
    return False


def is_section_heading(line: str):
    s = line.strip().rstrip(":").strip()
    if not s or len(s) > 60:
        return None
    for pat, cat in SECTION_HEADINGS:
        if pat.search(s):
            return cat
    return None


def is_skip(chunk: str) -> bool:
    first = chunk.strip().split("\n", 1)[0]
    for p in SKIP_PATTERNS:
        if p.match(first):
            return True
    if re.match(r"^\s*[\W_]+\s*$", chunk, re.UNICODE):
        return True
    if re.match(r"^\s*[A-Z]\s*$", chunk):
        return True
    return False


def slugify(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"[^A-Za-z0-9]+", "-", s).strip("-").lower()
    return s or "store"


def detect_domain(name: str, raw: str):
    m = re.search(r"\b([a-z0-9-]+(?:\.[a-z0-9-]+)+)\b", raw + " " + name, re.I)
    if m:
        d = m.group(1).lower()
        if "." not in d or d.replace(".", "").isdigit():
            return None
        return d
    return None


def parse_chunk(chunk: str, region: str, category: str, idx: int):
    raw = chunk.strip()
    if not raw or is_skip(raw):
        return None
    lines = [l for l in raw.split("\n") if l.strip() != ""]
    if not lines:
        return None

    header = lines[0].strip()
    if header.startswith("(") and header.endswith(")"):
        return None

    name = header
    detail_part = ""
    name_search_text = re.sub(r"^\s*[—–\-]+\s*", "", header)
    candidates = []
    for pat in (r"\s*[—–]\s*", r"\s+/\s+", r"\s*\|\s*", r"\s+[-]\s+", r"\s*[-–—]\s*\$"):
        m = re.search(pat, name_search_text)
        if m:
            candidates.append(m.start())
    if candidates:
        i = min(candidates)
        name = name_search_text[:i].strip(" -–—|/")
        detail_part = name_search_text[i:].lstrip(" -–—|/").strip()
    else:
        name = name_search_text.strip()

    name = re.sub(r"[:•\u2022\-–—]+\s*$", "", name).strip()
    name = re.sub(r"^[^\w]+", "", name).strip()
    name = re.sub(r"\s+", " ", name)

    if not name or len(name) < 2:
        return None

    nl = name.lower()
    bad_names = {
        "liquor allowed", "easily repeatable", "must not ask for otp",
        "do not turn on the devices until refund is generated",
        "no third party", "must be returnable", "must be returnable | no final sale items",
        "no item limit", "no limit", "instant", "1 meal kit",
        "mfg ↑", "mfg",
        "every domain different timeframe",
        "back to home", "back to regions",
        "high resell", "high-end mattresses",
        "apple items", "phones only",
        "stores",
    }
    if nl in bad_names:
        return None
    if re.match(r"^\d+\s*-?\s*items?(\s+limit)?\s*$", nl):
        return None
    if re.match(r"^\$?\d", nl) and len(name) < 12:
        return None
    if not re.search(r"[A-Za-z]{2,}", name):
        return None

    if nl == "googlestore":
        name = "Google Store"
    if nl == "paypal":
        name = "PayPal"

    rest_lines = lines[1:]
    rest = "\n".join(rest_lines).strip()
    detail_full = (detail_part + "\n" + rest).strip()

    price_re = re.compile(
        r"(?<![\w$])((?:NO\s*LIMIT(?:S)?)|(?:[$€£¥]\s?[\d,.kK]+(?:[\d]+)?)|(?:\d{1,3}(?:[,.]\d{3})*\s*[$€£])|(?:\d+\s?[kK]?\s?(?:USD|EUR|GBP|CAD|\$|€|£)))",
        re.I,
    )
    item_re = re.compile(
        r"(NO\s*ITEM\s*LIMIT|NO\s*LIMIT|MULTIPLE|UNLIMITED|\d+\s*(?:ITEMS?|TICKETS?|PHONES?|UNIQUE\s+ITEM|MEALS?|ARTICLES?|RING|WATCH|MATTRESS|BUNDLES?))",
        re.I,
    )
    fee_re = re.compile(r"(\d{1,2}(?:\.\d+)?\s*%)")
    time_re = re.compile(
        r"(INSTANT(?:S)?|24\s*HOURS?|72\s*HOURS?|24-?48\s*HOURS?|48-?72\s*HOURS?|few\s+(?:days|weeks)|(?:\d+\s*[-–]\s*\d+|\d+)\s*(?:days|weeks|months|hours|day|week|month|hour))",
        re.I,
    )

    pm = price_re.search(detail_full)
    price_limit = pm.group(1).strip() if pm else None
    if price_limit and price_limit.lower().startswith("no limit"):
        price_limit = "NO LIMIT"

    im = item_re.search(detail_full)
    if im:
        v = im.group(1).strip()
        if v.lower() in ("multiple", "unlimited") or v.lower().startswith("no"):
            item_limit = v.upper()
        else:
            item_limit = v
    else:
        item_limit = None

    fm = fee_re.search(detail_full)
    fee = fm.group(1).strip().replace(" ", "") if fm else None

    tm = time_re.search(detail_full)
    if tm:
        timeframe = tm.group(1).strip()
        if timeframe.upper() in ("INSTANT", "INSTANTS"):
            timeframe = "Instant"
    else:
        timeframe = None

    raw_text = chunk.strip()
    base_id = f"{region.lower()}-{slugify(name)}"
    return {
        "id": base_id if idx == 0 else f"{base_id}-{idx}",
        "name": name,
        "domain": detect_domain(name, raw_text),
        "region": region,
        "category": category,
        "priceLimit": price_limit,
        "itemLimit": item_limit,
        "fee": fee,
        "timeframe": timeframe,
        "notes": detail_full or None,
        "tags": [],
        "prismaticGlow": False,
        "logoUrl": None,
        "rawText": raw_text,
        "sortOrder": 0,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }


def parse_region(region: str, text: str):
    lines = text.split("\n")
    stores = []
    seen_ids = set()
    current_cat = "Electronics"
    chunk_lines: list = []
    chunk_pos = 0

    def flush():
        nonlocal chunk_lines, chunk_pos
        if not chunk_lines:
            return
        chunk = "\n".join(chunk_lines).strip()
        chunk_lines = []
        if not chunk or is_section_heading(chunk):
            return
        idx = 0
        store = parse_chunk(chunk, region, current_cat, 0)
        if not store:
            return
        while store["id"] in seen_ids:
            idx += 1
            store = parse_chunk(chunk, region, current_cat, idx)
            if not store:
                return
        seen_ids.add(store["id"])
        store["sortOrder"] = chunk_pos * 10
        chunk_pos += 1
        stores.append(store)

    for raw_line in lines:
        line = raw_line.rstrip()
        cat = is_section_heading(line)
        if cat:
            flush()
            current_cat = cat
            continue
        if is_separator(line):
            flush()
            continue
        chunk_lines.append(line)
    flush()

    return stores


def norm_name(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^A-Za-z0-9]+", "", s).lower()


def merge_with_existing(canonical: list[dict]) -> list[dict]:
    """Preserve admin-tweaks (tags, prismaticGlow, logoUrl, ID) for any
    canonical store that already exists in data/stores.json by name."""
    if not OUT.exists():
        return canonical
    try:
        old = json.loads(OUT.read_text(encoding="utf-8"))
    except Exception:
        return canonical
    idx = {}
    for s in old:
        idx.setdefault((s["region"], norm_name(s["name"])), s)
    merged = []
    for s in canonical:
        old_s = idx.get((s["region"], norm_name(s["name"])))
        if old_s:
            if old_s.get("tags"):
                s["tags"] = old_s["tags"]
            if old_s.get("prismaticGlow"):
                s["prismaticGlow"] = True
            if old_s.get("logoUrl"):
                s["logoUrl"] = old_s["logoUrl"]
            if old_s.get("domain") and not s.get("domain"):
                s["domain"] = old_s["domain"]
            s["id"] = old_s["id"]
            if old_s.get("createdAt"):
                s["createdAt"] = old_s["createdAt"]
        merged.append(s)
    return merged


def main():
    all_stores: list[dict] = []
    for region, url in REGION_URLS.items():
        print(f"Fetching {url}", file=sys.stderr)
        try:
            html = fetch(url)
        except Exception as e:
            print(f"  fetch failed: {e}", file=sys.stderr)
            continue
        text = extract_text(html)
        sl = parse_region(region, text)
        print(f"  {region}: {len(sl)} stores")
        all_stores.extend(sl)

    merged = merge_with_existing(all_stores)
    OUT.write_text(json.dumps(merged, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\nWrote {len(merged)} stores to {OUT}")
    print("\nNext: cd /app && yarn seed -- --reset")


if __name__ == "__main__":
    main()
