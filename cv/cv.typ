// CoSE-Themed Academic Curriculum Vitae
// Richard J. Barker, PhD
#set page(
  paper: "us-letter",
  margin: (x: 1.8cm, top: 2.0cm, bottom: 2.0cm),
  header: context {
    if here().page() > 1 [
      #set text(size: 8.5pt, fill: rgb("#5f7f8a"), font: "IBM Plex Sans")
      Richard J. Barker, PhD · Curriculum Vitae
      #h(1fr)
      #datetime.today().display("[Month repr:long] [Year]")
      #v(0.2em)
      #line(length: 100%, stroke: 0.5pt + rgb("#cfdde1"))
    ]
  },
  footer: context [
    #set text(size: 8.5pt, fill: rgb("#5f7f8a"), font: "IBM Plex Sans")
    #line(length: 100%, stroke: 0.5pt + rgb("#cfdde1"))
    https://dr-richard-barker.github.io/academic/
    #h(1fr)
    Page #counter(page).display() of #counter(page).final().first()
  ]
)

#set text(
  font: "IBM Plex Sans",
  size: 10pt,
  fill: rgb("#0f2a33")
)

#set par(justify: true, leading: 0.65em)

// Color definitions
#let brand-teal = rgb("#004053")
#let brand-accent = rgb("#0f7f9f")
#let brand-muted = rgb("#5f7f8a")
#let brand-soft = rgb("#eaf1f3")

#let section(title) = {
  v(1.2em)
  text(fill: brand-teal, weight: "bold", size: 12.5pt, upper(title))
  v(-0.3em)
  line(length: 100%, stroke: 1.2pt + brand-teal)
  v(0.4em)
}

#let entry(when, role, inst, details) = {
  grid(
    columns: (2.8cm, 1fr),
    gutter: 0.8em,
    text(fill: brand-muted, size: 9pt, font: "IBM Plex Mono", when),
    [
      #text(weight: "bold", role) \
      #text(fill: brand-teal, inst) \
      #if details != "" [#text(size: 9.5pt, fill: rgb("#3d5a64"), details)]
    ]
  )
  v(0.6em)
}

// Header
#align(center)[
  #text(size: 20pt, weight: "bold", fill: brand-teal)[Richard J. Barker, PhD] \
  #v(0.2em)
  #text(size: 10.5pt, weight: "medium")[Senior Scientist · Plant Systems Biologist · NASA Plant AWG Chair] \
  #v(0.4em)
  #text(size: 9pt, font: "IBM Plex Mono")[
    Madison, WI, USA ·
    #link("mailto:dr.richard.barker@gmail.com")[dr.richard.barker\@gmail.com] ·
    ORCID: #link("https://orcid.org/0000-0001-5681-9857")[0000-0001-5681-9857] \
    GitHub: #link("https://github.com/dr-richard-barker")[dr-richard-barker] ·
    Site: #link("https://dr-richard-barker.github.io")[dr-richard-barker.github.io]
  ]
]

#v(0.5em)

#section("Scholarly & Executive Profile")
Plant systems biologist, biophysical instrumentation developer, and computational researcher specializing in photosynthetic boundary-layer transport, primary carbon allocation, organelle stress signaling, and biological digital twins. Over eleven years of research leadership in Botany and Genetics at the University of Wisconsin–Madison (2012–2023), followed by NASA GeneLab/OSDR bioinformatics leadership and current Senior Scientist appointment in Agricultural & Biological Engineering at Purdue University. Science Co-Lead for the NASA Lunar LEAF Science Definition Team; Chair of the NASA GeneLab Plant Analysis Working Group (100+ global scientists). Co-secured *\~\$2,000,000* in competitive research awards; recipient of the *2018 UW–Madison Undergraduate Mentoring Award*. Author of 34+ peer-reviewed works and creator of >150 open-source repositories and in-browser scientific tools.

#section("Professional Appointments")

#entry("2024 – Pres.", "Senior Scientist & Science Co-Lead (NASA Lunar LEAF)", "Purdue University, Dept. of Agricultural & Biological Engineering", "Lead research on biophysical fluid mechanics of plant/fungal growth interfaces, physics-informed neural network boundary layer modeling, and solid-state nutrient delivery systems (Mycoponics) with Prof. D. Marshall Porterfield.")

#entry("2018 – Pres.", "Chair, Plant Analysis Working Group (AWG)", "NASA GeneLab / Open Science Data Repository (OSDR)", "Direct an international consortium of 100+ plant and microbial scientists across academia and NASA centers; establish open-science data standards, consensus pipelines, and conference symposia.")

