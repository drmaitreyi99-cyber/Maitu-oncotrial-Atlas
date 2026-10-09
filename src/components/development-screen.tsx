"use client";

import { useEffect, useMemo, useState } from "react";
import { Field, SelectInput } from "@/components/ui";
import { organs } from "@/lib/data/organs";
import { organName, trials } from "@/lib/data/repository";

interface StaticHit {
  source: "pubmed" | "clinicaltrials" | "crossref";
  title: string;
  year: number | null;
  doi: string | null;
  pmid: string | null;
  nct: string | null;
  url: string | null;
  suggestedOrganId: string | null;
  diseaseSubtype: string | null;
  stage: string | null;
  biomarkers: string[];
  treatmentSetting: string | null;
  lineOfTherapy: string | null;
  discoveredAt: string;
  extractedEfficacy: null;
}

interface DiscoveryFile {
  generatedAt: string | null;
  hits: StaticHit[];
  failures: string[];
  note: string;
}

export function DevelopmentScreen() {
  const [data, setData] = useState<DiscoveryFile | null>(null);
  const [organ, setOrgan] = useState("all");
  const [stage, setStage] = useState("all");
  const [biomarker, setBiomarker] = useState("all");

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    fetch(`${base}/data/discovery.json`)
      .then((response) => response.json())
      .then((payload: DiscoveryFile) => setData(payload))
      .catch(() => setData({ generatedAt: null, hits: [], failures: ["Static discovery file unavailable"], note: "No result was invented." }));
  }, []);

  const hits = useMemo(() => data?.hits ?? [], [data]);
  const stages = [...new Set(hits.map((hit) => hit.stage).filter((value): value is string => Boolean(value)))].sort();
  const biomarkers = [...new Set(hits.flatMap((hit) => hit.biomarkers ?? []))].sort();
  const visible = hits.filter((hit) =>
    (organ === "all" || hit.suggestedOrganId === organ) &&
    (stage === "all" || hit.stage === stage) &&
    (biomarker === "all" || hit.biomarkers?.includes(biomarker)));
  const grouped = organs.map((item) => ({
    organ: item,
    curated: trials.filter((trial) => trial.organId === item.id && !trial.placeholder).length,
    discovered: visible.filter((hit) => hit.suggestedOrganId === item.id).length,
  })).filter((row) => row.curated || row.discovered);

  return (
    <div>
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">Development</p>
        <h1 className="font-display text-4xl">Organ, stage, and biomarker evidence map</h1>
        <p className="mt-2 max-w-3xl text-muted">
          GitHub Actions refreshes citation and registry metadata daily. Every candidate still requires medical review before numerical efficacy is added.
        </p>
      </header>
      <section className="card mb-4 grid gap-3 p-4 md:grid-cols-3">
        <Field label="Organ">
          <SelectInput value={organ} onChange={(event) => setOrgan(event.target.value)}>
            <option value="all">All organs</option>
            {organs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </SelectInput>
        </Field>
        <Field label="Stage / setting">
          <SelectInput value={stage} onChange={(event) => setStage(event.target.value)}>
            <option value="all">All stages</option>{stages.map((item) => <option key={item}>{item}</option>)}
          </SelectInput>
        </Field>
        <Field label="Biomarker">
          <SelectInput value={biomarker} onChange={(event) => setBiomarker(event.target.value)}>
            <option value="all">All biomarkers</option>{biomarkers.map((item) => <option key={item}>{item}</option>)}
          </SelectInput>
        </Field>
      </section>
      <p className="mb-4 text-sm text-muted">
        {data?.generatedAt ? `Last automated scan: ${new Date(data.generatedAt).toLocaleString()}. ` : "No automated scan has been deployed yet. "}
        {visible.length} metadata candidates shown. Extracted efficacy: none.
      </p>
      <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {grouped.map((row) => (
          <section key={row.organ.id} className="card p-4">
            <h2 className="font-display text-xl">{row.organ.name}</h2>
            <p className="text-sm">{row.curated} curated trials · {row.discovered} discovery candidates</p>
          </section>
        ))}
      </div>
      <div className="grid gap-3">
        {visible.map((hit) => (
          <article key={hit.nct || hit.pmid || hit.doi || hit.title} className="card p-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <span className="chip pending">Medical review required</span>
              <span className="chip">{hit.source}</span>
              <span className="chip">{hit.suggestedOrganId ? organName(hit.suggestedOrganId) : "Organ unclassified"}</span>
            </div>
            <h3 className="mt-2 font-semibold">{hit.title}</h3>
            <p className="mt-1 text-muted">
              Stage: {hit.stage ?? "Unclassified"} · Subtype: {hit.diseaseSubtype ?? "Unclassified"} ·
              Biomarkers: {hit.biomarkers?.join(", ") || "None detected"} ·
              Setting: {hit.treatmentSetting ?? "Unclassified"} · Line: {hit.lineOfTherapy ?? "Unclassified"}
            </p>
            <p className="mt-2"><strong>Efficacy:</strong> Verification pending. No numerical result was extracted.</p>
            {hit.url && <a className="mt-2 inline-block underline" href={hit.url} target="_blank" rel="noreferrer">Open source metadata</a>}
          </article>
        ))}
      </div>
    </div>
  );
}
