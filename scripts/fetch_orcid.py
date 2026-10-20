#!/usr/bin/env python3
"""Fetch works from ORCID and enrich them with Crossref metadata.

Writes data/publications.json. Standard library only, so it runs anywhere
(including the GitHub Action) without extra dependencies.

    python3 scripts/fetch_orcid.py
"""
from __future__ import annotations

import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ORCID_ID = "0000-0001-5681-9857"
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "publications.json"
UA = "dr-richard-barker.github.io CV builder (mailto:dr.richard.barker@gmail.com)"

# ORCID work types that count as scholarly output on the site.
KEEP_TYPES = {
    "journal-article", "book-chapter", "review", "conference-paper",
    "preprint", "software", "data-set", "book", "report", "other",
}


def get_json(url: str, accept: str = "application/json", retries: int = 3):
    req = urllib.request.Request(url, headers={"Accept": accept, "User-Agent": UA})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            time.sleep(2 * (attempt + 1))
        except (urllib.error.URLError, TimeoutError):
            time.sleep(2 * (attempt + 1))
    return None


def norm_title(t: str) -> str:
    return re.sub(r"[^a-z0-9]", "", t.lower())


def pick_doi(summary: dict) -> str | None:
    ids = (summary.get("external-ids") or {}).get("external-id") or []
    for x in ids:
        if x.get("external-id-type") == "doi":
            v = x.get("external-id-value", "").strip()
            v = re.sub(r"^https?://(dx\.)?doi\.org/", "", v, flags=re.I)
            return v.lower() or None
    return None


def crossref(doi: str) -> dict | None:
    data = get_json("https://api.crossref.org/works/" + urllib.parse.quote(doi))
    return (data or {}).get("message")


def fmt_author(a: dict) -> dict:
    family = a.get("family") or a.get("name") or ""
    given = a.get("given") or ""
    initials = "".join(p[0] + "." for p in re.split(r"[\s\-]+", given) if p)
    return {"family": family, "given": given, "short": f"{family}, {initials}".strip(", ")}


def is_self(author: dict) -> bool:
    return author["family"].lower() == "barker" and author["given"][:1].upper() in {"R", "D", ""}


def main() -> int:
    works = get_json(f"https://pub.orcid.org/v3.0/{ORCID_ID}/works")
    if not works:
        print("ORCID fetch failed", file=sys.stderr)
        return 1

    pubs, seen = [], set()
    for group in works.get("group", []):
        summaries = group.get("work-summary") or []
        if not summaries:
            continue
        s = max(summaries, key=lambda w: int(w.get("display-index") or 0))
        wtype = s.get("type", "other")
        if wtype not in KEEP_TYPES:
            continue
        title = ((s.get("title") or {}).get("title") or {}).get("value", "").strip()
        if not title:
            continue
        doi = pick_doi(s) or next((pick_doi(x) for x in summaries if pick_doi(x)), None)
        key = doi or norm_title(title)
        if key in seen or norm_title(title) in seen:
            continue
        seen.update({key, norm_title(title)})

        year = (((s.get("publication-date") or {}).get("year")) or {}).get("value")
        rec = {
            "title": title,
            "type": wtype,
            "year": int(year) if year else None,
            "venue": ((s.get("journal-title") or {}).get("value") or "").strip(),
            "doi": doi,
            "url": f"https://doi.org/{doi}" if doi else ((s.get("url") or {}).get("value")),
            "authors": [],
            "volume": None, "issue": None, "pages": None,
            "source": "orcid",
        }
        if doi:
            m = crossref(doi)
            time.sleep(0.2)
            if m:
                rec["source"] = "orcid+crossref"
                rec["title"] = re.sub(r"<[^>]+>", "", (m.get("title") or [title])[0]).strip()
                rec["venue"] = (m.get("container-title") or [rec["venue"]])[0] or rec["venue"]
                rec["volume"] = m.get("volume")
                rec["issue"] = m.get("issue")
                rec["pages"] = m.get("page") or m.get("article-number")
                parts = ((m.get("published-print") or m.get("issued") or {}).get("date-parts") or [[None]])[0]
                if parts and parts[0]:
                    rec["year"] = int(parts[0])
                rec["authors"] = [fmt_author(a) for a in m.get("author", [])]
                cr_type = m.get("type", "")
                if cr_type == "book-chapter":
                    rec["type"] = "book-chapter"
                elif cr_type == "posted-content":
                    rec["type"] = "preprint"
        for a in rec["authors"]:
            a["self"] = is_self(a)
        rec["self_first"] = bool(rec["authors"]) and rec["authors"][0]["self"]
        rec["self_last"] = bool(rec["authors"]) and rec["authors"][-1]["self"]
        rec["id"] = (doi or norm_title(title))[:80]
        pubs.append(rec)
        print(f"  {rec['year']}  {rec['type']:<16} {rec['title'][:70]}")

    pubs.sort(key=lambda p: (-(p["year"] or 0), p["title"]))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"orcid": ORCID_ID, "count": len(pubs), "works": pubs}, indent=2, ensure_ascii=False))
    print(f"Wrote {len(pubs)} works -> {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
