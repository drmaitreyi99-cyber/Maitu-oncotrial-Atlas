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
    gu: { name: "Genitourinary", organs: ["prostate", "rcc", "urothelial"] },
    head: { name: "Head, neck and skin", organs: ["head-neck", "melanoma"] },
    rare: { name: "Sarcoma, CNS and NET", organs: ["sarcoma", "gist", "glioma", "net"] },
    heme: { name: "Haematologic", organs: ["dlbcl", "hodgkin", "myeloma", "aml", "all-skip", "cml", "cll"] },
  };
  GROUPS.heme.organs = ["dlbcl", "hodgkin", "myeloma", "aml", "cml", "cll"];

  const DISEASES = {
    breast: { name: "Breast cancer", short: "Breast", group: "breast", blurb: "HER2-positive, hormone-receptor-positive, and triple-negative disease, in early and metastatic settings." },
    nsclc: { name: "Non-small-cell lung cancer", short: "NSCLC", group: "thoracic", blurb: "Driver-oncogene therapy, immunotherapy, and stage III consolidation." },
    sclc: { name: "Small-cell lung cancer", short: "SCLC", group: "thoracic", blurb: "First-line chemo-immunotherapy for extensive-stage disease." },
    esophageal: { name: "Esophageal and GEJ cancer", short: "Esophagus", group: "gi", blurb: "Preoperative chemoradiotherapy and adjuvant immunotherapy after resection." },
    gastric: { name: "Gastric and GEJ adenocarcinoma", short: "Gastric", group: "gi", blurb: "Perioperative chemotherapy and first-line therapy for advanced disease." },
    colorectal: { name: "Colorectal cancer", short: "Colorectal", group: "gi", blurb: "Adjuvant oxaliplatin and biomarker-selected therapy for advanced disease." },
    pancreatic: { name: "Pancreatic cancer", short: "Pancreas", group: "gi", blurb: "Adjuvant combination chemotherapy and maintenance therapy." },
    hcc: { name: "Hepatocellular carcinoma", short: "HCC", group: "gi", blurb: "First-line immunotherapy combinations for unresectable disease." },
    biliary: { name: "Biliary tract cancer", short: "Biliary", group: "gi", blurb: "Gemcitabine plus cisplatin as the reference cytotoxic comparison." },
    ovarian: { name: "Ovarian cancer", short: "Ovary", group: "gyn", blurb: "First-line maintenance after platinum response." },
    cervical: { name: "Cervical cancer", short: "Cervix", group: "gyn", blurb: "Locally advanced chemoradiotherapy and persistent or metastatic disease." },
    endometrial: { name: "Endometrial cancer", short: "Endometrium", group: "gyn", blurb: "Immunotherapy added to chemotherapy in primary advanced or recurrent disease." },
    prostate: { name: "Prostate cancer", short: "Prostate", group: "gu", blurb: "Hormone-sensitive intensification and castration-resistant therapy." },
    rcc: { name: "Renal cell carcinoma", short: "Kidney", group: "gu", blurb: "First-line immunotherapy combinations for advanced clear-cell disease." },
    urothelial: { name: "Urothelial carcinoma", short: "Urothelial", group: "gu", blurb: "Maintenance therapy and first-line antibody-drug conjugate combinations." },
    "head-neck": { name: "Head and neck cancer", short: "Head & neck", group: "head", blurb: "First-line treatment of recurrent or metastatic squamous-cell carcinoma." },
    melanoma: { name: "Melanoma", short: "Melanoma", group: "head", blurb: "Dual checkpoint blockade and adjuvant immunotherapy." },
    sarcoma: { name: "Soft-tissue sarcoma", short: "Sarcoma", group: "rare", blurb: "Pazopanib after prior chemotherapy for non-adipocytic sarcoma." },
    gist: { name: "Gastrointestinal stromal tumour", short: "GIST", group: "rare", blurb: "Imatinib for advanced GIST." },
    glioma: { name: "Glioblastoma", short: "Glioma", group: "rare", blurb: "Radiotherapy with concomitant and adjuvant temozolomide." },
    net: { name: "Neuroendocrine tumours", short: "NET", group: "rare", blurb: "Somatostatin analogues and peptide receptor radionuclide therapy." },
    dlbcl: { name: "Diffuse large B-cell lymphoma", short: "DLBCL", group: "heme", blurb: "Rituximab added to CHOP." },
    hodgkin: { name: "Hodgkin lymphoma", short: "Hodgkin", group: "heme", blurb: "Brentuximab vedotin with chemotherapy in advanced-stage disease." },
    myeloma: { name: "Multiple myeloma", short: "Myeloma", group: "heme", blurb: "Daratumumab with lenalidomide and dexamethasone." },
    aml: { name: "Acute myeloid leukaemia", short: "AML", group: "heme", blurb: "Midostaurin added to chemotherapy for FLT3-mutated AML." },
    cml: { name: "Chronic myeloid leukaemia", short: "CML", group: "heme", blurb: "Imatinib compared with interferon for newly diagnosed chronic-phase CML." },
    cll: { name: "Chronic lymphocytic leukaemia", short: "CLL", group: "heme", blurb: "Venetoclax with obinutuzumab in patients with coexisting conditions." },
  };

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
    early: "Early", "locally-advanced": "Locally advanced", metastatic: "Metastatic",
    resectable: "Resectable", resected: "After resection", extensive: "Extensive stage",
    advanced: "Advanced", any: "Any stage",
  };

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
  function phaseLabel(p) { return p === "III" || p === "II" || p === "II/III" ? `Phase ${p}` : p; }

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
          <button class="btn" type="button" data-action="search">Search a trial</button>
        </div>
        <div class="stats tabular">
          <div><b>${DATA.trials.length}</b>trials</div>
          <div><b>${outcomes}</b>quoted results</div>
          <div><b>${Object.keys(DISEASES).length}</b>cancers</div>
        </div>
      </section>
      ${Object.entries(GROUPS).map(([id, g]) => `
        <section class="section" id="home-${id}">
          <div class="section-head"><h2>${esc(g.name)}</h2><p>Open a cancer, then filter by stage.</p></div>
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

  function renderDisease(slug, filter) {
    const d = DISEASES[slug];
    if (!d) return renderNotFound();
    const all = trialsFor(slug);
    const stages = [...new Set(all.flatMap((t) => t.stages || []))];
    const shown = filter ? all.filter((t) => (t.stages || []).includes(filter)) : all;
    app.innerHTML = `<div class="wrap">
      <a class="back" href="#g-${d.group}">‹ ${esc(GROUPS[d.group].name)}</a>
      <section class="disease-hero bg-${slug}">
        <p class="eyebrow ink-${slug}">${all.length} trial${all.length === 1 ? "" : "s"}</p>
        <h1>${esc(d.name)}</h1>
        <p>${esc(d.blurb)}</p>
      </section>
      <div class="chips" role="group" aria-label="Filter by stage">
        <button class="chip" type="button" data-filter="" aria-pressed="${!filter}">All stages</button>
        ${stages.map((s) => `<button class="chip" type="button" data-filter="${esc(s)}" aria-pressed="${filter === s}">${esc(STAGE[s] || s)}</button>`).join("")}
      </div>
      ${shown.length ? `<div class="cards">${shown.map(trialCard).join("")}</div>` : `<div class="empty-state"><h3>No trials for this stage yet</h3><p>Choose another stage. This library is a curated set, not every published trial.</p></div>`}
    </div>`;
    app.querySelectorAll("[data-filter]").forEach((b) => b.addEventListener("click", () => renderDisease(slug, b.dataset.filter)));
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

  function renderTimeline(disease) {
    const list = disease ? trialsFor(disease) : DATA.trials.slice();
    const years = {};
    list.forEach((t) => { (years[t.year] ||= []).push(t); });
    app.innerHTML = `<div class="wrap">
      <section class="hero" style="padding-bottom:8px"><p class="eyebrow">Timeline</p><h1>How the evidence grew.</h1>
        <p class="lead">Each card is placed in the year of the paper quoted on this site.</p></section>
      <div class="chips">
        <button class="chip" type="button" data-d="" aria-pressed="${!disease}">All</button>
        ${Object.entries(GROUPS).map(([id, g]) => `<button class="chip" type="button" data-g="${id}">${esc(g.name)}</button>`).join("")}
      </div>
      <div class="timeline">${Object.keys(years).sort().map((y) => `<div class="year"><h3 class="tabular">${y}</h3><div class="cards">${years[y].map(trialCard).join("")}</div></div>`).join("")}</div>
    </div>`;
    app.querySelectorAll("[data-d]").forEach((b) => b.addEventListener("click", () => renderTimeline("")));
    app.querySelectorAll("[data-g]").forEach((b) => b.addEventListener("click", () => renderGroup(b.dataset.g)));
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
    const hits = DATA.trials.filter((t) => `${t.acronym} ${t.title} ${t.setting} ${(t.arms || []).map((a) => a.label).join(" ")} ${(t.biomarkers || []).join(" ")}`.toLowerCase().includes(q))
      .slice(0, 12)
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
    else renderNotFound();

    const section = hash.startsWith("t-")
      ? (DATA.trials.find((t) => t.slug === hash.slice(2)) && DISEASES[DATA.trials.find((t) => t.slug === hash.slice(2)).disease].group)
      : (DISEASES[hash] ? DISEASES[hash].group : hash.replace(/^g-/, ""));
    document.querySelectorAll("[data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === section));
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  route();
})();
