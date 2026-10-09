"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { organs, organById } from "@/lib/data/organs";
import {
  filterTrials, organName, pathways, searchAtlas, timelineEvents, trials, uniqueValues, updates, verifiedAnalyses,
} from "@/lib/data/repository";
import { adverseEvents, publications, regimens } from "@/lib/data/seed";
import { APPROVAL_NOTE, CROSS_TRIAL_WARNING, EXAM_NOTICE } from "@/lib/evidence";
import { matchDemoUser } from "@/lib/auth/demo";
import { vancouver } from "@/lib/learning/citations";
import { buildFlashcards, buildViva, incorrectIds, questionBank, sampleMock } from "@/lib/learning/generate";
import { buildStudyPlan } from "@/lib/learning/planner";
import { initialSrsState, queueFlashcards, reviewCard, weakOrganIds } from "@/lib/learning/srs";
import { useAtlas } from "@/components/providers";
import { TrialPanel } from "@/components/trial-panel";
import { Button, Field, SelectInput, TextInput } from "@/components/ui";
import { displayStat, todayIso } from "@/lib/utils";
import type { Question } from "@/lib/types";

const OrganChart = dynamic(() => import("@/components/organ-chart").then((module) => module.OrganChart), { ssr: false });
const EvolutionFlow = dynamic(() => import("@/components/evolution-flow").then((module) => module.EvolutionFlow), { ssr: false });

function PageTitle({ kicker, title, text }: { kicker: string; title: string; text: string }) {
  return (
    <header className="mb-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">{kicker}</p>
      <h1 className="font-display text-4xl">{title}</h1>
      <p className="mt-2 max-w-3xl text-muted">{text}</p>
    </header>
  );
}

