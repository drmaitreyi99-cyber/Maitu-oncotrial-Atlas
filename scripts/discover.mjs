import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const outputPath = resolve("public/data/discovery.json");
const days = Math.max(1, Math.min(90, Number(process.env.DISCOVERY_DAYS || 14)));
const now = new Date();
const from = new Date(now);
from.setUTCDate(from.getUTCDate() - days);

const ORGAN_KEYWORDS = [
  ["breast", ["breast"]],
  ["lung", ["lung", "nsclc", "sclc"]],
  ["esophageal", ["esophageal", "oesophageal"]],
  ["gastric", ["gastric", "gastroesophageal", "gastro-oesophageal", "gej"]],
  ["colorectal", ["colorectal", "colon cancer", "rectal cancer"]],
  ["pancreatic", ["pancreatic"]],
  ["biliary", ["biliary", "cholangiocarcinoma", "gallbladder"]],
  ["hcc", ["hepatocellular", " hcc"]],
  ["ovarian", ["ovarian"]],
  ["endometrial", ["endometrial", "endometrium"]],
  ["cervical", ["cervical", "cervix"]],
  ["rcc", ["renal cell", "kidney cancer"]],
  ["prostate", ["prostate"]],
  ["urothelial", ["urothelial", "bladder cancer"]],
  ["testicular", ["testicular", "germ cell tumor"]],
  ["head-neck", ["head and neck", "hnscc"]],
  ["thyroid", ["thyroid"]],
  ["melanoma", ["melanoma"]],
  ["sarcoma", ["sarcoma"]],
  ["cns", ["glioma", "glioblastoma"]],
  ["net", ["neuroendocrine tumor", "neuroendocrine neoplasm"]],
  ["myeloma", ["multiple myeloma", "plasma cell myeloma"]],
  ["hodgkin", ["hodgkin lymphoma"]],
  ["nhl", ["non-hodgkin", "diffuse large b-cell", "follicular lymphoma", "mantle cell lymphoma"]],
  ["aml", ["acute myeloid leukemia", " aml"]],
  ["all", ["acute lymphoblastic leukemia", "acute lymphocytic leukemia"]],
  ["cml", ["chronic myeloid leukemia", " cml"]],
  ["cll", ["chronic lymphocytic leukemia", " cll"]],
  ["mds-mpn", ["myelodysplastic", "myeloproliferative", " mds", " mpn"]],
];

const BIOMARKERS = [
  "EGFR", "ALK", "ROS1", "BRAF", "KRAS", "HER2", "ER", "PR", "PD-L1", "CPS",
  "BRCA1", "BRCA2", "HRD", "MSI-H", "dMMR", "pMMR", "NTRK", "RET", "MET",
  "FGFR", "IDH", "FLT3", "NPM1", "BCR-ABL", "CD19", "BCMA", "CLDN18.2",
];

function classify(title) {
  const lower = title.toLowerCase();
  const organ = ORGAN_KEYWORDS.find(([, words]) => words.some((word) => lower.includes(word)))?.[0] ?? null;
  const stage = /\b(neoadjuvant|preoperative)\b/.test(lower)
    ? "Neoadjuvant"
    : /\b(adjuvant|postoperative|resected)\b/.test(lower)
      ? "Adjuvant / resected"
      : /\b(stage i|stage ii|stage iii|early[- ]stage|localized|locally advanced)\b/.test(lower)
        ? "Localized / locally advanced"
        : /\b(stage iv|metastatic|advanced|unresectable|recurrent)\b/.test(lower)
          ? "Advanced / metastatic"
          : null;
  const setting = lower.includes("maintenance") ? "Maintenance"
    : lower.includes("neoadjuvant") ? "Neoadjuvant"
      : lower.includes("adjuvant") ? "Adjuvant"
        : lower.includes("consolidation") ? "Consolidation"
          : lower.includes("salvage") ? "Salvage" : null;
  const line = /\b(first[- ]line|1l|previously untreated)\b/.test(lower) ? "First-line"
    : /\b(second[- ]line|2l)\b/.test(lower) ? "Second-line"
      : /\b(third[- ]line|3l|later[- ]line|heavily pretreated)\b/.test(lower)
        ? "Third-line or later" : null;
  const subtypes = [
    "triple-negative", "her2-positive", "hr-positive", "non-small-cell lung cancer",
    "small-cell lung cancer", "squamous", "nonsquamous", "high-grade serous",
    "clear cell", "castration-resistant", "hormone-sensitive",
  ];
  return {
    suggestedOrganId: organ,
    suggestionBasis: "keyword_only",
    diseaseSubtype: subtypes.find((term) => lower.includes(term)) ?? null,
    stage,
    biomarkers: BIOMARKERS.filter((marker) =>
      new RegExp(`(^|[^a-z0-9])${marker.replace(".", "\\.")}([^a-z0-9]|$)`, "i").test(title)),
    treatmentSetting: setting,
    lineOfTherapy: line,
  };
}

function hit(input) {
  return {
    ...input,
    verificationStatus: "verification_pending",
    extractedEfficacy: null,
    ...classify(input.title),
    publicationStatus: "metadata_only",
    discoveredAt: now.toISOString(),
  };
}