#entry("2024 – Pres.", "Chair, Education & Outreach Committee", "American Society for Gravitational and Space Research (ASGSR)", "Direct society-wide strategic communications, student programs, and national conference outreach initiatives.")

#entry("2023 – 2024", "Project Scientist", "NASA GeneLab / OSDR · Blue Marble Space Institute of Science", "Standardized cross-kingdom multi-omics data integration, reproducible pipeline automation, and metadata ontology harmonization under Branch Chief Dr. Sylvain Costes.")

#entry("2017 – Pres.", "Co-Founder & Director of Operations", "Collaborative Science Environment (CoSE) Benefit Corp & AstroBotany.com", "Engineered open-source phenotyping kits (ABCD card) and citizen science tools deployed across 3,000+ classrooms internationally in partnership with Fairchild Tropical Botanic Garden.")

#entry("2022 – 2023", "Chief Data Scientist", "Yuri Gravity (Meckenbeuren, Germany)", "Designed telemetry processing and computational hardware interfaces for automated microgravity flight bioreactors.")

#entry("2014 – 2023", "Scientist (2015–2023) & Postdoctoral Associate (2014–2015)", "University of Wisconsin–Madison, Department of Botany (Birge Hall)", "Conducted live biosensor imaging of ROS and calcium dynamics (Gilroy Lab); managed multi-unit lab operations, grant proposal compilation, web administration, and directly mentored 20+ undergraduate researchers (2018 Mentoring Award).")

#entry("2012 – 2014", "Postdoctoral Research Associate", "University of Wisconsin–Madison, Department of Genetics", "Engineered automated seed sowing manifolds, robotic kinematics, and computer vision phenotyping for root gravitropism studies (Masson Lab).")

#entry("2002 – 2007", "Research Assistant", "John Innes Centre, Norwich, UK (Bevan Laboratory)", "Arabidopsis functional genomics, mutant characterization, and greenhouse operations.")

#section("Education")
#entry("2007 – 2011", "Ph.D. in Plant Science & Hormone Biochemistry", "University of Nottingham & Rothamsted Research, UK", "Thesis: Molecular genetics and spatial regulation of gibberellin biosynthesis in the Arabidopsis root tip. Advisor: Prof. Peter Hedden. Awarded the Lawes Trust Agricultural Scholarship.")

#entry("2003 – 2007", "B.Sc. (Hons) in Plant Science (First Class Honours)", "University of Nottingham, UK", "First Class Honours with University Certificate of Merit; Kenneth Whymes Memorial Prize for Distinction in Plant Science (2006).")

#section("Sponsored Grants Co-Secured (Total: ~$2,000,000)")
#table(
  columns: (3fr, 2.5fr, 1.5fr, 1.2fr, 1.2fr),
  stroke: 0.5pt + rgb("#cfdde1"),
  fill: (x, y) => if y == 0 { brand-soft } else { none },
  align: (left, left, left, center, right),
  table.header(
    [*Project Title*], [*Agency / Program*], [*Role*], [*Period*], [*Amount*]
  ),
  [NASA Lunar LEAF: Lunar Ecosystem & Feasibility], [NASA BPS], [Science Co-Lead], [2024–27], [\$600,000],
  [NASA TASTIE: Plant Spaceflight Stress Adaptation], [NASA BPS], [Co-Investigator], [2021–24], [\$750,000],
  [GeneLab Extending Data System Across Kingdoms], [NASA Space Biology], [Co-Investigator], [2018–21], [\$300,000],
  [TOAST Cross-Kingdom Discovery Portal], [NASA Innovation Award], [Co-Investigator], [2016–19], [\$250,000],
  [MANGO Multi-Attribute Omics Engine], [NASA JPL / Biosci.], [Co-Investigator], [2018–21], [\$110,000],
  [AstroBotany Educational Gaming & Phenotyping], [WSGC], [Principal Investigator], [2018–19], [\$40,000],
)

