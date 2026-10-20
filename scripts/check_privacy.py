#!/usr/bin/env python3
"""Privacy & data integrity pre-push safety verification.

Scans all publishable files in the repository to ensure no private/sensitive
information is accidentally exposed:
  - Phone numbers (e.g., 608-515-0516)
  - Job requisition IDs (e.g., JR10015969, JR10012489)
  - Referee contact blocks or private email drafts
  - Salary / start-up figures

Exits with code 0 if clean, or code 1 with details if a violation is detected.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Forbidden patterns
PATTERNS = [
    (re.compile(r"\b608[\s\.\-]515[\s\.\-]0516\b"), "Personal phone number"),
    (re.compile(r"\bJR100\d{5}\b", re.IGNORECASE), "Job requisition ID"),
    (re.compile(r"\b(salary|start-?up\s*package|requisition)\b", re.IGNORECASE), "Private job search keyword"),
    (re.compile(r"\bapringle2@wisc\.edu\b", re.IGNORECASE), "Search committee chair email"),
]

EXTENSIONS = {".html", ".json", ".yaml", ".yml", ".md", ".txt", ".typ", ".js", ".css"}
EXCLUDED = {".git", ".venv", "__pycache__", "PLAN.md"}


def check():
    violations = []
    files_checked = 0

    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        if any(part in EXCLUDED for part in path.parts):
            continue
        if path.suffix not in EXTENSIONS:
            continue

        try:
            content = path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue

        files_checked += 1
        for regex, desc in PATTERNS:
            matches = regex.findall(content)
            if matches:
                violations.append((path.relative_to(ROOT), desc, matches[:3]))

    print(f"Privacy scan complete: checked {files_checked} files.")
    if violations:
        print("\n❌ PRIVACY VIOLATIONS DETECTED:", file=sys.stderr)
        for p, desc, m in violations:
            print(f"  - {p}: {desc} ({m})", file=sys.stderr)
        sys.exit(1)

    print("✅ All clean: no phone numbers, job requisitions, or private keywords found.")
    sys.exit(0)


if __name__ == "__main__":
    check()
