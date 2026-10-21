#!/usr/bin/env python3
"""Builds data/graph.json by synthesizing entities and relationships from:
  - data/profile.yaml (themes & pillars)
  - data/publications.json & data/pub_overrides.yaml (papers, DOIs, linked repos)
  - data/projects.yaml & data/repos.json (tools, apps, repositories)
  - data/grants.yaml (grants, agencies, programs)
  - data/appointments.yaml (institutions & appointments)

Outputs a comprehensive graph structure:
  {
    "nodes": [ { id, label, type, group, year, radius, color, ... } ],
    "links": [ { source, target, label, type, ... } ]
  }
"""
from __future__ import annotations

import json
import re
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
OUT = DATA_DIR / "graph.json"


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
    return s[:50] or "node"


def build_graph():
    print("Synthesizing Knowledge Graph data...")
    profile = load_yaml("profile.yaml")
    pub_overrides = load_yaml("pub_overrides.yaml")
    projects_data = load_yaml("projects.yaml")
    grants_data = load_yaml("grants.yaml")
    appointments_data = load_yaml("appointments.yaml")

    raw_pubs = load_json("publications.json").get("works", [])
    raw_repos = load_json("repos.json").get("repos", [])

    nodes = []
    links = []
    node_ids = set()

    def add_node(node_id: str, label: str, ntype: str, group: str, **kwargs):
        if node_id in node_ids:
            return
        node_ids.add(node_id)
        d = {
            "id": node_id,
            "label": label,
            "type": ntype,
            "group": group,
        }
        d.update(kwargs)
        nodes.append(d)

    def add_link(src: str, tgt: str, label: str = "relates", ltype: str = "general"):
        if src == tgt:
            return
        links.append({
            "source": src,
            "target": tgt,
            "label": label,
            "type": ltype,
        })

    # 1. Themes (5 Core Research Hubs)
    theme_colors = {
        "space-cea": "#0f7f9f",       # Cyan
        "ai-data": "#7ec3d8",         # Bright Teal / Ice
        "biomanufacturing": "#8fcf9d",# Mint / Leaf
        "phenotyping": "#d9822b",     # Amber / Phenomics
        "outreach": "#b085f5",        # Violet / Education
    }

    for t in profile.get("themes", []):
        tid = f"theme-{t['id']}"
        add_node(
            tid,
            t["name"],
            "theme",
            t["id"],
            icon=t.get("icon", "🌟"),
            description=t.get("description", ""),
            keywords=t.get("keywords", []),
            radius=26,
            color=theme_colors.get(t["id"], "#004053"),
        )

    # 2. Key Institutions
    institutions = [
        ("inst-purdue", "Purdue University", "Dept. of Agricultural & Biological Engineering (2024–Present)", "West Lafayette, IN"),
        ("inst-nasa-genelab", "NASA GeneLab / OSDR", "Space Biosciences Branch, NASA Ames (2018–Present)", "Moffett Field, CA"),
        ("inst-uw-madison", "UW–Madison", "Birge Hall, Depts. of Botany & Genetics (2012–2023)", "Madison, WI"),
        ("inst-cose", "CoSE Benefit Corp", "Sector67 Prototyping & Public Benefit (2017–Present)", "Madison, WI"),
        ("inst-rothamsted", "Rothamsted Research", "Lawes Trust Scholar & Ph.D. Training (2007–2011)", "Harpenden, UK"),
        ("inst-nottingham", "University of Nottingham", "B.Sc. First Class & Ph.D. Plant Science (2003–2011)", "Nottingham, UK"),
        ("inst-jic", "John Innes Centre", "Cell & Developmental Biology (2002–2007)", "Norwich, UK"),
        ("inst-asgsr", "ASGSR", "Education & Outreach Committee Chair (2024–Present)", "USA"),
    ]
    for iid, iname, idesc, iloc in institutions:
        add_node(
            iid,
            iname,
            "institution",
            "institution",
            description=idesc,
            location=iloc,
            radius=18,
            color="#5590ad",
        )

    # 3. Model Organisms & Systems
    organisms = [
        ("org-arabidopsis", "Arabidopsis thaliana", "Model plant system for root gravitropism, spaceflight transcriptomics, and hormone signaling.", "space-cea"),
        ("org-fungi", "Fungal Mycelium", "Solid-state fungal bioproduction, Mycoponics, and circular biomaterials.", "biomanufacturing"),
        ("org-human", "Astronaut Multi-Omics", "Human spaceflight physiological adaptation, bone/muscle atrophy, and oncogenic stress pathways.", "ai-data"),
        ("org-microbes", "Spaceflight Microbiomes", "Sphingomonas and ISS plant-associated microbial community remodeling.", "space-cea"),
        ("org-crops", "Space Crops (Tomato/Wheat/Rice)", "Controlled environment agricultural crops for bioregenerative life support.", "space-cea"),
    ]
    for oid, oname, odesc, ogrp in organisms:
        add_node(
            oid,
            oname,
            "organism",
            ogrp,
            description=odesc,
            radius=15,
            color="#3f7d4e",
        )

    # 4. Grants & Funded Spaceflight Payloads
    for g in grants_data.get("grants", []):
        gid = f"grant-{slugify(g['title'])[:25]}"
        add_node(
            gid,
            g["title"],
            "grant",
            "grant",
            amount=g.get("amount", ""),
            agency=g.get("agency", ""),
            years=g.get("years", ""),
            role=g.get("role", ""),
            description=g.get("summary", ""),
            radius=19,
            color="#d9822b",
        )
        # Link grant to institution
        if "Lunar LEAF" in g["title"]:
            add_link(gid, "inst-purdue", "administered_at", "institutional")
            add_link(gid, "theme-space-cea", "funds_theme", "thematic")
            add_link(gid, "theme-biomanufacturing", "funds_theme", "thematic")
            add_link(gid, "org-fungi", "investigates", "biological")
            add_link(gid, "org-crops", "investigates", "biological")
        elif "TASTIE" in g["title"] or "TOAST" in g["title"]:
            add_link(gid, "inst-uw-madison", "administered_at", "institutional")
            add_link(gid, "theme-space-cea", "funds_theme", "thematic")
            add_link(gid, "theme-ai-data", "funds_theme", "thematic")
            add_link(gid, "org-arabidopsis", "investigates", "biological")
        elif "GeneLab" in g["title"] or "MANGO" in g["title"]:
            add_link(gid, "inst-nasa-genelab", "administered_at", "institutional")
            add_link(gid, "theme-ai-data", "funds_theme", "thematic")
        elif "AstroBotany" in g["title"]:
            add_link(gid, "inst-cose", "administered_at", "institutional")
            add_link(gid, "theme-outreach", "funds_theme", "thematic")
            add_link(gid, "theme-phenotyping", "funds_theme", "thematic")

    # 5. Flagship Tools & Repositories
    tool_map = {}
    for group in projects_data.get("featured_projects", []):
        for p in group.get("projects", []):
            tid = f"tool-{slugify(p['name'])}"
            tool_map[p["name"].lower()] = tid
            tool_map[p["repo"].lower().split("/")[-1]] = tid
            add_node(
                tid,
                p["name"],
                "tool",
                group["id"],
                description=p.get("description", ""),
                demo_url=p.get("demo_url"),
                repo=p.get("repo"),
                language=p.get("language", ""),
                badge=p.get("badge", ""),
                radius=14,
                color="#0f7f9f",
            )
            # Link tool to theme
            theme_id = "theme-space-cea"
            if "ai" in group["id"] or "omics" in group["id"]:
                theme_id = "theme-ai-data"
            elif "fung" in group["id"]:
                theme_id = "theme-biomanufacturing"
            elif "phenom" in group["id"] or "imaging" in group["id"]:
                theme_id = "theme-phenotyping"
            add_link(tid, theme_id, "categorized_under", "thematic")

    # 6. Publications
    ov = pub_overrides.get("overrides", {})
    extra_works = pub_overrides.get("extra_works", [])
    all_pubs = list(raw_pubs) + list(extra_works)

    for p in all_pubs:
        doi = p.get("doi")
        pid = f"pub-{slugify(doi or p.get('id') or p.get('title'))[:25]}"
        custom = ov.get(doi, {}) if doi else ov.get(p.get("id"), {})

        themes = custom.get("themes") or p.get("themes") or ["space-cea"]
        main_theme = themes[0] if themes else "space-cea"
        badge = custom.get("badge") or p.get("badge")
        summary = custom.get("summary") or p.get("summary") or ""
        code_repo = custom.get("code_repo") or p.get("code_repo")

        year = p.get("year") or 2026
        title = p.get("title", "Untitled")

        # Size publication node slightly larger if highlighted or cover
        rad = 13
        if badge and ("Cover" in badge or "Cell" in badge or "Nature" in badge):
            rad = 17
        elif custom.get("highlight"):
            rad = 15

        add_node(
            pid,
            title,
            "publication",
            main_theme,
            year=year,
            venue=p.get("venue", ""),
            doi=doi,
            url=p.get("url") or (f"https://doi.org/{doi}" if doi else None),
            authors=[a.get("short") for a in p.get("authors", [])],
            badge=badge,
            summary=summary,
            radius=rad,
            color=theme_colors.get(main_theme, "#004053"),
        )

        # Link publication to parent theme(s)
        for th in themes:
            th_id = f"theme-{th}"
            if th_id in node_ids:
                add_link(pid, th_id, "advances_theme", "thematic")

        # Link publication to tool / code repository if defined
        if code_repo:
            cr_key = code_repo.lower()
            if cr_key in tool_map:
                add_link(pid, tool_map[cr_key], "produces_or_uses_tool", "software")

        # Contextual links based on contents:
        t_low = title.lower() + " " + summary.lower()
        if "mycoponics" in t_low or "fungal" in t_low:
            add_link(pid, "org-fungi", "studies", "biological")
            add_link(pid, "inst-purdue", "conducted_at", "institutional")
            for gid in [g["id"] for g in nodes if "Lunar LEAF" in g.get("label", "")]:
                add_link(pid, gid, "funded_by", "grant")
        elif "arabidopsis" in t_low or "plant" in t_low or "root" in t_low:
            add_link(pid, "org-arabidopsis", "studies", "biological")
        if "astronaut" in t_low or "human" in t_low or "gut" in t_low or "frailty" in t_low:
            add_link(pid, "org-human", "studies", "biological")
        if "sphingomonas" in t_low or "microbiom" in t_low:
            add_link(pid, "org-microbes", "studies", "biological")
        if "gibberellin" in t_low or year <= 2011:
            add_link(pid, "inst-rothamsted", "conducted_at", "institutional")
            add_link(pid, "inst-nottingham", "conducted_at", "institutional")
        elif 2012 <= year <= 2023:
            add_link(pid, "inst-uw-madison", "conducted_at", "institutional")
            if "genelab" in t_low or "toast" in t_low or "glare" in t_low or "rad-bio" in t_low:
                add_link(pid, "inst-nasa-genelab", "collaboration", "institutional")

    # Clean links to ensure both endpoints exist in node_ids
    valid_links = [l for l in links if l["source"] in node_ids and l["target"] in node_ids]

    # Calculate degree (connection count) for each node
    degrees = {}
    for l in valid_links:
        degrees[l["source"]] = degrees.get(l["source"], 0) + 1
        degrees[l["target"]] = degrees.get(l["target"], 0) + 1
    for n in nodes:
        n["degree"] = degrees.get(n["id"], 0)

    graph_data = {
        "nodes": nodes,
        "links": valid_links,
        "metrics": {
            "node_count": len(nodes),
            "link_count": len(valid_links),
            "themes_count": len([n for n in nodes if n["type"] == "theme"]),
            "pubs_count": len([n for n in nodes if n["type"] == "publication"]),
            "tools_count": len([n for n in nodes if n["type"] == "tool"]),
            "grants_count": len([n for n in nodes if n["type"] == "grant"]),
            "inst_count": len([n for n in nodes if n["type"] == "institution"]),
        }
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(graph_data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Knowledge Graph ready: {len(nodes)} nodes, {len(valid_links)} connections -> {OUT.relative_to(ROOT)}")
    return graph_data


if __name__ == "__main__":
    build_graph()
