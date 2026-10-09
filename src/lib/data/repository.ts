import { organById } from "@/lib/data/organs";
import { adverseEvents, analyses, pathways, publications, regimens, trials, updates } from "@/lib/data/seed";
import type { EndpointAnalysis, Trial } from "@/lib/types";
import { publicationLink } from "@/lib/utils";

export interface TrialFilters {
  query?: string;
  subtype?: string;
  histology?: string;
  stage?: string;
  biomarker?: string;
  setting?: string;
  line?: string;
  modality?: string;
  year?: string;
  phase?: string;
  endpoint?: string;
  result?: string;
}

export function allTrials() {
  return trials;
}

export function trialById(id: string) {
  return trials.find((trial) => trial.id === id);
}

export function publicationsFor(trialId: string) {
  return publications.filter((item) => item.trialId === trialId);
}

export function analysesFor(trialId: string) {
  return analyses.filter((item) => item.trialId === trialId);
}

export function regimensFor(trialId: string) {
  return regimens.filter((item) => item.trialId === trialId);
}

export function adverseEventsFor(trialId: string) {
  return adverseEvents.filter((item) => item.trialId === trialId);
}

export function publicationById(id: string) {
  return publications.find((item) => item.id === id);
}

export function analysisById(id: string) {
  return analyses.find((item) => item.id === id);
}

export function verifiedAnalyses() {
  return analyses.filter((item) => item.verificationStatus === "verified_peer_reviewed");
}

export function evidenceCorpus(trialId?: string): string {
  const trialRows = trialId ? trials.filter((trial) => trial.id === trialId) : trials;
  const ids = new Set(trialRows.map((trial) => trial.id));
  const chunks: string[] = [];
  for (const trial of trialRows) {
    chunks.push(
      trial.acronym,
      trial.fullName,
      String(trial.year),
      trial.journal,
      trial.sampleSize ?? "",
      trial.nct ?? "",
      trial.phase,
      trial.randomization ?? "",
      trial.pico.population,
      trial.pico.intervention,
      trial.pico.comparator,
      trial.pico.outcomes,
      trial.primaryEndpoint,
      trial.interpretation,
      trial.practiceStatement,
      trial.currentRelevance,
      ...trial.limitations,
      ...trial.highYieldPoints,
      ...trial.inclusion,
      ...trial.exclusion,
    );
  }
  for (const analysis of analyses) {
    if (trialId && analysis.trialId !== trialId) continue;
    if (analysis.verificationStatus !== "verified_peer_reviewed") continue;
    chunks.push(
      analysis.endpointDefinition,
      analysis.population,
      analysis.experimentalLabel,
      analysis.comparatorLabel,
      analysis.hr ?? "",
      analysis.ciLabel ?? "",
      analysis.pValue ?? "",
      analysis.medianExperimental ?? "",
      analysis.medianComparator ?? "",
      analysis.absoluteBenefit ?? "",
      analysis.significanceNote ?? "",
      analysis.cutoffDate ?? "",
    );
  }
  for (const regimen of regimens) {
    if (!ids.has(regimen.trialId)) continue;
    for (const drug of regimen.drugs) {
      if (drug.verificationStatus !== "verified_peer_reviewed") continue;
      chunks.push(drug.name, drug.dose ?? "", drug.schedule ?? "", drug.duration ?? "");
    }
  }
  for (const event of adverseEvents) {
    if (!ids.has(event.trialId) || event.verificationStatus !== "verified_peer_reviewed") continue;
    chunks.push(event.narrative, event.experimentalRate ?? "", event.comparatorRate ?? "", event.term);
  }
  for (const pathway of pathways) {
    if (trialId && pathway.organId !== trialRows[0]?.organId) continue;
    chunks.push(pathway.caption, ...pathway.nodes.map((node) => `${node.title} ${node.detail}`));
  }
  return chunks.filter(Boolean).join("\n");
}

export function filterTrials(filters: TrialFilters): Trial[] {
  const query = filters.query?.trim().toLowerCase();
  return trials.filter((trial) => {
    if (query) {
      const haystack = [trial.acronym, trial.fullName, trial.disease, trial.subtype, ...trial.biomarkers, trial.pico.population].join(" ").toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (filters.subtype && trial.subtype !== filters.subtype) return false;
    if (filters.histology && trial.histology !== filters.histology) return false;
    if (filters.stage && trial.stage !== filters.stage) return false;
    if (filters.biomarker && !trial.biomarkers.includes(filters.biomarker)) return false;
    if (filters.setting && trial.setting !== filters.setting) return false;
    if (filters.line && trial.lineOfTherapy !== filters.line) return false;
    if (filters.modality && trial.modality !== filters.modality) return false;
    if (filters.year && String(trial.year) !== filters.year) return false;
    if (filters.phase && trial.phase !== filters.phase) return false;
    if (filters.endpoint && !trial.primaryEndpoint.toLowerCase().includes(filters.endpoint.toLowerCase())) return false;
    if (filters.result) {
      if (!trial.resultVerified || trial.resultClass !== filters.result) return false;
    }
    return true;
  });
}

export function uniqueValues(organId: string | undefined, pick: (trial: Trial) => string | string[]) {
  const rows = trials.filter((trial) => !organId || trial.organId === organId);
  const values = new Set<string>();
  for (const trial of rows) {
    const value = pick(trial);
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item && item !== "Verification pending") values.add(item);
    }
  }
  return [...values].sort();
}

export interface TimelineEvent {
  id: string;
  trialId: string;
  date: string;
  year: number;
  title: string;
  analysis: EndpointAnalysis | null;
  pending: boolean;
}

export function timelineEvents(): TimelineEvent[] {
  const events: TimelineEvent[] = analyses.map((analysis) => {
    const trial = trialById(analysis.trialId);
    const publication = publicationById(analysis.publicationId);
    return {
      id: analysis.id,
      trialId: analysis.trialId,
      date: analysis.cutoffDate ?? `${publication?.year ?? trial?.year ?? 0}-01-01`,
      year: publication?.year ?? trial?.year ?? 0,
      title: trial?.acronym ?? analysis.trialId,
      analysis,
      pending: analysis.verificationStatus !== "verified_peer_reviewed",
    };
  });
  return events.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

export function searchAtlas(query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return { trials: [], organs: [], analyses: [] };
  return {
    trials: trials.filter((trial) =>
      [trial.acronym, trial.fullName, trial.pico.population, trial.nct ?? ""].join(" ").toLowerCase().includes(needle),
    ),
    organs: [],
    analyses: verifiedAnalyses().filter((analysis) =>
      [analysis.endpoint, analysis.population, analysis.hr ?? ""].join(" ").toLowerCase().includes(needle),
    ),
  };
}

export function linkForPublication(publicationId: string) {
  const publication = publicationById(publicationId);
  if (!publication) return null;
  return publicationLink(publication.doi, publication.pmid, publication.url);
}

export function organName(organId: string) {
  return organById(organId)?.name ?? organId;
}

export { adverseEvents, analyses, pathways, publications, regimens, trials, updates };
