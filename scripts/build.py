#!/usr/bin/env python3
"""Static site builder for dr-richard-barker.github.io.

Compiles YAML/JSON data into static HTML pages:
  - index.html (Landing dual doors + project hubs)
  - academic/index.html (Serious academic CV)
  - general/index.html (General audience overview)
  - projects/index.html (100+ GitHub Pages tools & repos)
Also compiles cv/cv.typ -> cv.pdf via typst.
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from pathlib import Path
import yaml
from jinja2 import Environment, FileSystemLoader

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
TEMPLATES_DIR = ROOT / "templates"
STATIC_DIR = ROOT / "static"
sys.path.insert(0, str(ROOT / "scripts"))


def load_yaml(filename: str):
    p = DATA_DIR / filename
    if not p.exists():
        return {}
    with open(p, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def load_json(filename: str):
    p = DATA_DIR / filename
    if not p.exists():
        return {}
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)


def slugify(text: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return s[:60] or "item"


def make_bibtex(pub: dict) -> str:
    doi = pub.get("doi")
    first_author = (pub.get("authors") or [{"family": "Barker"}])[0].get("family", "Barker").lower()
    year = pub.get("year") or 2026
    key = f"{first_author}{year}{slugify(pub.get('title', ''))[:15]}"
    ptype = pub.get("type", "article")

    entry_type = "article"
    if ptype == "book-chapter":
        entry_type = "incollection"
    elif ptype == "software":
        entry_type = "software"
    elif ptype == "preprint":
        entry_type = "unpublished"

    author_str = " and ".join(a.get("family", "") + ", " + a.get("given", "") for a in pub.get("authors", []))
    lines = [
        f"@{entry_type}{{{key},",
        f"  title = {{{pub.get('title')}}},",
        f"  author = {{{author_str}}},",
        f"  year = {{{year}}},",
    ]
    if pub.get("venue"):
        if entry_type == "incollection":
            lines.append(f"  booktitle = {{{pub.get('venue')}}},")
        else:
            lines.append(f"  journal = {{{pub.get('venue')}}},")
    if pub.get("volume"):
        lines.append(f"  volume = {{{pub.get('volume')}}},")
    if pub.get("issue"):
        lines.append(f"  number = {{{pub.get('issue')}}},")
    if pub.get("pages"):
        lines.append(f"  pages = {{{pub.get('pages')}}},")
    if doi:
        lines.append(f"  doi = {{{doi}}},")
    if pub.get("url"):
        lines.append(f"  url = {{{pub.get('url')}}},")
    lines.append("}")
    return "\n".join(lines)


def process_publications(raw_pubs: list, overrides: dict) -> list:
    processed = []
    ov = overrides.get("overrides", {})
    extra = overrides.get("extra_works", [])

    combined = list(raw_pubs) + list(extra)

    for p in combined:
        doi = p.get("doi")
        pid = p.get("id") or doi or slugify(p.get("title", ""))
        custom = ov.get(doi, {}) if doi else ov.get(pid, {})

        # Merge overrides
        badge = custom.get("badge") or p.get("badge")
        themes = custom.get("themes") or p.get("themes") or ["space-cea"]
        summary = custom.get("summary") or p.get("summary")
        code_repo = custom.get("code_repo") or p.get("code_repo")
        highlight = custom.get("highlight", False) or p.get("highlight", False)

        # Build searchable string
        authors_text = " ".join(a.get("short", "") for a in p.get("authors", []))
        search_blob = f"{p.get('title', '')} {authors_text} {p.get('venue', '')} {p.get('year', '')} {' '.join(themes)} {badge or ''}".lower()

        item = dict(p)
        item["id_slug"] = slugify(pid)
        item["badge"] = badge
        item["themes"] = themes
        item["summary"] = summary
        item["code_repo"] = code_repo
        item["highlight"] = highlight
        item["search_blob"] = search_blob
        item["bibtex"] = make_bibtex(p)
        processed.append(item)

    # Sort descending by year
    processed.sort(key=lambda x: (-(x.get("year") or 0), x.get("title", "")))
    return processed


def group_by_year(pubs: list) -> list:
    groups = {}
    for p in pubs:
        y = p.get("year")
        groups.setdefault(y, []).append(p)
    res = []
    for y in sorted(groups.keys(), key=lambda k: -(k or 0)):
        res.append({"year": y, "pubs": groups[y]})
    return res


def build():
    print("Building static site for dr-richard-barker.github.io...")
    env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)), autoescape=True)

    profile = load_yaml("profile.yaml")
    education = load_yaml("education.yaml")
    appointments_data = load_yaml("appointments.yaml")
    grants = load_yaml("grants.yaml")
    awards_data = load_yaml("awards.yaml")
    service = load_yaml("service.yaml")
    pub_overrides = load_yaml("pub_overrides.yaml")
    projects_data = load_yaml("projects.yaml")
    hubs_data = load_yaml("hubs.yaml")

    pubs_raw = load_json("publications.json").get("works", [])
    repos_raw = load_json("repos.json")
    all_repos = repos_raw.get("repos", [])

    all_pages_repos = [r for r in all_repos if r.get("has_pages")]
    all_pages_repos.sort(key=lambda r: (-(r.get("stargazers_count") or 0), r.get("name", "")))

    works = process_publications(pubs_raw, pub_overrides)
    works_by_year = group_by_year(works)
    featured_works = [w for w in works if w.get("highlight")]

    # Featured demos for General view
    featured_demos = []
    for g in projects_data.get("featured_projects", []):
        for p in g.get("projects", []):
            if p.get("highlight"):
                featured_demos.append(p)

    common_context = {
        "profile": profile,
        "education": education,
        "appointments": appointments_data.get("appointments", []),
        "grants": grants,
        "awards": awards_data.get("awards", []),
        "service": service,
        "works": works,
        "works_by_year": works_by_year,
        "featured_works": featured_works,
        "featured_demos": featured_demos[:6],
        "curated_groups": projects_data.get("featured_projects", []),
        "all_pages_repos": all_pages_repos,
        "total_repos": repos_raw.get("public_repos", len(all_repos)),
        "total_pages": len(all_pages_repos),
    }

    # 1. Landing page (/)
    tpl_index = env.get_template("index.html")
    html_index = tpl_index.render(
        **common_context,
        hubs=hubs_data.get("hubs", []),
        page_title="Home",
        active_nav="home",
        root_path="./",
        current_path="/",
    )
    (ROOT / "index.html").write_text(html_index, encoding="utf-8")
    print("  -> Wrote index.html")

    # 2. Academic CV (/academic/)
    acad_dir = ROOT / "academic"
    acad_dir.mkdir(parents=True, exist_ok=True)
    tpl_acad = env.get_template("academic.html")
    html_acad = tpl_acad.render(
        **common_context,
        page_title="Academic Curriculum Vitae",
        page_description=profile.get("taglines", {}).get("academic"),
        active_nav="academic",
        root_path="../",
        current_path="/academic/",
    )
    (acad_dir / "index.html").write_text(html_acad, encoding="utf-8")
    print("  -> Wrote academic/index.html")

    # 3. General Audience (/general/)
    gen_dir = ROOT / "general"
    gen_dir.mkdir(parents=True, exist_ok=True)
    tpl_gen = env.get_template("general.html")
    html_gen = tpl_gen.render(
        **common_context,
        page_title="Overview & Public Science",
        page_description=profile.get("taglines", {}).get("general"),
        active_nav="general",
        root_path="../",
        current_path="/general/",
    )
    (gen_dir / "index.html").write_text(html_gen, encoding="utf-8")
    print("  -> Wrote general/index.html")

    # 4. Projects & Repositories (/projects/)
    proj_dir = ROOT / "projects"
    proj_dir.mkdir(parents=True, exist_ok=True)
    tpl_proj = env.get_template("projects.html")
    html_proj = tpl_proj.render(
        **common_context,
        page_title="Tools, Software & Repositories",
        page_description=f"Directory of {len(all_pages_repos)}+ interactive browser tools and research repositories.",
        active_nav="projects",
        root_path="../",
        current_path="/projects/",
    )
    (proj_dir / "index.html").write_text(html_proj, encoding="utf-8")
    print("  -> Wrote projects/index.html")

    # 5. Interactive Knowledge Graph (/graph/)
    from build_graph import build_graph
    graph_data = build_graph()
    graph_dir = ROOT / "graph"
    graph_dir.mkdir(parents=True, exist_ok=True)
    tpl_graph = env.get_template("graph.html")
    html_graph = tpl_graph.render(
        **common_context,
        page_title="Interactive Knowledge Graph",
        page_description=f"Interactive relational knowledge graph of {len(graph_data['nodes'])} research entities and {len(graph_data['links'])} connections.",
        active_nav="graph",
        graph=graph_data,
        graph_json=json.dumps(graph_data, ensure_ascii=False),
        root_path="../",
        current_path="/graph/",
    )
    (graph_dir / "index.html").write_text(html_graph, encoding="utf-8")
    print("  -> Wrote graph/index.html")

    # 6. Compile Typst PDF if typst is available
    typst_src = ROOT / "cv" / "cv.typ"
    if typst_src.exists():
        pdf_out = ROOT / "cv.pdf"
        try:
            print("  -> Compiling cv.pdf via typst...")
            subprocess.run(["typst", "compile", str(typst_src), str(pdf_out)], check=True)
            print("  -> Compiled cv.pdf")
        except Exception as e:
            print(f"  Typst compilation error: {e}", file=sys.stderr)

    print("Site build complete!")


if __name__ == "__main__":
    build()
