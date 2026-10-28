#!/usr/bin/env python3
"""Fetch public repository metadata from the GitHub API.

Writes data/repos.json (all public repos, paginated). Standard library only.
Set GITHUB_TOKEN to avoid the 60 req/hour anonymous rate limit.

`has_pages` only says Pages is switched on, not that a site is being served, so each
Pages URL is also requested and `pages_live` records whether it answered. Only a 404
counts as dead; a timeout or 5xx is treated as live so one slow response cannot drop
a working site from the directory.

    python3 scripts/fetch_repos.py
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

USER = "dr-richard-barker"
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "repos.json"
FIELDS = ("name", "description", "html_url", "homepage", "language", "stargazers_count",
          "forks_count", "fork", "has_pages", "pushed_at", "topics", "archived")


def get(url: str):
    headers = {"Accept": "application/vnd.github+json", "User-Agent": f"{USER}-cv-builder"}
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=30) as r:
        return json.load(r)


def pages_status(url: str) -> int:
    """HTTP status of a Pages site after redirects; 0 if it could not be reached."""
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": f"{USER}-cv-builder"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except OSError:
        return 0


def main() -> int:
    repos, page = [], 1
    while True:
        batch = get(f"https://api.github.com/users/{USER}/repos?per_page=100&page={page}&sort=pushed")
        if not batch:
            break
        repos.extend(batch)
        page += 1
    profile = get(f"https://api.github.com/users/{USER}")
    slim = []
    for r in repos:
        d = {k: r.get(k) for k in FIELDS}
        d["pages_url"] = f"https://{USER}.github.io/{r['name']}/" if r.get("has_pages") else None
        slim.append(d)
    with_pages = [d for d in slim if d["pages_url"]]
    with ThreadPoolExecutor(8) as pool:
        statuses = list(pool.map(pages_status, [d["pages_url"] for d in with_pages]))
    for d, status in zip(with_pages, statuses):
        d["pages_live"] = status != 404
        if status == 404:
            print(f"  Pages switched on but not served (404): {d['name']}")
        elif status != 200:
            print(f"  Pages answered {status or 'nothing'}, kept as live: {d['name']}")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "user": USER,
        "public_repos": profile.get("public_repos", len(slim)),
        "followers": profile.get("followers"),
        "avatar_url": profile.get("avatar_url"),
        "repos": slim,
    }, indent=2, ensure_ascii=False))
    print(f"Wrote {len(slim)} repos -> {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