#section("Honors & Awards")
- *Front Cover Article Feature*, _Biotechnology Journal_ (Vol. 21, Issue 2, Feb 2026) for Mycoponics.
- *Thora Halstead Young Investigator Award*, American Society for Gravitational & Space Research (2019).
- *UW–Madison Undergraduate Mentoring Award*, College of Letters & Science (2018).
- *WARF / WID StartUp Weekend Winner*, Director of winning "FlashLapse" automated imaging team (2015).
- *BBSRC Biotechnology Business Competition National Finalist (2nd Place)*, Oxford, UK (2010).
- *Best Science Communication Student Award*, Rothamsted Research, UK (2008–2009).
- *Lawes Trust Agricultural Scholarship*, Rothamsted Research & Lawes Agricultural Trust (2007–2011).

#section("Selected Peer-Reviewed Publications")
#set text(size: 9pt)

1. Porterfield, D.M., Moulton, S.X., Sanchez, A.K., Sorg, A., Koenig, T., Terrell, M.S., Zahner, S., Baena, A., Proctor, C. & *Barker, R.J.* (2026). Mycoponics: Controlled bioproduction utilizing biophysical, solid-state, liquid nutrient delivery. _Biotechnology Journal_, 21(2), e70184. *(Front Cover Feature)*.
2. Seo, D., Strickland, H.F., Zhou, M., *Barker, R.*, Ferl, R.J., Paul, A.-L. & Gilroy, S. (2025). GLARE: discovering hidden patterns in spaceflight transcriptome using representation learning. _npj Microgravity_, 11, 76.
3. Porterfield, D.M., Tulodziecki, D., Wheeler, R., *Barker, R.J.*, et al. (2025). Critical investments in bioregenerative life support systems for bioastronautics and sustainable lunar exploration. _npj Microgravity_, 11, 57.
4. *Barker, R.*, Kruse, C.P.S., Johnson, C., Reinsch, S.S., Wyatt, S. & Gilroy, S. (2023). Meta-analysis of the space flight and microgravity response of the Arabidopsis plant transcriptome. _npj Microgravity_, 9(1), 21.
5. Camera, A., ... *Barker, R.*, et al. (2024). Aging and putative frailty biomarkers are altered by spaceflight. _Scientific Reports_, 14, 13098.
6. Overbey, E.G., Saravia-Butler, A.M., ... *Barker, R.J.*, ... & Galazka, J.M. (2021). NASA GeneLab RNA-seq consensus pipeline: standardized processing of short-read RNA-seq data. _iScience_, 24(4), 102361.
7. *Barker, R.*, Fernandez Garcia, M.N., Powers, S.J., Vaughan, S., Bennett, M.J., Phillips, A.L., Thomas, S.G. & Hedden, P. (2021). Mapping sites of gibberellin biosynthesis in the Arabidopsis root tip. _New Phytologist_, 229(3), 1521–1534.
8. Afshinnekoo, E., Scott, R.T., MacKay, M.J., ... *Barker, R.*, ... & Beheshti, A. (2020). Fundamental biological features of spaceflight: advancing the field to enable deep-space exploration. _Cell_, 183(5), 1162–1184.
9. Rutter, L., *Barker, R.*, Bezdan, D., et al. (2020). A new era for space life science: international standards for space omics processing. _Patterns_, 1(9), 100148.
10. *Barker, R.*, Lombardino, J., Rasmussen, K. & Gilroy, S. (2020). Test of Arabidopsis Space Transcriptome (TOAST): a discovery environment to explore multiple plant biology spaceflight experiments. _Frontiers in Plant Science_, 11, 147.
11. Choi, W.-G., *Barker, R.J.*, Kim, S.-H., Swanson, S.J. & Gilroy, S. (2019). Variation in the transcriptome of different ecotypes of Arabidopsis thaliana reveals signatures of oxidative stress in plant responses to spaceflight. _American Journal of Botany_, 106(1), 123–136.
12. Lien, M.R., *Barker, R.J.*, Ye, Z., Westphall, M.H., Gao, R., Singh, A., Gilroy, S. & Townsend, P.A. (2019). A low-cost and open-source platform for automated imaging. _Plant Methods_, 15, 6.
13. *Barker, R.*, Cox, B., Mackie, T.R. & Masson, P. (2013). Vacuum seed sowing manifold: a novel device for high-throughput sowing of Arabidopsis seeds. _Plant Methods_, 9(1), 41.

#v(0.5em)
#align(center)[
  #text(size: 8.5pt, fill: brand-muted)[
    Full verified bibliography of 34+ peer-reviewed works: #link("https://orcid.org/0000-0001-5681-9857")[ORCID 0000-0001-5681-9857] · Interactive CV: #link("https://dr-richard-barker.github.io/academic/")[dr-richard-barker.github.io/academic/]
  ]
]
