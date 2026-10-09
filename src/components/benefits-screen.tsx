"use client";

import Link from "next/link";
import { useState } from "react";
import { Field, SelectInput } from "@/components/ui";
import { organs } from "@/lib/data/organs";
import { organName, trials, verifiedAnalyses } from "@/lib/data/repository";
import { benefitSummary } from "@/lib/evidence/benefits";

export function BenefitsScreen() {
  const [organ, setOrgan] = useState("all");
  const [endpoint, setEndpoint] = useState("all");
  const endpoints = [...new Set(verifiedAnalyses().map((analysis) => analysis.endpoint))].sort();
  const rows = verifiedAnalyses()
    .map((analysis) => ({
      analysis,
      trial: trials.find((trial) => trial.id === analysis.trialId),
      benefit: benefitSummary(analysis),
    }))
    .filter(({ analysis, trial }) =>
      trial && (organ === "all" || trial.organId === organ) &&
      (endpoint === "all" || analysis.endpoint === endpoint));

  return (
    <div>
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">Benefits</p>
        <h1 className="font-display text-4xl">Benefits in months and absolute differences</h1>
        <p className="mt-2 max-w-3xl text-muted">
          Every verified analysis is separate. A median difference is descriptive subtraction—not an individual patient&apos;s expected survival gain.
        </p>
      </header>
      <div className="card mb-4 grid gap-3 p-4 md:grid-cols-2">
        <Field label="Organ system">
          <SelectInput value={organ} onChange={(event) => setOrgan(event.target.value)}>
            <option value="all">All organs</option>
            {organs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </SelectInput>
        </Field>
        <Field label="Endpoint">
          <SelectInput value={endpoint} onChange={(event) => setEndpoint(event.target.value)}>
            <option value="all">All endpoints</option>
            {endpoints.map((item) => <option key={item}>{item}</option>)}
          </SelectInput>
        </Field>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="p-2">Organ / trial</th><th>Analysis</th><th>Endpoint</th>
              <th>Reported values</th><th>Month / absolute difference</th><th>HR and interval</th><th>Cutoff</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ analysis, trial, benefit }) => trial && (
              <tr key={analysis.id} className="border-b border-line align-top">
                <td className="p-2">
                  <Link className="font-semibold underline" href={`/trials/${trial.id}`}>
                    {organName(trial.organId)} · {trial.acronym}
                  </Link>
                </td>
                <td className="p-2">{analysis.analysisType}<p className="text-xs text-muted">{analysis.population}</p></td>
                <td className="p-2">{analysis.endpoint}</td>
                <td className="p-2">{analysis.medianExperimental ?? "—"} vs {analysis.medianComparator ?? "—"}</td>
                <td className="p-2"><strong>{benefit.display}</strong><p className="max-w-xs text-xs text-muted">{benefit.caveat}</p></td>
                <td className="p-2">{analysis.hr ? `${analysis.hr}; ${analysis.ciLabel ?? ""}` : "Not reported"}</td>
                <td className="p-2">{analysis.cutoffDate ?? "Not stated in seed"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
