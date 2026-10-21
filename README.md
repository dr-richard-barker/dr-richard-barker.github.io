# dr-richard-barker.github.io

Personal academic CV, public science showcase, and interactive tools portfolio for **Richard J. Barker, PhD** — Senior Scientist, Plant Systems Biologist, and Chair of the NASA GeneLab Plant Analysis Working Group.

Live Site: **[https://dr-richard-barker.github.io](https://dr-richard-barker.github.io)**

---

## Architecture & Dual Perspectives

This repository builds a static, fast, zero-dependency site with two tailored perspectives and a CoSE-branded light/dark theme:

1. **Academic CV (`/academic/`)**:
   - Comprehensive scholarly profile tailored for faculty search committees and funding agencies.
   - 34+ verified peer-reviewed publications automatically synchronized from [ORCID (0000-0001-5681-9857)](https://orcid.org/0000-0001-5681-9857) with Crossref metadata, live search, theme filtering, and instant one-click BibTeX citation copying.
   - Detailed $1.12M+ extramural grants table.
   - Appointments, honors, awards, teaching, mentoring (2018 UW–Madison Mentoring Award), and federal review panel service.
   - Downloadable vector PDF compiled with [Typst](https://typst.app/).

2. **General Audience & Public Science (`/general/`)**:
   - Story-driven narrative explaining plant and fungal biology in extreme environments (*"I help plants and fungi grow where they shouldn't — from the Moon to a warming Midwest"*).
   - Real-world impact metrics: 3,000+ classrooms reached via AstroBotany, 100+ member NASA working group, 20+ researchers mentored.
   - Plain-language milestone spotlights: Mycoponics *Biotechnology Journal* 2026 front cover, Big Ten Network *LiveBIG* national broadcast, London Natural History Museum keynote, and *The Biochemist* feature.
   - Four clear avenues for collaboration.

3. **Tools & Repositories (`/projects/`)**:
   - Curated flagship suites spanning Space Biophysics & CFD, Plant & Fungal Atlases, Computer Vision Phenomics, and NASA OSDR Omics Engines.
   - Direct links to **100+ live in-browser GitHub Pages tools** across the `@dr-richard-barker` GitHub portfolio.

4. **CoSE Aesthetic & Light/Dark Mode**:
   - Deep teal (`#004053`), cyan (`#0f7f9f`), and steel accents sampled directly from [cosecloud.com](https://cosecloud.com).
   - Typography in **IBM Plex Sans** and **IBM Plex Mono**.
   - Zero-flash client-side theme toggle with `localStorage` persistence.
   - Dedicated clean print stylesheet.

---

## Directory Structure

```text
dr-richard-barker.github.io/
├── index.html                   # Dual-door landing page + project hubs (built)
├── academic/                    # Academic CV view
│   └── index.html
├── general/                     # General audience overview
│   └── index.html
├── projects/                    # Interactive tools directory
│   └── index.html
├── cv.pdf                       # Vector printable CV (Typst-built)
│
├── data/                        # Single source of truth (YAML & JSON)
│   ├── profile.yaml             # Core bio, contacts, stats, research themes
│   ├── appointments.yaml        # Academic and industry appointments
│   ├── education.yaml           # Degrees and executive training
│   ├── grants.yaml              # $1.12M+ competitive funding breakdown
│   ├── awards.yaml              # Honors, awards, and fellowships
│   ├── service.yaml             # Service, teaching, and media outreach
│   ├── publications.json        # Auto-fetched from ORCID & Crossref (34 works)
│   ├── pub_overrides.yaml       # Theme tags, badges, summaries, code repos
│   ├── hubs.yaml                # Project hubs linked from the homepage (#hubs)
│   ├── repos.json               # Auto-fetched GitHub metadata (173 repos)
│   └── projects.yaml            # Curated project groupings & descriptions
│
├── templates/                   # Jinja2 layouts
│   ├── base.html                # Navigation, CoSE styling, theme toggle, JSON-LD
│   ├── index.html               # Landing page with dual doors
│   ├── academic.html            # Serious academic CV
│   ├── general.html             # Public science overview
│   └── projects.html            # Tools and GitHub Pages directory
│
├── static/
│   ├── css/theme.css            # CoSE color tokens, light/dark, and print styles
│   └── js/site.js               # Theme toggle, filters, BibTeX clipboard
│
├── cv/
│   └── cv.typ                   # Typst source for printable cv.pdf
│
├── scripts/
│   ├── fetch_orcid.py           # Synchronize from ORCID v3 API & Crossref
│   ├── fetch_repos.py           # Synchronize from GitHub REST API
│   ├── build.py                 # Compile templates -> static HTML & cv.pdf
│   └── check_privacy.py         # Pre-deployment privacy & data safety check
│
├── .github/workflows/
│   └── deploy.yml               # Automated GitHub Actions deployment
├── requirements.txt             # Python dependencies (jinja2, pyyaml)
└── .gitignore
```

---

## Local Development & Preview

### 1. Set Up Environment
```bash
# In this directory:
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Build the Site & Typst PDF
```bash
python scripts/build.py
```

### 3. Local Preview Server
```bash
python3 -m http.server 8000
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser.

### 4. Refresh Publications from ORCID
```bash
python scripts/fetch_orcid.py
python scripts/build.py
```

### 5. Run Privacy Safety Check
```bash
python scripts/check_privacy.py
```

---

## Deploying to GitHub Pages

To make this live under `https://dr-richard-barker.github.io`:

1. On GitHub, create a new public repository named:
   **`dr-richard-barker.github.io`**
   *(leave "Add a README" unchecked)*

2. In this local folder, run:
   ```bash
   git init
   git branch -M main
   git remote add origin https://github.com/dr-richard-barker/dr-richard-barker.github.io.git
   git add .
   git commit -m "Inaugural release of academic CV & public science portfolio"
   git push -u origin main
   ```

3. In GitHub repo **Settings → Pages**:
   - Set **Source** to **GitHub Actions** (or Deploy from branch `main` root `/`).
   - The included `.github/workflows/deploy.yml` workflow will automatically run every push and every Monday morning to keep publications and repositories up to date.

---

## Updating Your GitHub Profile Links

To connect your GitHub presence directly to the new site:

1. **GitHub Bio / Website Link**:
   - Go to [github.com/settings/profile](https://github.com/settings/profile)
   - Change **Website** from the old Gilroy lab URL to:
     `https://dr-richard-barker.github.io`

2. **Add CV Badge to Profile README (`dr-richard-barker/dr-richard-barker`)**:
   Add this markdown badge near the top of your profile README:
   ```markdown
   [![Academic CV](https://img.shields.io/badge/Academic%20CV-dr--richard--barker.github.io-004053?style=flat&logo=orcid)](https://dr-richard-barker.github.io/academic/)
   [![Interactive Tools](https://img.shields.io/badge/Tools%20%26%20Demos-100%2B%20Live%20Apps-0f7f9f?style=flat&logo=github)](https://dr-richard-barker.github.io/projects/)
   ```

3. **Recommended Pinned Repositories**:
   Pin these top 6 flagship repositories on your GitHub profile:
   - `LunarLeaf-CFD`
   - `astroroot`
   - `plant-pathway-atlas`
   - `fungal-bgc-atlas`
   - `arabidopsis-atlas`
   - `dr-richard-barker.github.io`
