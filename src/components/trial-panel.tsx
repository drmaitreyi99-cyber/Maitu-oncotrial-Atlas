"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";
import { useAtlas } from "@/components/providers";
import { Button } from "@/components/ui";
import { adverseEventsFor, analysesFor, linkForPublication, publicationById, publicationsFor, regimensFor } from "@/lib/data/repository";
import { APPROVAL_NOTE, CLINICAL_NOTICE, EXAM_NOTICE } from "@/lib/evidence";
import { benefitSummary } from "@/lib/evidence/benefits";
import { questionsForTrial, buildViva } from "@/lib/learning/generate";
import { vancouver } from "@/lib/learning/citations";
import type { Trial } from "@/lib/types";
import { displayStat, statusLabel } from "@/lib/utils";

export function TrialPanel({ trial }: { trial: Trial }) {
  const { bookmarks, toggleBookmark } = useAtlas();
  const analyses = analysesFor(trial.id);
  const publications = publicationsFor(trial.id);
  const regimens = regimensFor(trial.id);
  const events = adverseEventsFor(trial.id);
  const questions = questionsForTrial(trial.id, 5);
  const viva = buildViva().filter((item) => item.trialId === trial.id).slice(0, 5);
  const saved = bookmarks.includes(trial.id);

  return (
    <article className="grid gap-5">
      <header className="card rise p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Trial card</p>
            <h1 className="font-display text-4xl">{trial.acronym}</h1>
            <p className="mt-2 max-w-3xl text-lg text-muted">{trial.fullName}</p>
          </div>
          <Button variant="soft" onClick={() => toggleBookmark(trial.id)} aria-pressed={saved}>
            <Bookmark size={16} /> {saved ? "Bookmarked" : "Bookmark"}
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="chip">{trial.year}</span>
          <span className="chip">{trial.journal}</span>
          <span className="chip">{trial.phase}</span>
          <span className={trial.placeholder || !trial.resultVerified ? "chip pending" : "chip verified"}>
            {trial.placeholder || !trial.resultVerified ? "Verification pending" : "Peer-reviewed figures"}
          </span>
        </div>
        <p className="mt-4 text-sm text-muted">{CLINICAL_NOTICE}</p>
      </header>

      <section className="card p-6">
        <h2 className="font-display text-2xl">Identity and design</h2>
        <dl className="mt-4 grid gap-3 md:grid-cols-2">
          <Item term="NCT" value={trial.nct ?? "Verification pending"} />
          <Item term="Design" value={trial.design} />
          <Item term="Sample size" value={trial.sampleSize ?? "Verification pending"} />
          <Item term="Randomization" value={trial.randomization ?? "Verification pending"} />
          <Item term="Subtype" value={trial.subtype} />
          <Item term="Histology" value={trial.histology} />
          <Item term="Stage" value={trial.stage} />
          <Item term="Biomarkers" value={trial.biomarkers.join(", ")} />
          <Item term="Setting" value={trial.setting} />
          <Item term="Line of therapy" value={trial.lineOfTherapy} />
          <Item term="Modality" value={trial.modality} />
          <Item term="Result class" value={trial.resultVerified ? trial.resultClass : "Verification pending"} />
        </dl>
      </section>

      <section className="card p-6" id="pico">
        <h2 className="font-display text-2xl">PICO</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {Object.entries(trial.pico).map(([key, value]) => (
            <div key={key} className="rounded-2xl bg-lavender p-4">
              <p className="text-xs font-bold uppercase tracking-wider">{key}</p>
              <p className="mt-2 text-sm">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card grid gap-4 p-6 md:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl">Inclusion</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{trial.inclusion.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <div>
          <h2 className="font-display text-2xl">Exclusion</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{trial.exclusion.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-display text-2xl">Regimens and doses</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {regimens.map((regimen) => (
            <div key={regimen.id} className="rounded-2xl border border-line p-4">
              <p className="font-semibold">{regimen.armName}</p>
              <ul className="mt-3 space-y-3 text-sm">
                {regimen.drugs.map((drug) => (
                  <li key={drug.name}>
                    <span className="font-semibold">{drug.name}.</span>{" "}
                    {displayStat(drug.verificationStatus, drug.dose)}{" "}
                    {drug.schedule ? `· ${drug.schedule}` : ""}{" "}
                    {drug.duration ? `· ${drug.duration}` : ""}
                    <span className="ml-2 chip">{statusLabel(drug.verificationStatus)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">Protocol source: {publicationById(regimen.sourcePublicationId)?.title}</p>
            </div>
          ))}
          {regimens.length === 0 && <p>Verification pending. No regimen is stored for this placeholder.</p>}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-display text-2xl">Endpoints</h2>
        <p className="mt-2 text-sm"><strong>Primary. </strong>{trial.primaryEndpoint}</p>
        <p className="mt-2 text-sm"><strong>Secondary. </strong>{trial.secondaryEndpoints.join("; ")}</p>
      </section>

      <section className="card p-6">
        <h2 className="font-display text-2xl">Analyses</h2>
        <p className="mt-2 text-sm text-muted">Primary and updated analyses are separate rows. A later paper never overwrites the first result.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="py-2">Analysis</th><th>Endpoint</th><th>Cutoff</th><th>Result</th><th>Month / absolute difference</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {analyses.map((analysis) => {
                const benefit = benefitSummary(analysis);
                return <tr key={analysis.id} className="border-b border-line align-top">
                  <td className="py-3 pr-3">
                    <p className="font-semibold">{analysis.analysisType}</p>
                    <p className="text-xs text-muted">{analysis.population}</p>
                  </td>
                  <td className="pr-3">{analysis.endpoint}<p className="text-xs text-muted">{analysis.endpointDefinition}</p></td>
                  <td>{analysis.cutoffDate ?? "Not stated in this seed"}</td>
                  <td>
                    {analysis.verificationStatus === "verified_peer_reviewed" ? (
                      <>
                        <p>{analysis.medianExperimental ?? "—"} vs {analysis.medianComparator ?? "—"}</p>
                        <p>HR {analysis.hr ?? "—"} {analysis.ciLabel ?? ""}</p>
                        <p>{analysis.pValue ?? ""} {analysis.absoluteBenefit ? `· ${analysis.absoluteBenefit}` : ""}</p>
                        {analysis.significanceNote && <p className="text-xs text-muted">{analysis.significanceNote}</p>}
                      </>
                    ) : "Verification pending"}
                  </td>
                  <td className="pr-3">
                    <p className="font-semibold">{benefit.display}</p>
                    <p className="max-w-xs text-xs text-muted">{benefit.caveat}</p>
                  </td>
                  <td><span className={analysis.verificationStatus === "verified_peer_reviewed" ? "chip verified" : "chip pending"}>{statusLabel(analysis.verificationStatus)}</span></td>
                </tr>
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-display text-2xl">Grade 3 or higher adverse events</h2>
        <ul className="mt-3 space-y-3 text-sm">
          {events.map((event) => (
            <li key={event.id}>
              <strong>{event.term}</strong> ({event.grade}).{" "}
              {event.experimentalRate ? `${event.experimentalRate} vs ${event.comparatorRate}. ` : "Exact rate: Verification pending. "}
              {event.narrative}
            </li>
          ))}
          {events.length === 0 && <li>Verification pending.</li>}
        </ul>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-display text-2xl">Limitations</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{trial.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
          <p className="mt-3 text-sm">{trial.interpretation}</p>
        </div>
        <div className="card p-6">
          <h2 className="font-display text-2xl">Why it matters now</h2>
          <p className="mt-3 text-sm">{trial.practiceStatement}</p>
          <p className="mt-3 text-sm">{trial.currentRelevance}</p>
          <p className="mt-3 text-sm"><strong>Historical standard. </strong>{trial.historicalStandard}</p>
          <p className="mt-2 text-sm"><strong>Newer standard in this atlas. </strong>{trial.newerStandard}</p>
          <p className="mt-3 text-sm text-muted">{APPROVAL_NOTE}</p>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-display text-2xl">Five high-yield points</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">{trial.highYieldPoints.slice(0, 5).map((point) => <li key={point}>{point}</li>)}</ol>
      </section>

      <section className="card p-6">
        <h2 className="font-display text-2xl">Five examination questions</h2>
        <p className="mt-2 text-sm text-muted">{EXAM_NOTICE}</p>
        <ol className="mt-4 space-y-4">
          {questions.map((question, index) => (
            <li key={question.id}>
              <p className="font-medium">{index + 1}. {question.stem}</p>
              <p className="mt-1 text-sm">Answer: {question.options.find((option) => option.id === question.correctOptionId)?.text}</p>
              <p className="text-sm text-muted">{question.explanation}</p>
            </li>
          ))}
          {questions.length === 0 && <li>No verified question can be generated until a reviewer confirms the source figures.</li>}
        </ol>
      </section>

      <section className="card p-6">
        <h2 className="font-display text-2xl">Viva prompts</h2>
        <ol className="mt-3 space-y-3 text-sm">
          {viva.map((item) => (
            <li key={item.id}>
              <p className="font-medium">{item.question}</p>
              <p className="text-muted">{item.modelAnswer}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="card p-6">
        <h2 className="font-display text-2xl">Sources</h2>
        <ul className="mt-3 space-y-3 text-sm">
          {publications.map((publication) => (
            <li key={publication.id}>
              <p>{vancouver(publication)}</p>
              {linkForPublication(publication.id) && (
                <a className="text-brand-700 underline" href={linkForPublication(publication.id)!} target="_blank" rel="noreferrer">Open publication</a>
              )}
              <button
                className="ml-3 text-brand-700 underline"
                onClick={() => navigator.clipboard.writeText(vancouver(publication))}
              >
                Copy Vancouver citation
              </button>
            </li>
          ))}
        </ul>
        <button className="no-print mt-4 rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => window.print()}>
          Print study note
        </button>
        <p className="mt-4 text-sm"><Link className="underline" href="/compare">Compare this trial</Link></p>
      </section>
    </article>
  );
}

function Item({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wider text-muted">{term}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}