function dedupe(hits) {
  const output = [];
  for (const candidate of hits) {
    const keys = [candidate.nct, candidate.pmid, candidate.doi].filter(Boolean).map((value) => value.toLowerCase());
    const duplicate = output.some((existing) => {
      const existingKeys = [existing.nct, existing.pmid, existing.doi].filter(Boolean).map((value) => value.toLowerCase());
      return keys.some((key) => existingKeys.includes(key)) ||
        (!keys.length && !existingKeys.length && candidate.title.toLowerCase() === existing.title.toLowerCase());
    });
    if (!duplicate) output.push(candidate);
  }
  return output;
}

async function pubmed() {
  const email = process.env.NCBI_EMAIL || "demo@maitu.local";
  const tool = process.env.NCBI_TOOL || "maitu_oncotrial_atlas";
  const query = `(cancer OR carcinoma OR lymphoma OR leukemia OR myeloma OR melanoma OR sarcoma) AND (trial OR randomized OR "phase 3") AND ("last ${days} days"[dp])`;
  const search = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=100&sort=pub+date&term=${encodeURIComponent(query)}&tool=${tool}&email=${email}`);
  if (!search.ok) throw new Error(`PubMed search ${search.status}`);
  const ids = (await search.json())?.esearchresult?.idlist ?? [];
  if (!ids.length) return [];
  const summary = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}&tool=${tool}&email=${email}`);
  if (!summary.ok) throw new Error(`PubMed summary ${summary.status}`);
  const body = await summary.json();
  return ids.map((id) => {
    const item = body?.result?.[id];
    const rawDoi = typeof item?.elocationid === "string" ? item.elocationid : "";
    return hit({
      source: "pubmed",
      title: item?.title ?? "Untitled PubMed record",
      year: Number(String(item?.pubdate ?? "").slice(0, 4)) || null,
      doi: rawDoi.replace(/^doi:\s*/i, "").replace(/\s*\[doi\]\s*$/i, "") || null,
      pmid: id,
      nct: null,
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
    });
  });
}

async function crossref() {
  const query = "oncology randomized phase III trial cancer";
  const response = await fetch(`https://api.crossref.org/works?query.title=${encodeURIComponent(query)}&filter=from-pub-date:${from.toISOString().slice(0, 10)},type:journal-article&sort=published&order=desc&rows=100`, {
    headers: { "User-Agent": "MaituOncoTrialAtlas/1.0 (mailto:demo@maitu.local)" },
  });
  if (!response.ok) throw new Error(`Crossref ${response.status}`);
  return ((await response.json())?.message?.items ?? []).map((item) => hit({
    source: "crossref",
    title: item.title?.[0] ?? "Untitled Crossref record",
    year: item.issued?.["date-parts"]?.[0]?.[0] ?? null,
    doi: item.DOI ?? null,
    pmid: null,
    nct: null,
    url: item.URL ?? (item.DOI ? `https://doi.org/${item.DOI}` : null),
  }));
}

async function clinicalTrials() {
  const range = `AREA[LastUpdatePostDate]RANGE[${from.toISOString().slice(0, 10)}, MAX]`;
  const response = await fetch(`https://clinicaltrials.gov/api/v2/studies?query.cond=${encodeURIComponent("cancer OR neoplasm OR leukemia OR lymphoma")}&query.term=${encodeURIComponent(range)}&pageSize=100&sort=LastUpdatePostDate:desc`);
  if (!response.ok) throw new Error(`ClinicalTrials.gov ${response.status}`);
  return ((await response.json())?.studies ?? []).map((study) => {
    const identity = study.protocolSection?.identificationModule;
    const date = study.protocolSection?.statusModule?.studyFirstPostDateStruct?.date;
    return hit({
      source: "clinicaltrials",
      title: identity?.briefTitle || identity?.officialTitle || "Untitled registry study",
      year: date ? Number(date.slice(0, 4)) : null,
      doi: null,
      pmid: null,
      nct: identity?.nctId ?? null,
      url: identity?.nctId ? `https://clinicaltrials.gov/study/${identity.nctId}` : null,
    });
  });
}

async function previousData() {
  try {
    return JSON.parse(await readFile(outputPath, "utf8"));
  } catch {
    return { generatedAt: null, hits: [], sources: {}, failures: [] };
  }
}

const searches = await Promise.allSettled([pubmed(), crossref(), clinicalTrials()]);
const sourceNames = ["PubMed", "Crossref", "ClinicalTrials.gov"];
const prior = await previousData();
const failures = [];
const sources = {};
const fresh = [];
searches.forEach((result, index) => {
  if (result.status === "fulfilled") {
    sources[sourceNames[index]] = result.value.length;
    fresh.push(...result.value);
  } else {
    sources[sourceNames[index]] = 0;
    failures.push(`${sourceNames[index]}: ${result.reason?.message ?? "failed"}`);
  }
});

const allFailed = searches.every((result) => result.status === "rejected");
const payload = allFailed
  ? { ...prior, failures, retainedPreviousData: true }
  : {
      generatedAt: now.toISOString(),
      lookbackDays: days,
      hits: dedupe([...fresh, ...(prior.hits ?? [])]).slice(0, 1000),
      sources,
      failures,
      reviewRequired: true,
      extractedEfficacy: null,
      note: "Metadata-only discovery generated by GitHub Actions. Medical review is required.",
    };

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Wrote ${payload.hits?.length ?? 0} discovery candidates to ${outputPath}`);