export function DashboardScreen() {
  const { attempts, srs, bookmarks } = useAtlas();
  const cards = buildFlashcards();
  const due = queueFlashcards(cards, srs, weakOrganIds(attempts));
  const weak = weakOrganIds(attempts);
  const answered = attempts.length;
  const correct = attempts.filter((attempt) => attempt.correct).length;
  return (
    <div className="grid gap-5">
      <section className="card rise overflow-hidden p-6 md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Maitu OncoTrial Atlas</p>
        <h1 className="mt-2 font-display text-4xl md:text-6xl">From Landmark Trials to Latest Breakthroughs</h1>
        <p className="mt-3 text-xl text-muted">Master Oncology Trials. Master Your Exams.</p>
        <p className="mt-4 max-w-3xl text-sm">A resident study desk for breast, lung, and gynecologic landmark trials. Numbers appear only when a cited analysis supports them.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/organs" className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white">Open the library</Link>
          <Link href="/flashcards" className="rounded-full bg-lavender px-4 py-2 text-sm font-semibold">Revise due cards</Link>
        </div>
      </section>
      <section className="grid gap-3 md:grid-cols-4">
        {[
          ["Verified trials", String(trials.filter((trial) => !trial.placeholder).length)],
          ["Due flashcards", String(due.length)],
          ["Bookmarks", String(bookmarks.length)],
          ["Accuracy", answered ? `${Math.round((correct / answered) * 100)}%` : "No attempts yet"],
        ].map(([label, value]) => (
          <div key={label} className="card p-4"><p className="text-sm text-muted">{label}</p><p className="font-display text-3xl">{value}</p></div>
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card p-5">
          <h2 className="font-display text-2xl">Records by organ</h2>
          <OrganChart />
        </div>
        <div className="card p-5">
          <h2 className="font-display text-2xl">Weak systems</h2>
          {weak.length === 0 ? <p className="mt-3 text-sm">Answer at least two questions in an organ. Systems below 70% rise to the front of the queue.</p> : (
            <ul className="mt-3 space-y-2 text-sm">{weak.map((id) => <li key={id}>{organName(id)}</li>)}</ul>
          )}
          <Link href="/notebook" className="mt-4 inline-block text-sm font-semibold underline">Open the error notebook</Link>
        </div>
      </section>
    </div>
  );
}

export function OrganListScreen() {
  return (
    <div>
      <PageTitle kicker="Library" title="Organ-wise trial library" text="Every organ is listed. Breast, lung, and gynecologic oncology have curated records. Empty organs do not show invented results." />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {organs.map((organ) => {
          const count = trials.filter((trial) => trial.organId === organ.id && !trial.placeholder).length;
          return (
            <Link key={organ.id} href={`/organs/${organ.id}`} className="card p-4 hover:-translate-y-0.5">
              <p className="text-xs uppercase tracking-wider text-muted">{organ.group}</p>
              <h2 className="mt-1 font-display text-2xl">{organ.name}</h2>
              <p className="mt-2 text-sm text-muted">{organ.summary}</p>
              <p className="mt-3 text-sm font-semibold">{count ? `${count} curated trials` : "No verified trials yet"}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function OrganDetailScreen({ slug }: { slug: string }) {
  const organ = organById(slug);
  const [filters, setFilters] = useState({ subtype: "", biomarker: "", setting: "", line: "", modality: "", year: "", phase: "", endpoint: "", result: "", histology: "", stage: "" });
  if (!organ) return <p>That organ is not in the atlas.</p>;
  const rows = filterTrials({ ...filters, }).filter((trial) => trial.organId === slug);
  const fields = [
    ["subtype", "Disease subtype", uniqueValues(slug, (trial) => trial.subtype)],
    ["histology", "Histology", uniqueValues(slug, (trial) => trial.histology)],
    ["stage", "Stage", uniqueValues(slug, (trial) => trial.stage)],
    ["biomarker", "Biomarker", uniqueValues(slug, (trial) => trial.biomarkers)],
    ["setting", "Treatment setting", uniqueValues(slug, (trial) => trial.setting)],
    ["line", "Line of therapy", uniqueValues(slug, (trial) => trial.lineOfTherapy)],
    ["modality", "Modality", uniqueValues(slug, (trial) => trial.modality)],
    ["year", "Publication year", uniqueValues(slug, (trial) => String(trial.year))],
    ["phase", "Phase", uniqueValues(slug, (trial) => trial.phase)],
    ["result", "Verified result", ["positive", "negative", "inconclusive"]],
  ] as const;
  return (
    <div>
      <PageTitle kicker={organ.group} title={organ.name} text={organ.summary} />
      <div className="card mb-4 grid gap-3 p-4 md:grid-cols-3">
        {fields.map(([key, label, values]) => (
          <Field key={key} label={label}>
            <SelectInput value={filters[key]} onChange={(event) => setFilters({ ...filters, [key]: event.target.value })}>
              <option value="">All</option>
              {values.map((value) => <option key={value}>{value}</option>)}
            </SelectInput>
          </Field>
        ))}
        <Field label="Primary endpoint text">
          <TextInput value={filters.endpoint} onChange={(event) => setFilters({ ...filters, endpoint: event.target.value })} />
        </Field>
      </div>
      <div className="grid gap-3">
        {rows.map((trial) => (
          <Link key={trial.id} href={`/trials/${trial.id}`} className="card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl">{trial.acronym}</h2>
              <span className={trial.placeholder ? "chip pending" : "chip verified"}>{trial.placeholder ? "Placeholder" : trial.year}</span>
            </div>
            <p className="mt-2 text-sm">{trial.pico.population}</p>
          </Link>
        ))}
        {rows.length === 0 && <p className="card p-4">No curated record matches these filters. No placeholder efficacy result is shown.</p>}
      </div>
    </div>
  );
}

export function TrialScreen({ id }: { id: string }) {
  const trial = trials.find((item) => item.id === id);
  if (!trial) return <p>That trial is not in the seed.</p>;
  return <TrialPanel trial={trial} />;
}

export function TimelineScreen() {
  const [mode, setMode] = useState<"chronological" | "practice">("chronological");
  const events = timelineEvents();
  return (
    <div>
      <PageTitle kicker="History" title="Historical trial timeline" text="Switch between publication order and the clinical-practice pathways. Updated survival analyses stay separate from the first report." />
      <div className="mb-4 flex gap-2">
        <Button variant={mode === "chronological" ? "primary" : "soft"} onClick={() => setMode("chronological")}>Chronological</Button>
        <Button variant={mode === "practice" ? "primary" : "soft"} onClick={() => setMode("practice")}>Clinical-practice evolution</Button>
      </div>
      {mode === "chronological" ? (
        <ol className="grid gap-3">
          {events.map((event) => {
            const trial = trials.find((item) => item.id === event.trialId);
            const analysis = event.analysis;
            return (
              <li key={event.id} className="card p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">{event.year} · {analysis?.analysisType} {analysis?.endpoint}</p>
                <h2 className="font-display text-2xl"><Link href={`/trials/${event.trialId}`}>{trial?.acronym}</Link></h2>
                <p className="text-sm">{trial?.pico.population}</p>
                <p className="mt-2 text-sm"><strong>Previous standard. </strong>{trial?.historicalStandard}</p>
                <p className="text-sm"><strong>Experimental treatment. </strong>{analysis ? displayStat(analysis.verificationStatus, analysis.experimentalLabel) : "Verification pending"}</p>
                <p className="text-sm"><strong>Primary endpoint. </strong>{trial?.primaryEndpoint}</p>
                <p className="text-sm"><strong>Key numerical benefit. </strong>{analysis ? displayStat(analysis.verificationStatus, analysis.absoluteBenefit ?? analysis.hr) : "Verification pending"}</p>
                <p className="text-sm"><strong>Clinical implication. </strong>{trial?.practiceStatement}</p>
                <p className="text-sm"><strong>Current relevance. </strong>{trial?.currentRelevance}</p>
                {analysis && <p className="mt-2 text-sm"><Link className="underline" href={`/trials/${event.trialId}`}>Open the source-linked trial card</Link></p>}
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="grid gap-4">
          {pathways.map((pathway) => (
            <section key={pathway.id} className="card p-4">
              <h2 className="font-display text-2xl">{pathway.title}</h2>
              <p className="mt-2 text-sm text-muted">{pathway.caption}</p>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
                {pathway.nodes.map((node) => <li key={node.id}><strong>{node.title}. </strong>{node.detail}</li>)}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export function LandmarkScreen() {
  return (
    <div>
      <PageTitle kicker="Landmarks" title="Landmark trials" text="Trials marked as landmarks in the curated seed. Placeholder cards are excluded." />
      <div className="grid gap-3 md:grid-cols-2">
        {trials.filter((trial) => trial.landmark && !trial.placeholder).map((trial) => (
          <Link key={trial.id} href={`/trials/${trial.id}`} className="card p-4">
            <h2 className="font-display text-2xl">{trial.acronym}</h2>
            <p className="text-sm text-muted">{trial.year} · {organName(trial.organId)}</p>
            <p className="mt-2 text-sm">{trial.practiceStatement}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function PicoScreen() {
  return (
    <div>
      <PageTitle kicker="PICO" title="PICO trial cards" text="Population, intervention, comparator, and outcomes for every curated record." />
      <div className="grid gap-3">
        {trials.filter((trial) => !trial.placeholder).map((trial) => (
          <Link key={trial.id} href={`/trials/${trial.id}#pico`} className="card p-4">
            <h2 className="font-display text-2xl">{trial.acronym}</h2>
            <p className="mt-2 text-sm"><strong>P. </strong>{trial.pico.population}</p>
            <p className="text-sm"><strong>I. </strong>{trial.pico.intervention}</p>
            <p className="text-sm"><strong>C. </strong>{trial.pico.comparator}</p>
            <p className="text-sm"><strong>O. </strong>{trial.pico.outcomes}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function CompareScreen() {
  const options = trials.filter((trial) => !trial.placeholder);
  const [selected, setSelected] = useState<string[]>(["cleopatra", "destiny-breast03"]);
  const chosen = selected.map((id) => options.find((trial) => trial.id === id)).filter((trial) => trial !== undefined);
  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length >= 4 ? current : [...current, id]);
  }
  return (
    <div>
      <PageTitle kicker="Compare" title="Trial comparison" text="Choose two to four studies. The warning stays visible because separate trials are not a randomized comparison." />
      <div className="card mb-4 border-2 border-amber-400 bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">{CROSS_TRIAL_WARNING}</div>
      <div className="mb-4 flex flex-wrap gap-2">
        {options.map((trial) => (
          <button key={trial.id} className={`chip ${selected.includes(trial.id) ? "bg-brand-700 text-white" : ""}`} aria-pressed={selected.includes(trial.id)} onClick={() => toggle(trial.id)}>{trial.acronym}</button>
        ))}
      </div>
      {chosen.length >= 2 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead><tr><th className="p-2">Field</th>{chosen.map((trial) => <th key={trial.id} className="p-2">{trial.acronym}</th>)}</tr></thead>
            <tbody>
              {[
                ["Population", (trial: typeof chosen[number]) => trial.pico.population],
                ["Prior therapy / line", (trial: typeof chosen[number]) => trial.lineOfTherapy],
                ["Biomarkers", (trial: typeof chosen[number]) => trial.biomarkers.join(", ")],
                ["Sample size", (trial: typeof chosen[number]) => trial.sampleSize ?? "Verification pending"],
                ["Regimen", (trial: typeof chosen[number]) => trial.pico.intervention],
                ["Primary endpoint", (trial: typeof chosen[number]) => trial.primaryEndpoint],
                ["Verified hazard ratios", (trial: typeof chosen[number]) => verifiedAnalyses().filter((analysis) => analysis.trialId === trial.id && analysis.hr).map((analysis) => `${analysis.analysisType} ${analysis.endpoint} ${analysis.hr}`).join("; ") || "Verification pending"],
                ["Adverse events", (trial: typeof chosen[number]) => adverseEvents.filter((event) => event.trialId === trial.id).map((event) => event.term).join("; ") || "Verification pending"],
                ["Clinical significance", (trial: typeof chosen[number]) => trial.practiceStatement],
              ].map(([label, pick]) => (
                <tr key={String(label)} className="border-t border-line align-top">
                  <th className="p-2 text-left">{label as string}</th>
                  {chosen.map((trial) => <td key={trial.id} className="p-2">{(pick as (trial: typeof chosen[number]) => string)(trial)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function EvolutionScreen() {
  const [id, setId] = useState(pathways[0].id);
  const pathway = pathways.find((item) => item.id === id) ?? pathways[0];
  return (
    <div>
      <PageTitle kicker="Evolution" title="Treatment evolution" text="Historical standard, pivotal trial, demonstrated benefit, and the next trial. Negative and unverified steps stay marked." />
      <p className="mb-4 text-sm">{APPROVAL_NOTE}</p>
      <Field label="Pathway">
        <SelectInput value={id} onChange={(event) => setId(event.target.value)}>
          {pathways.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </SelectInput>
      </Field>
      <div className="mt-4"><EvolutionFlow pathway={pathway} /></div>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
        {pathway.nodes.map((node) => <li key={node.id}><strong>{node.title}. </strong>{node.detail}</li>)}
      </ol>
    </div>
  );
}

export function DoseScreen() {
  return (
    <div>
      <PageTitle kicker="Doses" title="Drug dose memory" text="Only doses copied from a cited methods section are shown as facts. Missing doses stay pending." />
      <div className="grid gap-3">
        {regimens.map((regimen) => {
          const trial = trials.find((item) => item.id === regimen.trialId);
          return (
            <section key={regimen.id} className="card p-4">
              <h2 className="font-display text-2xl">{trial?.acronym} · {regimen.armName}</h2>
              <ul className="mt-2 text-sm">
                {regimen.drugs.map((drug) => (
                  <li key={drug.name}>{drug.name}: {displayStat(drug.verificationStatus, [drug.dose, drug.schedule, drug.duration].filter(Boolean).join(" · ") || null)}</li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function FlashScreen() {
  const { srs, saveSrs, attempts, recordAttempt } = useAtlas();
  const cards = useMemo(() => buildFlashcards(), []);
  const queue = queueFlashcards(cards, srs, weakOrganIds(attempts));
  const [index, setIndex] = useState(0);
  const [show, setShow] = useState(false);
  const card = queue[index] ?? queue[0];
  if (!card) return <p>No cards are due.</p>;
  function grade(quality: number) {
    const state = reviewCard(srs[card.id] ?? initialSrsState(), quality);
    saveSrs(card.id, state);
    recordAttempt({ questionId: card.id, organId: card.organId, correct: quality >= 3, at: new Date().toISOString() });
    setShow(false);
    setIndex(0);
  }
  return (
    <div>
      <PageTitle kicker="Recall" title="Spaced repetition" text={`${queue.length} cards are due. Weak organs are placed first. Ratings use an SM-2 schedule.`} />
      <button className="card min-h-56 w-full p-6 text-left" onClick={() => setShow((value) => !value)}>
        <p className="text-xs uppercase tracking-wider text-muted">{card.topic} · {card.citation}</p>
        <p className="mt-4 font-display text-3xl">{show ? card.back : card.front}</p>
        <p className="mt-4 text-sm text-muted">{show ? "Tap a rating" : "Tap to reveal"}</p>
      </button>
      {show && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="soft" onClick={() => grade(1)}>Again</Button>
          <Button variant="soft" onClick={() => grade(3)}>Hard</Button>
          <Button onClick={() => grade(4)}>Good</Button>
          <Button onClick={() => grade(5)}>Easy</Button>
        </div>
      )}
    </div>
  );
}

export function McqScreen() {
  const bank = useMemo(() => questionBank(), []);
  const { recordAttempt } = useAtlas();
  const [organ, setOrgan] = useState("all");
  const [cursor, setCursor] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const pool = bank.filter((question) => organ === "all" || question.organId === organ);
  const question = pool[cursor];
  return (
    <div>
      <PageTitle kicker="MCQ" title="Original examination bank" text={EXAM_NOTICE} />
      <Field label="Organ">
        <SelectInput value={organ} onChange={(event) => { setOrgan(event.target.value); setCursor(0); setPicked(null); }}>
          <option value="all">All curated organs</option>
          {organs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </SelectInput>
      </Field>
      {question ? <QuestionCard question={question} picked={picked} onPick={(id) => { setPicked(id); recordAttempt({ questionId: question.id, organId: question.organId, correct: id === question.correctOptionId, at: new Date().toISOString() }); }} /> : <p>No question is available.</p>}
      <div className="mt-4 flex gap-2">
        <Button variant="soft" onClick={() => { setCursor((value) => (value + 1) % pool.length); setPicked(null); }}>Next unseen in this pass</Button>
      </div>
    </div>
  );
}

function QuestionCard({ question, picked, onPick }: { question: Question; picked: string | null; onPick: (id: string) => void }) {
  return (
    <section className="card mt-4 p-5">
      <p className="text-xs uppercase tracking-wider text-muted">{question.type} · {question.difficulty}</p>
      <h2 className="mt-2 text-lg font-semibold">{question.stem}</h2>
      <div className="mt-4 grid gap-2">
        {question.options.map((option) => (
          <button key={option.id} className="rounded-2xl border border-line px-3 py-2 text-left text-sm" onClick={() => onPick(option.id)} disabled={picked !== null}>
            {option.id}. {option.text}
          </button>
        ))}
      </div>
      {picked && (
        <div className="mt-4 text-sm">
          <p className="font-semibold">{picked === question.correctOptionId ? "Correct." : `The cited answer is ${question.correctOptionId}.`}</p>
          <p className="mt-2">{question.explanation}</p>
          <p className="mt-2">Why the other options fail: {question.options.filter((option) => option.id !== question.correctOptionId).map((option) => `${option.id} ${question.distractorRationales[option.id]}`).join(" ")}</p>
          <p className="mt-2 text-muted">{question.citation}</p>
        </div>
      )}
    </section>
  );
}

export function VivaScreen() {
  const items = useMemo(() => buildViva(), []);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const item = items[index];
  if (!item) return <p>No viva item is available.</p>;
  return (
    <div>
      <PageTitle kicker="Viva" title="DM university viva" text="Model answers use only the stored trial record and its citation." />
      <section className="card p-5">
        <h2 className="text-xl font-semibold">{item.question}</h2>
        {open && <p className="mt-4 text-sm">{item.modelAnswer}</p>}
        {open && <p className="mt-2 text-xs text-muted">{item.citation}</p>}
        <div className="mt-4 flex gap-2">
          <Button onClick={() => setOpen(true)}>Reveal model answer</Button>
          <Button variant="soft" onClick={() => { setOpen(false); setIndex((value) => (value + 1) % items.length); }}>Next</Button>
        </div>
      </section>
    </div>
  );
}

export function MockScreen() {
  const bank = useMemo(() => questionBank(), []);
  const [size, setSize] = useState(25);
  const [paper, setPaper] = useState<Question[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const { recordAttempt } = useAtlas();
  function start() {
    const count = Math.min(size, bank.length);
    setPaper(sampleMock(bank, count, size + bank.length));
    setAnswers({});
    setSubmitted(false);
    setSeconds(count * 72);
  }
  if (!paper) {
    return (
      <div>
        <PageTitle kicker="Mock" title="Timed mock examinations" text={`The verified bank has ${bank.length} questions. A paper never adds invented items to reach 25, 50, or 100.`} />
        <div className="flex gap-2">
          {[25, 50, 100].map((count) => <Button key={count} variant={size === count ? "primary" : "soft"} onClick={() => setSize(count)}>{count}</Button>)}
        </div>
        <Button className="mt-4" onClick={start}>Start</Button>
      </div>
    );
  }
  const score = paper.filter((question) => answers[question.id] === question.correctOptionId).length;
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-3xl">Mock paper</h1>
        <Timer seconds={seconds} running={!submitted} onDone={() => setSubmitted(true)} />
      </div>
      {paper.length < size && <p className="mb-3 text-sm">This paper uses all {paper.length} available verified questions.</p>}
      {paper.map((question, index) => (
        <section key={question.id} className="card mb-3 p-4">
          <p className="font-medium">{index + 1}. {question.stem}</p>
          <div className="mt-2 grid gap-2">
            {question.options.map((option) => (
              <label key={option.id} className="text-sm"><input type="radio" name={question.id} className="mr-2" disabled={submitted} onChange={() => setAnswers({ ...answers, [question.id]: option.id })} />{option.id}. {option.text}</label>
            ))}
          </div>
          {submitted && <p className="mt-2 text-sm">{question.explanation} {question.citation}</p>}
        </section>
      ))}
      {!submitted && <Button onClick={() => {
        setSubmitted(true);
        paper.forEach((question) => recordAttempt({ questionId: question.id, organId: question.organId, correct: answers[question.id] === question.correctOptionId, at: new Date().toISOString() }));
      }}>Submit</Button>}
      {submitted && <p className="font-display text-3xl">Score {score} / {paper.length}</p>}
    </div>
  );
}

function Timer({ seconds, running, onDone }: { seconds: number; running: boolean; onDone: () => void }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setLeft((value) => {
        if (value <= 1) {
          window.clearInterval(id);
          onDone();
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, onDone]);
  const minutes = Math.floor(left / 60);
  return <p className="font-semibold" aria-live="polite">{minutes}:{String(left % 60).padStart(2, "0")}</p>;
}

export function PlannerScreen() {
  const { planner, savePlanner } = useAtlas();
  const [examDate, setExamDate] = useState(planner?.examDate ?? "2026-12-15");
  const [minutes, setMinutes] = useState(planner?.minutes ?? 90);
  const [selected, setSelected] = useState<string[]>(planner?.organs ?? ["breast", "lung", "ovarian"]);
  const plan = buildStudyPlan({ examDate, minutesPerDay: minutes, organIds: selected, startDate: todayIso() });
  return (
    <div>
      <PageTitle kicker="Planner" title="Daily revision planner" text="Three organ systems rotate each day: morning pathway, afternoon PICO, evening questions, and final numerical recall." />
      <div className="card grid gap-3 p-4 md:grid-cols-3">
        <Field label="Exam date"><TextInput type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} /></Field>
        <Field label="Minutes per day"><TextInput type="number" min={30} value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} /></Field>
        <Button onClick={() => savePlanner({ examDate, minutes, organs: selected })}>Save plan</Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {organs.slice(0, 12).map((organ) => (
          <button key={organ.id} className="chip" aria-pressed={selected.includes(organ.id)} onClick={() => setSelected((current) => current.includes(organ.id) ? current.filter((id) => id !== organ.id) : [...current, organ.id])}>{organ.name}</button>
        ))}
      </div>
      <div className="mt-4 grid gap-3">
        {plan.map((day) => (
          <section key={day.date} className="card p-4">
            <h2 className="font-semibold">{day.date}</h2>
            <p className="text-sm text-muted">{day.organs.map(organName).join(" · ")}</p>
            <ul className="mt-2 text-sm">{day.blocks.map((block) => <li key={block.period}>{block.period} ({block.minutes} min, {organName(block.focus)}): {block.task}</li>)}</ul>
          </section>
        ))}
      </div>
    </div>
  );
}

export function NotebookScreen() {
  const { attempts } = useAtlas();
  const bank = questionBank();
  const ids = incorrectIds(attempts);
  const rows = ids.map((id) => bank.find((question) => question.id === id) ?? buildFlashcards().find((card) => card.id === id));
  return (
    <div>
      <PageTitle kicker="Errors" title="Error notebook" text="The latest attempt is kept. A later correct answer leaves the notebook. Weak organs are listed on the dashboard." />
      <ul className="grid gap-3">
        {rows.map((row) => row && "stem" in row ? (
          <li key={row.id} className="card p-4 text-sm"><p className="font-medium">{row.stem}</p><p className="mt-2">{row.explanation}</p></li>
        ) : row ? <li key={row.id} className="card p-4 text-sm">{row.front}</li> : null)}
        {rows.length === 0 && <li>No misses yet.</li>}
      </ul>
    </div>
  );
}

export function BookmarkScreen() {
  const { bookmarks } = useAtlas();
  const rows = trials.filter((trial) => bookmarks.includes(trial.id));
  return (
    <div>
      <PageTitle kicker="Saved" title="Bookmarks" text="Saved in this browser. Printing a trial card makes an offline study note." />
      {rows.map((trial) => <Link key={trial.id} href={`/trials/${trial.id}`} className="card mb-3 block p-4">{trial.acronym}</Link>)}
      {rows.length === 0 && <p>No bookmarks yet.</p>}
    </div>
  );
}

export function ReferenceScreen() {
  return (
    <div>
      <PageTitle kicker="References" title="Research references" text="Vancouver citations for the publications stored in the seed. Copy a citation from the trial card as well." />
      <ul className="grid gap-3">
        {publications.map((publication) => <li key={publication.id} className="card p-4 text-sm">{vancouver(publication)}</li>)}
      </ul>
    </div>
  );
}

export function UpdatesScreen() {
  const [windowDays, setWindowDays] = useState("curated");
  const [discovered, setDiscovered] = useState<{ title: string; url: string | null; source: string; year: number | null }[]>([]);
  const [term, setTerm] = useState("osimertinib NSCLC");
  const today = Date.parse("2026-10-08T00:00:00Z");
  const visible = updates.filter((update) => {
    if (windowDays === "curated") return true;
    const age = (today - Date.parse(update.publishedDate)) / 86400000;
    return age <= Number(windowDays) && age >= 0;
  });
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    fetch(`${base}/data/discovery.json`)
      .then((response) => response.json())
      .then((payload) => setDiscovered(payload.hits ?? []))
      .catch(() => setDiscovered([]));
  }, []);
  const matching = discovered.filter((hit) => hit.title.toLowerCase().includes(term.trim().toLowerCase())).slice(0, 30);
  return (
    <div>
      <PageTitle kicker="Updates" title="Latest oncology updates" text="Search hits are unverified metadata. Efficacy numbers are published only after review, and this seed does not invent 2026 results." />
      <div className="mb-4 flex flex-wrap gap-2">
        {[["curated", "Curated set"], ["7", "7 days"], ["30", "30 days"], ["90", "90 days"], ["365", "Current year"]].map(([value, label]) => (
          <Button key={value} variant={windowDays === value ? "primary" : "soft"} onClick={() => setWindowDays(value)}>{label}</Button>
        ))}
      </div>
      {visible.length === 0 && <p className="card p-4 text-sm">No reviewer-approved efficacy update falls in this window. Use the search below for citations only.</p>}
      <div className="grid gap-3">
        {visible.map((update) => (
          <article key={update.id} className="card p-4 text-sm">
            <h2 className="font-semibold">{update.title}</h2>
            <p>{update.journal}, {update.year} · {update.status.replaceAll("_", " ")}</p>
            <p className="mt-2">{update.note}</p>
            <p className="mt-2">Extracted efficacy: none stored on the queue record.</p>
          </article>
        ))}
      </div>
      <section className="card mt-4 grid gap-3 p-4">
        <Field label="Search the latest GitHub Actions discovery file">
          <TextInput value={term} onChange={(event) => setTerm(event.target.value)} />
        </Field>
        <p className="text-xs text-muted">This static site does not call a private backend. GitHub Actions refreshes metadata before deployment.</p>
        {matching.map((hit) => (
          <article key={`${hit.source}-${hit.url ?? hit.title}`} className="rounded-xl border border-line p-3 text-sm">
            <p className="font-semibold">{hit.title}</p>
            <p>{hit.source} · {hit.year ?? "Year pending"} · Efficacy verification pending</p>
            {hit.url && <a className="underline" href={hit.url} target="_blank" rel="noreferrer">Open metadata source</a>}
          </article>
        ))}
      </section>
    </div>
  );
}

export function AdminScreen() {
  const { user, reviews, setReview } = useAtlas();
  if (!user || user.role !== "reviewer") {
    return <p className="card p-4">This browser-only reviewer-interface demonstration uses the reviewer demo account. It is not protected administration. <Link className="underline" href="/login">Use demo sign in</Link></p>;
  }
  return (
    <div>
      <PageTitle kicker="Local demonstration" title="Evidence review interface" text="Decisions are stored only in this browser and do not publish data. This is not secure authentication. Approval cannot create a hazard ratio." />
      {updates.map((update) => {
        const decision = reviews[update.id] ?? update.status;
        return (
          <article key={update.id} className="card mb-3 p-4 text-sm">
            <h2 className="font-semibold">{update.title}</h2>
            <p>Status: {decision}</p>
            <p>{update.note}</p>
            <div className="mt-3 flex gap-2">
              <Button onClick={() => setReview(update.id, "approved_citation")}>Approve citation</Button>
              <Button variant="soft" onClick={() => setReview(update.id, "rejected")}>Reject</Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function SearchScreen() {
  const params = useSearchParams();
  const query = params.get("q") ?? "";
  const result = searchAtlas(query);
  return (
    <div>
      <PageTitle kicker="Search" title={query ? `Results for “${query}”` : "Search"} text="Search covers trial names, populations, and NCT numbers." />
      <div className="grid gap-3">
        {result.trials.map((trial) => <Link key={trial.id} className="card p-4" href={`/trials/${trial.id}`}>{trial.acronym} · {trial.fullName}</Link>)}
        {query && result.trials.length === 0 && <p>No curated trial matched.</p>}
      </div>
    </div>
  );
}

export function LoginScreen() {
  const { login, logout, user } = useAtlas();
  const [email, setEmail] = useState("resident@maitu.demo");
  const [password, setPassword] = useState("atlas");
  const [message, setMessage] = useState("");
  return (
    <div className="mx-auto max-w-lg">
      <PageTitle kicker="Access" title="Demo sign in" text="This is not secure authentication. The GitHub Pages demonstration keeps the session only in this browser." />
      {user && <p className="mb-3 text-sm">Signed in as {user.name} ({user.role}). <button className="underline" onClick={logout}>Sign out</button></p>}
      <form className="card grid gap-3 p-4" onSubmit={(event) => {
        event.preventDefault();
        const match = matchDemoUser(email, password);
        if (!match) { setMessage("Those demo credentials were not recognized."); return; }
        login({ email: match.email, name: match.name, role: match.role });
        setMessage(`Welcome, ${match.name}.`);
      }}>
        <Field label="Email"><TextInput value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" /></Field>
        <Field label="Password"><TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></Field>
        <Button type="submit">Sign in</Button>
        <p className="text-sm text-muted">Resident: resident@maitu.demo / atlas. Reviewer: reviewer@maitu.demo / review.</p>
        {message && <p className="text-sm">{message}</p>}
      </form>
    </div>
  );
}
