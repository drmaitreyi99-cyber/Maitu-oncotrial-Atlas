/* Oncology Evidence Atlas
   Pages are chosen by the address after "#":
     #                 home
     #g-gi             a group of cancers
     #breast           one cancer, with a stage filter
     #t-cleopatra      one trial
     #timeline #doses #flashcards #saved
*/
(function () {
  "use strict";

  const DATA = window.ATLAS_DATA || { trials: [], biomarkers: [] };
  const app = document.getElementById("app");

  const GROUPS = {
    breast: { name: "Breast", organs: ["breast"] },
    thoracic: { name: "Lung", organs: ["nsclc", "sclc"] },
    gi: { name: "Gastrointestinal", organs: ["esophageal", "gastric", "colorectal", "pancreatic", "hcc", "biliary"] },
    gyn: { name: "Gynaecologic", organs: ["ovarian", "cervical", "endometrial"] },
    gu: { name: "Genitourinary", organs: ["prostate", "rcc", "urothelial", "testicular"] },
    head: { name: "Head, neck, thyroid and skin", organs: ["head-neck", "thyroid", "melanoma"] },
    rare: { name: "Sarcoma, CNS, NET and tumour-agnostic", organs: ["sarcoma", "gist", "glioma", "net", "agnostic"] },
    heme: { name: "Haematologic", organs: ["dlbcl", "hodgkin", "myeloma", "aml", "all", "cml", "cll"] },
  };

  const DISEASES = {
    breast: { name: "Breast cancer", short: "Breast", group: "breast", blurb: "HR-positive, HER2-positive, HER2-low, BRCA, PIK3CA, ESR1 and triple-negative trials, from adjuvant tamoxifen to 2026 oral SERDs and ADCs." },
    nsclc: { name: "Non-small-cell lung cancer", short: "NSCLC", group: "thoracic", blurb: "Screening, adjuvant, stage III and metastatic trials, with EGFR, ALK, ROS1, RET, BRAF, MET, HER2, KRAS and PD-L1 selection." },
    sclc: { name: "Small-cell lung cancer", short: "SCLC", group: "thoracic", blurb: "Limited and extensive stage: chemo-immunotherapy, consolidation, PCI and DLL3-directed therapy." },
    esophageal: { name: "Esophageal and GEJ cancer", short: "Esophagus", group: "gi", blurb: "Neoadjuvant chemoradiotherapy, perioperative chemotherapy, adjuvant and first-line immunotherapy by PD-L1." },
    gastric: { name: "Gastric and GEJ adenocarcinoma", short: "Gastric", group: "gi", blurb: "Perioperative therapy and HER2, Claudin 18.2 and PD-L1-selected treatment for advanced disease." },
    colorectal: { name: "Colorectal cancer", short: "Colorectal", group: "gi", blurb: "Adjuvant colon, rectal, and metastatic trials selected by RAS, BRAF, KRAS G12C, MSI and PIK3CA." },
    pancreatic: { name: "Pancreatic cancer", short: "Pancreas", group: "gi", blurb: "Adjuvant chemotherapy, first-line regimens, BRCA maintenance and RAS inhibition." },
    hcc: { name: "Hepatocellular carcinoma", short: "HCC", group: "gi", blurb: "From sorafenib to first-line immunotherapy combinations for unresectable disease." },
    biliary: { name: "Biliary tract cancer", short: "Biliary", group: "gi", blurb: "Gemcitabine-cisplatin backbone, immunotherapy, and IDH1 or FGFR2-targeted therapy." },
    ovarian: { name: "Ovarian cancer", short: "Ovary", group: "gyn", blurb: "Primary chemotherapy, HIPEC, BRCA and HRD-guided PARP maintenance, and FRα-directed therapy." },
    cervical: { name: "Cervical cancer", short: "Cervix", group: "gyn", blurb: "Surgery, chemoradiotherapy, induction, and immunotherapy or ADCs for recurrent disease." },
    endometrial: { name: "Endometrial cancer", short: "Endometrium", group: "gyn", blurb: "dMMR/MSI-H and pMMR immunotherapy trials in advanced or recurrent disease." },
    prostate: { name: "Prostate cancer", short: "Prostate", group: "gu", blurb: "Localised, biochemically recurrent, hormone-sensitive and castration-resistant disease, with HRR and PSMA selection." },
    rcc: { name: "Renal cell carcinoma", short: "Kidney", group: "gu", blurb: "Adjuvant immunotherapy, first-line combinations and HIF-2α inhibition." },
    urothelial: { name: "Urothelial carcinoma", short: "Urothelial", group: "gu", blurb: "Perioperative, ctDNA-guided, and metastatic trials, including FGFR3 and HER2 selection." },
    testicular: { name: "Germ-cell tumours", short: "Germ cell", group: "gu", blurb: "Cisplatin-based chemotherapy for disseminated germ-cell tumours." },
    "head-neck": { name: "Head and neck cancer", short: "Head & neck", group: "head", blurb: "Organ preservation, postoperative chemoradiotherapy, HPV de-escalation, nasopharynx and immunotherapy." },
    thyroid: { name: "Thyroid cancer", short: "Thyroid", group: "head", blurb: "Radioiodine-refractory differentiated and RET-mutant medullary thyroid cancer." },
    melanoma: { name: "Melanoma", short: "Melanoma", group: "head", blurb: "BRAF-targeted therapy, checkpoint inhibitors, neoadjuvant therapy, TIL and uveal melanoma." },
    sarcoma: { name: "Soft-tissue sarcoma", short: "Sarcoma", group: "rare", blurb: "First-line anthracycline therapy and later-line pazopanib." },
    gist: { name: "Gastrointestinal stromal tumour", short: "GIST", group: "rare", blurb: "KIT-driven disease: adjuvant duration and lines of kinase inhibitors." },
    glioma: { name: "Glioma", short: "Glioma", group: "rare", blurb: "Glioblastoma with MGMT, low-grade glioma with IDH, and tumour-treating fields." },
    net: { name: "Neuroendocrine tumours", short: "NET", group: "rare", blurb: "Somatostatin analogues, targeted therapy and SSTR-directed radioligands." },
    agnostic: { name: "Tumour-agnostic biomarkers", short: "Agnostic", group: "rare", blurb: "NTRK fusions and MSI-H/dMMR across solid tumours." },
    dlbcl: { name: "Diffuse large B-cell lymphoma", short: "DLBCL", group: "heme", blurb: "R-CHOP and its successors, and CAR-T as second-line therapy." },
    hodgkin: { name: "Hodgkin lymphoma", short: "Hodgkin", group: "heme", blurb: "Early-stage de-escalation and CD30 or PD-1-directed therapy in advanced disease." },
    myeloma: { name: "Multiple myeloma", short: "Myeloma", group: "heme", blurb: "Transplant, quadruplet induction, and BCMA-directed CAR-T and bispecifics." },
    aml: { name: "Acute myeloid leukaemia", short: "AML", group: "heme", blurb: "FLT3, IDH1 and PML-RARA-directed therapy, and venetoclax-based treatment." },
    all: { name: "Acute lymphoblastic leukaemia", short: "ALL", group: "heme", blurb: "CD19 and CD22-directed therapy in adult and paediatric B-cell ALL." },
    cml: { name: "Chronic myeloid leukaemia", short: "CML", group: "heme", blurb: "BCR-ABL1 tyrosine-kinase inhibitors from imatinib to asciminib." },
    cll: { name: "Chronic lymphocytic leukaemia", short: "CLL", group: "heme", blurb: "BTK inhibitors, venetoclax and fixed-duration combinations." },
  };

  const GUIDELINES = [
    { name: "NCCN Guidelines", by: "National Comprehensive Cancer Network (USA)", url: "https://www.nccn.org/guidelines/category_1", note: "Treatment guidelines for each cancer type. Free registration is needed to read them." },
    { name: "NCCN Biomarkers Compendium", by: "National Comprehensive Cancer Network (USA)", url: "https://www.nccn.org/compendia-templates/compendia/biomarkers-compendium", note: "Which biomarker to test, in which cancer, and why." },
    { name: "ESMO Clinical Practice Guidelines", by: "European Society for Medical Oncology", url: "https://www.esmo.org/guidelines", note: "Guidelines by tumour type, with levels of evidence and grades of recommendation." },
    { name: "ESMO Living Guidelines", by: "European Society for Medical Oncology", url: "https://www.esmo.org/guidelines/living-guidelines", note: "Treatment algorithms that ESMO updates as new trials are published." },
    { name: "ESMO-MCBS", by: "European Society for Medical Oncology", url: "https://www.esmo.org/guidelines/esmo-mcbs", note: "The Magnitude of Clinical Benefit Scale, used to grade how much a trial result matters." },
    { name: "ASCO Guidelines", by: "American Society of Clinical Oncology", url: "https://www.asco.org/practice-patients/guidelines", note: "Evidence-based guidelines and rapid recommendation updates." },
    { name: "ESGO Guidelines", by: "European Society of Gynaecological Oncology", url: "https://www.esgo.org/explore/guidelines/", note: "Ovarian, endometrial, cervical and vulvar cancer guidelines, several written with ESMO and ESTRO." },
    { name: "EAU Guidelines", by: "European Association of Urology", url: "https://uroweb.org/guidelines", note: "Prostate, bladder, kidney, upper-tract and testicular cancer." },
    { name: "ASH Clinical Practice Guidelines", by: "American Society of Hematology", url: "https://www.hematology.org/education/clinicians/guidelines-and-quality-care/clinical-practice-guidelines", note: "Guidelines for haematological cancers and related care." },
    { name: "European Hematology Association", by: "EHA", url: "https://ehaweb.org/", note: "EHA guidelines and links to ELN recommendations for leukaemia." },
  ];

  const RESULT = {
    POSITIVE: ["Met the reported primary comparison", "pill-good"],
    NEGATIVE: ["Did not meet the reported primary comparison", "pill-bad"],
    NON_INFERIOR: ["Non-inferior on the reported analysis", "pill-good"],
    MIXED: ["Mixed result — read the quote", "pill-amber"],
    DESCRIPTIVE: ["Single-arm or descriptive", "pill-neutral"],
  };
  const ENDPOINT = {
    OS: "Overall survival", PFS: "Progression-free survival", EFS: "Event-free survival",
    DFS: "Disease-free survival", IDFS: "Invasive disease-free survival", RFS: "Recurrence-free survival",
    ORR: "Objective response", pCR: "Pathological complete response", OTHER: "Reported outcome",
  };
  const STAGE = {
    screening: "Screening", early: "Early", limited: "Limited stage", resectable: "Resectable (neoadjuvant / perioperative)",
    resected: "After resection (adjuvant)", "locally-advanced": "Locally advanced", "newly-diagnosed": "Newly diagnosed",
    advanced: "Advanced", metastatic: "Metastatic", extensive: "Extensive stage", recurrent: "Recurrent",
    relapsed: "Relapsed or refractory", any: "Any stage",
  };
  const STAGE_ORDER = Object.keys(STAGE);
  const MARKERS = Object.fromEntries((DATA.biomarkers || []).map((b) => [b.slug, b]));
  function markerName(slug) { return MARKERS[slug] ? MARKERS[slug].name : slug.toUpperCase(); }
  function byYear(a, b) { return (a.year || 0) - (b.year || 0) || a.acronym.localeCompare(b.acronym); }
  function firstStage(t) { return (t.stages || []).slice().sort((a, b) => STAGE_ORDER.indexOf(a) - STAGE_ORDER.indexOf(b))[0] || "any"; }
  function stageGroups(list) {
    const groups = {};
    list.forEach((t) => { (groups[firstStage(t)] ||= []).push(t); });
    return STAGE_ORDER.filter((s) => groups[s]).map((s) => `<section class="stage-group"><h2>${esc(STAGE[s])}</h2><div class="cards">${groups[s].sort(byYear).map(trialCard).join("")}</div></section>`).join("");
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  function resultPill(result) {
    const pair = RESULT[result] || ["—", "pill-neutral"];
    return `<span class="pill ${pair[1]}">${pair[0]}</span>`;
  }
  const statusPill = `<span class="pill pill-amber" title="Copied from the PubMed abstract. Not yet checked against the full paper.">Awaiting verification</span>`;
  function trialsFor(disease) { return DATA.trials.filter((t) => t.disease === disease); }
  function pubmed(pmid) { return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`; }
  function phaseLabel(p) { return /^(I|II|III|Ib|I\/II|II\/III)$/.test(p || "") ? `Phase ${p}` : p; }

  const SAVED_KEY = "onco-atlas-saved";
  function getSaved() { try { return JSON.parse(localStorage.getItem(SAVED_KEY)) || []; } catch (e) { return []; } }
  function setSaved(list) { try { localStorage.setItem(SAVED_KEY, JSON.stringify(list)); } catch (e) {} }

  function trialCard(t) {
    const d = DISEASES[t.disease];
    return `<a class="card" href="#t-${t.slug}">
      <div class="card-top"><span class="pill bg-${t.disease} ink-${t.disease}">${esc(d.short)}</span>${t.landmark ? '<span class="star" title="Landmark trial">★</span>' : ""}</div>
      <h3>${esc(t.acronym)}</h3>
      <p class="sub">${esc(t.setting)}</p>
      <div>${resultPill(t.result)}</div>
      ${(t.biomarkers || []).length ? `<div class="marker-pills">${t.biomarkers.map((b) => `<span class="pill pill-neutral">${esc(markerName(b))}</span>`).join("")}</div>` : ""}
      <p class="meta tabular">${t.year} · ${esc(phaseLabel(t.phase))}</p>
    </a>`;
  }

  function organTile(slug) {
    const d = DISEASES[slug];
    const n = trialsFor(slug).length;
    return `<a class="tile bg-${slug}" href="#${slug}">
      <div><h3>${esc(d.short)}</h3><p>${esc(d.blurb)}</p></div>
      <span class="count ink-${slug}">${n} trial${n === 1 ? "" : "s"} ›</span>
    </a>`;
  }

  function renderHome() {
    const outcomes = DATA.trials.reduce((n, t) => n + (t.outcomes || []).length, 0);
    app.innerHTML = `<div class="wrap">
      <section class="hero">
        <p class="eyebrow">DM medical oncology · practice-changing trials</p>
        <h1>The trials behind<br><span class="soft">each organ and stage.</span></h1>
        <p class="lead">PICO, drugs, and doses for landmark studies across cancers. Every result number is a sentence from the PubMed abstract, with a link to the paper.</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="#breast">Start with breast</a>
          <a class="btn" href="#biomarkers">Browse by biomarker</a>
          <a class="btn" href="#guidelines">Guidelines</a>
          <button class="btn" type="button" data-action="search">Search a trial</button>
        </div>
        <div class="stats tabular">
          <div><b>${DATA.trials.length}</b>trials</div>
          <div><b>${outcomes}</b>quoted results</div>
          <div><b>${Object.keys(DISEASES).length}</b>cancers</div>
          <div><b>${new Set(DATA.trials.flatMap((t) => t.biomarkers || [])).size}</b>biomarkers</div>
        </div>
      </section>
      ${Object.entries(GROUPS).map(([id, g]) => `
        <section class="section" id="home-${id}">
          <div class="section-head"><h2>${esc(g.name)}</h2><p>Open a cancer, then filter by stage or biomarker.</p></div>
          <div class="tiles">${g.organs.map(organTile).join("")}</div>
        </section>`).join("")}
    </div>`;
  }

  function renderGroup(id) {
    const g = GROUPS[id];
    if (!g) return renderNotFound();
    app.innerHTML = `<div class="wrap">
      <a class="back" href="#">‹ All cancers</a>
      <section class="hero" style="padding-top:12px"><p class="eyebrow">Organ library</p><h1>${esc(g.name)}</h1></section>
      <div class="tiles">${g.organs.map(organTile).join("")}</div>
    </div>`;
  }

  function renderDisease(slug, stage, marker) {
    const d = DISEASES[slug];
    if (!d) return renderNotFound();
    const all = trialsFor(slug);
    const stages = STAGE_ORDER.filter((s) => all.some((t) => (t.stages || []).includes(s)));
    const markers = [...new Set(all.flatMap((t) => t.biomarkers || []))].sort((a, b) => markerName(a).localeCompare(markerName(b)));
    const shown = all
      .filter((t) => !stage || (t.stages || []).includes(stage))
      .filter((t) => !marker || (marker === "none" ? !(t.biomarkers || []).length : (t.biomarkers || []).includes(marker)));
    const chip = (attr, value, label, on) => `<button class="chip" type="button" ${attr}="${esc(value)}" aria-pressed="${on}">${esc(label)}</button>`;
    app.innerHTML = `<div class="wrap">
      <a class="back" href="#g-${d.group}">‹ ${esc(GROUPS[d.group].name)}</a>
      <section class="disease-hero bg-${slug}">
        <p class="eyebrow ink-${slug}">${all.length} trial${all.length === 1 ? "" : "s"} · oldest first within each stage</p>
        <h1>${esc(d.name)}</h1>
        <p>${esc(d.blurb)}</p>
      </section>
      <div class="filter-row" role="group" aria-label="Filter by stage">
        <span class="filter-label">Stage</span>
        ${chip("data-stage", "", "All stages", !stage)}
        ${stages.map((s) => chip("data-stage", s, STAGE[s] || s, stage === s)).join("")}
      </div>
      ${markers.length ? `<div class="filter-row" role="group" aria-label="Filter by biomarker">
        <span class="filter-label">Biomarker</span>
        ${chip("data-marker", "", "All", !marker)}
        ${markers.map((m) => chip("data-marker", m, markerName(m), marker === m)).join("")}
        ${chip("data-marker", "none", "Not biomarker-selected", marker === "none")}
      </div>` : ""}
      ${!shown.length
        ? `<div class="empty-state"><h3>No trials match these filters</h3><p>Choose another stage or biomarker. This library is a curated set, not every published trial.</p></div>`
        : stage ? `<div class="cards">${shown.sort(byYear).map(trialCard).join("")}</div>` : stageGroups(shown)}
    </div>`;
    app.querySelectorAll("[data-stage]").forEach((b) => b.addEventListener("click", () => renderDisease(slug, b.dataset.stage, marker)));
    app.querySelectorAll("[data-marker]").forEach((b) => b.addEventListener("click", () => renderDisease(slug, stage, b.dataset.marker)));
  }

  function renderBiomarkers() {
    const counts = {};
    DATA.trials.forEach((t) => (t.biomarkers || []).forEach((b) => { counts[b] = (counts[b] || 0) + 1; }));
    const list = (DATA.biomarkers || []).filter((b) => counts[b.slug]);
    app.innerHTML = `<div class="wrap">
      <section class="hero" style="padding-bottom:8px"><p class="eyebrow">Biomarkers</p><h1>Trials by biomarker.</h1>
        <p class="lead">Open a biomarker to see its trials organ by organ and stage by stage, from the oldest paper to the newest.</p></section>
      <div class="guide-grid">${list.map((b) => `
        <a class="guide-card" href="#b-${b.slug}" style="text-decoration:none;color:inherit">
          <h3>${esc(b.name)}</h3><p>${esc(b.summary)}</p>
          <span class="pill pill-neutral">${counts[b.slug]} trial${counts[b.slug] === 1 ? "" : "s"}</span>
        </a>`).join("")}</div>
    </div>`;
  }

  function renderBiomarker(slug) {
    const b = MARKERS[slug];
    const list = DATA.trials.filter((t) => (t.biomarkers || []).includes(slug));
    if (!b || !list.length) return renderNotFound();
    const organs = Object.keys(DISEASES).filter((d) => list.some((t) => t.disease === d));
    app.innerHTML = `<div class="wrap">
      <a class="back" href="#biomarkers">‹ All biomarkers</a>
      <section class="hero" style="padding-bottom:8px"><p class="eyebrow">Biomarker · ${list.length} trial${list.length === 1 ? "" : "s"}</p><h1>${esc(b.name)}</h1>
        <p class="lead">${esc(b.summary)}</p>
        <div class="organ-links">${organs.map((d) => `<a href="#bm-${d}">${esc(DISEASES[d].short)}</a>`).join("")}</div></section>
      ${organs.map((d) => `<section class="section" id="bm-${d}">
        <div class="section-head"><h2><a href="#${d}" style="color:inherit">${esc(DISEASES[d].name)}</a></h2></div>
        ${stageGroups(list.filter((t) => t.disease === d))}
      </section>`).join("")}
    </div>`;
    app.querySelectorAll(".organ-links a").forEach((a) => a.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById(a.getAttribute("href").slice(1)).scrollIntoView({ behavior: "smooth" });
    }));
  }

  function renderGuidelines() {
    app.innerHTML = `<div class="wrap">
      <section class="hero" style="padding-bottom:8px"><p class="eyebrow">Guidelines</p><h1>Where practice is decided.</h1>
        <p class="lead">Trials in this atlas are the evidence. These societies turn that evidence into recommendations. Their guideline text is copyrighted, so this site links to it rather than copying it. Always check the current version.</p></section>
      <div class="guide-grid">${GUIDELINES.map((g) => `
        <div class="guide-card"><h3>${esc(g.name)}</h3><p><b>${esc(g.by)}.</b> ${esc(g.note)}</p>
          <a href="${esc(g.url)}" target="_blank" rel="noopener">Open ${esc(g.name)} ↗</a></div>`).join("")}</div>
      <p class="note">Trial results on this site come from abstracts in peer-reviewed journals such as the New England Journal of Medicine, The Lancet, The Lancet Oncology, Journal of Clinical Oncology, JAMA, Annals of Oncology and Nature Medicine.</p>
    </div>`;
  }

  function renderTrial(slug, tab) {
    const t = DATA.trials.find((x) => x.slug === slug);
    if (!t) return renderNotFound();
    tab = tab || "overview";
    const saved = getSaved().includes(slug);
    const tabs = [["overview", "PICO"], ["results", "Results"], ["doses", "Drugs & doses"], ["appraisal", "Appraisal"], ["references", "References"]];
    app.innerHTML = `<div class="wrap">
      <a class="back" href="#${t.disease}">‹ ${esc(DISEASES[t.disease].short)}</a>
      <section class="trial-head">
        <div class="pills">
          <span class="pill bg-${t.disease} ink-${t.disease}">${esc(DISEASES[t.disease].short)}</span>
          <span class="pill pill-neutral">${esc(phaseLabel(t.phase))}</span>
          ${(t.stages || []).map((s) => `<span class="pill pill-neutral">${esc(STAGE[s] || s)}</span>`).join("")}
          ${(t.biomarkers || []).map((b) => `<a class="pill pill-neutral" href="#b-${esc(b)}">${esc(markerName(b))}</a>`).join("")}
          ${resultPill(t.result)} ${statusPill}
        </div>
        <h1>${esc(t.acronym)}</h1>
        <p class="title">${esc(t.title)}</p>
        <div class="trial-actions">
          <button class="btn ${saved ? "btn-primary" : ""}" type="button" id="save-btn">${saved ? "Saved" : "Save to my list"}</button>
        </div>
      </section>
      <div class="segmented" role="tablist">${tabs.map(([id, label]) => `<button role="tab" type="button" data-tab="${id}" aria-selected="${tab === id}">${label}</button>`).join("")}</div>
      <section class="panel">${trialPanel(t, tab)}</section>
    </div>`;
    app.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => renderTrial(slug, b.dataset.tab)));
    document.getElementById("save-btn").addEventListener("click", () => {
      const list = getSaved();
      setSaved(list.includes(slug) ? list.filter((s) => s !== slug) : list.concat(slug));
      renderTrial(slug, tab);
    });
  }

  function trialPanel(t, tab) {
    if (tab === "overview") {
      const arms = (t.arms || []).map((a) => `<div class="arm"><b>${esc(a.label)}</b><small>${esc(a.role === "CONTROL" ? "Comparator" : "Experimental")}</small></div>`).join("");
      return `
        <p class="label">The question</p>
        <p class="question">${esc(t.question)}</p>
        <div class="block"><p class="label">PICO</p>
          <div class="pico">
            <div class="bg-pico-p"><b class="ink-pico-p">P</b><span class="ink-pico-p">Population</span><p>${esc(t.pico.population)}</p></div>
            <div class="bg-pico-i"><b class="ink-pico-i">I</b><span class="ink-pico-i">Intervention</span><p>${esc(t.pico.intervention)}</p></div>
            <div class="bg-pico-c"><b class="ink-pico-c">C</b><span class="ink-pico-c">Comparator</span><p>${esc(t.pico.comparator)}</p></div>
            <div class="bg-pico-o"><b class="ink-pico-o">O</b><span class="ink-pico-o">Outcomes</span><p>${esc(t.pico.outcomes)}</p></div>
          </div>
        </div>
        <div class="block"><p class="label">Schema</p>
          <div class="schema">
            <div class="pop">${esc(t.pico.population)}</div>
            <div class="r" title="Randomised">R</div>
            <div class="arms">${arms}</div>
          </div>
        </div>
        <div class="block"><div class="facts">
          <div class="fact"><small>Setting</small><div>${esc(t.setting)}</div></div>
          <div class="fact"><small>Stage</small><div>${esc((t.stages || []).map((s) => STAGE[s] || s).join(", "))}</div></div>
          <div class="fact"><small>Phase</small><div>${esc(phaseLabel(t.phase))}</div></div>
          <div class="fact"><small>Published</small><div class="tabular">${esc(t.year)}</div></div>
        </div></div>
        ${t.pearl ? `<div class="block"><p class="label">Teaching pearl</p><div class="pearl bg-${t.disease}">${esc(t.pearl)}</div></div>` : ""}`;
    }

    if (tab === "results") {
      if (!t.outcomes.length) return `<div class="empty-state"><h3>No quoted result yet</h3></div>`;
      return t.outcomes.map((o) => `
        <h3 class="endpoint-title">${esc(ENDPOINT[o.endpoint] || o.endpoint)} ${o.isPrimary ? '<span class="pill pill-good">Reported primary comparison</span>' : '<span class="pill pill-neutral">Later report</span>'}</h3>
        <div class="table-wrap"><table>
          <thead><tr><th>Analysis</th><th>${esc(o.expLabel || "Experimental")}</th><th>${esc(o.ctrlLabel || "Comparator")}</th><th>Source</th></tr></thead>
          <tbody><tr>
            <td><b>${esc(o.analysisLabel)}</b></td>
            <td>${esc(o.experimentalValue || "See the quote")}</td>
            <td>${esc(o.controlValue || "See the quote")}</td>
            <td><a href="${pubmed(o.pmid)}" target="_blank" rel="noopener">PubMed ${esc(o.pmid)} ↗</a>
              <details class="quote" open><summary>Exact abstract quote</summary><blockquote>“${esc(o.sourceQuote)}”</blockquote></details>
            </td>
          </tr></tbody>
        </table></div>`).join("") +
        `<p class="note">The numbers in the quote are the ones printed in the PubMed abstract. They are not a substitute for the full paper, a protocol, or a current guideline.</p>`;
    }

    if (tab === "doses") {
      const blocks = (t.arms || []).map((a) => `
        <div class="dose-item">
          <h3>${esc(a.label)}</h3>
          <p>${esc(a.dosing)}</p>
          ${a.doseQuote ? `<details class="quote" open><summary>Exact abstract wording</summary><blockquote>“${esc(a.doseQuote)}”</blockquote></details>` : ""}
        </div>`).join("");
      return `<div class="dose-list">${blocks}</div><p class="note">A milligram dose is shown only when that sentence is in the PubMed abstract. If the abstract does not state the dose, do not use this page to prescribe.</p>`;
    }

    if (tab === "appraisal") {
      const list = (items) => `<ul>${(items || []).map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
      return `<div class="two-col">
          <div class="list-card"><h3>Why it is taught</h3>${list(t.strengths)}</div>
          <div class="list-card"><h3>Read with care</h3>${list(t.limitations)}</div>
        </div>
        ${t.implications ? `<div class="block"><p class="label">What it is used to teach</p><p class="question" style="font-size:20px;font-weight:560">${esc(t.implications)}</p></div>` : ""}
        <p class="note">Appraisal text is a teaching note. It is not a guideline statement.</p>`;
    }

    return `<ol class="refs">${(t.publications || []).map((p) => `<li>
      <b>${esc(p.label)}</b><br>${esc(p.author)} ${esc(p.title)} <i>${esc(p.journal)}</i> ${esc(p.year)}.
      <div class="links">
        ${p.pmid ? `<a href="${pubmed(p.pmid)}" target="_blank" rel="noopener">PubMed ${esc(p.pmid)} ↗</a>` : ""}
        ${p.doi ? `<a href="https://doi.org/${esc(p.doi)}" target="_blank" rel="noopener">DOI ↗</a>` : ""}
      </div></li>`).join("")}</ol>
      ${t.nct ? `<p class="note">Registered as <a href="https://clinicaltrials.gov/study/${esc(t.nct)}" target="_blank" rel="noopener">${esc(t.nct)} ↗</a></p>` : ""}`;
  }

  function renderTimeline(group) {
    const list = group ? DATA.trials.filter((t) => DISEASES[t.disease].group === group) : DATA.trials.slice();
    const years = {};
    list.forEach((t) => { (years[t.year] ||= []).push(t); });
    app.innerHTML = `<div class="wrap">
      <section class="hero" style="padding-bottom:8px"><p class="eyebrow">Timeline</p><h1>How the evidence grew.</h1>
        <p class="lead">Each card is placed in the year of the paper quoted on this site, from the earliest landmark to ${esc(Math.max(...DATA.trials.map((t) => t.year || 0)))}.</p></section>
      <div class="chips">
        <button class="chip" type="button" data-g="" aria-pressed="${!group}">All</button>
        ${Object.entries(GROUPS).map(([id, g]) => `<button class="chip" type="button" data-g="${id}" aria-pressed="${group === id}">${esc(g.name)}</button>`).join("")}
      </div>
      <div class="timeline">${Object.keys(years).sort().map((y) => `<div class="year"><h3 class="tabular">${y}</h3><div class="cards">${years[y].map(trialCard).join("")}</div></div>`).join("")}</div>
    </div>`;
    app.querySelectorAll("[data-g]").forEach((b) => b.addEventListener("click", () => renderTimeline(b.dataset.g)));
  }

  function renderDoses() {
    const rows = [];
    DATA.trials.forEach((t) => (t.arms || []).forEach((a) => {
      if (a.doseQuote) rows.push({ t, a });
    }));
    app.innerHTML = `<div class="wrap">
      <section class="hero" style="padding-bottom:12px"><p class="eyebrow">Drugs and doses</p><h1>Only doses the abstract states.</h1>
        <p class="lead">If a trial is missing here, its PubMed abstract did not print a milligram dose. Open the paper before using a dose.</p></section>
      <div class="dose-list">${rows.map(({ t, a }) => `
        <article class="dose-item">
          <p class="eyebrow">${esc(DISEASES[t.disease].short)} · ${esc(t.year)}</p>
          <h3><a href="#t-${t.slug}">${esc(t.acronym)}</a> — ${esc(a.label)}</h3>
          <p>${esc(a.dosing)}</p>
          <details class="quote"><summary>Exact abstract wording</summary><blockquote>“${esc(a.doseQuote)}”</blockquote></details>
        </article>`).join("")}</div>
    </div>`;
  }

  let cardIndex = 0, cardFlipped = false, cardDeck = null;
  function renderFlashcards() {
    if (!cardDeck) cardDeck = DATA.trials.filter((t) => t.outcomes.length).map((t) => t.slug);
    const t = DATA.trials.find((x) => x.slug === cardDeck[cardIndex]);
    const o = t.outcomes.find((x) => x.isPrimary) || t.outcomes[0];
    app.innerHTML = `<div class="wrap">
      <section class="hero" style="padding-bottom:0"><p class="eyebrow">Flashcards</p><h1>Recall the trial.</h1>
        <p class="lead">Say the question and the result, then tap the card. The result is the abstract sentence.</p></section>
      <div class="flash-wrap">
        <button class="flash bg-${t.disease}" type="button" id="flash">
          <span class="pill pill-neutral">${esc(DISEASES[t.disease].short)} · ${t.year}</span>
          <h2>${esc(t.acronym)}</h2>
          ${cardFlipped
            ? `<p><b>Question.</b> ${esc(t.question)}</p><p><b>${esc(ENDPOINT[o.endpoint] || o.endpoint)}.</b> ${esc(o.sourceQuote)}</p><p class="hint">PubMed ${esc(o.pmid)}</p>`
            : `<p class="hint">Tap to reveal the question and the abstract sentence</p>`}
        </button>
        <div class="flash-controls">
          <button class="btn" type="button" id="prev">Previous</button>
          <span class="counter tabular">${cardIndex + 1} / ${cardDeck.length}</span>
          <button class="btn" type="button" id="next">Next</button>
          <button class="btn" type="button" id="shuffle">Shuffle</button>
          <a class="btn" href="#t-${t.slug}">Open trial</a>
        </div>
      </div></div>`;
    document.getElementById("flash").onclick = () => { cardFlipped = !cardFlipped; renderFlashcards(); };
    document.getElementById("next").onclick = () => { cardIndex = (cardIndex + 1) % cardDeck.length; cardFlipped = false; renderFlashcards(); };
    document.getElementById("prev").onclick = () => { cardIndex = (cardIndex - 1 + cardDeck.length) % cardDeck.length; cardFlipped = false; renderFlashcards(); };
    document.getElementById("shuffle").onclick = () => { cardDeck.sort(() => Math.random() - 0.5); cardIndex = 0; cardFlipped = false; renderFlashcards(); };
  }

  function renderSaved() {
    const saved = getSaved().map((s) => DATA.trials.find((t) => t.slug === s)).filter(Boolean);
    app.innerHTML = `<div class="wrap">
      <section class="hero" style="padding-bottom:12px"><p class="eyebrow">This browser</p><h1>Saved trials.</h1>
        <p class="lead">Saved trials stay on this device only.</p></section>
      ${saved.length ? `<div class="cards">${saved.map(trialCard).join("")}</div>` : `<div class="empty-state"><h3>Nothing saved yet</h3><p>Open a trial and press “Save to my list”.</p></div>`}
    </div>`;
  }

  function renderNotFound() {
    app.innerHTML = `<div class="wrap"><div class="empty-state"><h3>Page not found</h3><p><a href="#">Back to the atlas</a></p></div></div>`;
  }

  const overlay = document.getElementById("search-overlay");
  const input = document.getElementById("search-input");
  const results = document.getElementById("search-results");
  function openSearch() { overlay.hidden = false; input.value = ""; runSearch(""); input.focus(); }
  function closeSearch() { overlay.hidden = true; }
  function runSearch(q) {
    q = q.trim().toLowerCase();
    if (q.length < 2) { results.innerHTML = `<li class="empty">Type at least two letters.</li>`; return; }
    const hits = DATA.trials.filter((t) => `${t.acronym} ${t.title} ${t.setting} ${(t.arms || []).map((a) => a.label).join(" ")} ${(t.biomarkers || []).map((b) => `${b} ${markerName(b)}`).join(" ")}`.toLowerCase().includes(q))
      .slice(0, 20)
      .map((t) => `<li><a href="#t-${t.slug}"><span>${esc(t.acronym)}</span><small>${esc(DISEASES[t.disease].short)} · ${t.year}</small></a></li>`)
      .join("");
    results.innerHTML = hits || `<li class="empty">No match. Try FLAURA, olaparib, or HER2.</li>`;
  }
  document.getElementById("open-search").addEventListener("click", openSearch);
  input.addEventListener("input", () => runSearch(input.value));
  overlay.addEventListener("click", (e) => { if (e.target === overlay || e.target.closest("a")) closeSearch(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSearch();
    if (e.key === "/" && overlay.hidden && document.activeElement.tagName !== "INPUT") { e.preventDefault(); openSearch(); }
  });
  app.addEventListener("click", (e) => { if (e.target.closest("[data-action='search']")) openSearch(); });

  function route() {
    closeSearch();
    const hash = decodeURIComponent(location.hash.slice(1));
    if (!hash) renderHome();
    else if (hash.startsWith("g-")) renderGroup(hash.slice(2));
    else if (DISEASES[hash]) renderDisease(hash);
    else if (hash.startsWith("t-")) renderTrial(hash.slice(2));
    else if (hash === "timeline") renderTimeline();
    else if (hash === "doses") renderDoses();
    else if (hash === "flashcards") renderFlashcards();
    else if (hash === "saved") renderSaved();
    else if (hash === "biomarkers") renderBiomarkers();
    else if (hash.startsWith("b-")) renderBiomarker(hash.slice(2));
    else if (hash === "guidelines") renderGuidelines();
    else renderNotFound();

    const section = hash.startsWith("t-")
      ? (DATA.trials.find((t) => t.slug === hash.slice(2)) && DISEASES[DATA.trials.find((t) => t.slug === hash.slice(2)).disease].group)
      : (DISEASES[hash] ? DISEASES[hash].group : hash.startsWith("b-") ? "biomarkers" : hash.replace(/^g-/, ""));
    document.querySelectorAll("[data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === section));
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  route();
})();
