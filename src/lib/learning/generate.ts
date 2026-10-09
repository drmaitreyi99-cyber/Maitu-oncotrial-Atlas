import { evidenceCorpus, publicationById, regimens, trials, verifiedAnalyses } from "@/lib/data/repository";
import { pathways } from "@/lib/data/seed";
import type { EndpointAnalysis, Flashcard, Question, QuestionType, Trial, VivaItem } from "@/lib/types";
import { normalizeStem } from "@/lib/utils";
import { vancouver } from "@/lib/learning/citations";

const LETTERS = ["A", "B", "C", "D"];

function citeAnalysis(analysis: EndpointAnalysis): string {
  const publication = publicationById(analysis.publicationId);
  return publication ? vancouver(publication) : analysis.publicationId;
}

function rotate<T>(items: T[], shift: number): T[] {
  const index = ((shift % items.length) + items.length) % items.length;
  return [...items.slice(index), ...items.slice(0, index)];
}

function choices(correct: string, pool: string[], salt: string): { id: string; text: string }[] | null {
  const distractors: string[] = [];
  for (const item of pool) {
    if (!item || item === correct || distractors.includes(item)) continue;
    distractors.push(item);
    if (distractors.length === 3) break;
  }
  if (distractors.length < 3) return null;
  const ordered = rotate([correct, ...distractors], salt.length);
  return ordered.map((text, index) => ({ id: LETTERS[index], text }));
}

function addQuestion(
  bucket: Question[],
  seen: Set<string>,
  question: Omit<Question, "id"> & { id: string },
): void {
  const key = normalizeStem(question.stem);
  if (seen.has(key)) return;
  const corpus = `${evidenceCorpus(question.trialId)}\n${evidenceCorpus()}`;
  if (!question.evidenceQuote || !corpus.includes(question.evidenceQuote)) return;
  if (!question.citation || !question.explanation.toLowerCase().includes("source")) return;
  seen.add(key);
  bucket.push(question);
}

function rationale(correctText: string, optionText: string, trial: Trial): string {
  if (optionText === correctText) return "This matches the cited analysis for this trial.";
  return `This figure or description belongs to a different verified record. It is not the result asked for ${trial.acronym}.`;
}

export function buildQuestionBank(): { questions: Question[]; warnings: string[] } {
  const questions: Question[] = [];
  const seen = new Set<string>();
  const warnings: string[] = [];
  const usable = trials.filter((trial) => !trial.placeholder && trial.resultVerified);
  const hrs = verifiedAnalyses().filter((analysis) => analysis.hr && analysis.ciLabel);
  const hrLabels = hrs.map((analysis) => `${analysis.hr} (${analysis.ciLabel})`);
  const medianLabels = verifiedAnalyses()
    .filter((analysis) => analysis.medianExperimental && analysis.medianComparator)
    .map((analysis) => `${analysis.medianExperimental} versus ${analysis.medianComparator}`);
  const acronyms = usable.map((trial) => trial.acronym);
  const years = [...new Set(usable.map((trial) => String(trial.year)))];
  const sizes = usable.map((trial) => trial.sampleSize).filter((value): value is string => Boolean(value));
  const endpoints = usable.map((trial) => trial.primaryEndpoint);
  const populations = usable.map((trial) => trial.pico.population);

  for (const trial of usable) {
    const identification = choices(trial.acronym, acronyms, trial.id);
    if (identification && trial.pico.intervention) {
      addQuestion(questions, seen, {
        id: `${trial.id}-identify`,
        type: "identification",
        organId: trial.organId,
        trialId: trial.id,
        stem: `Which trial studied this intervention: ${trial.pico.intervention}`,
        options: identification,
        correctOptionId: identification.find((option) => option.text === trial.acronym)!.id,
        explanation: `${trial.acronym} is the cited trial for that intervention. Source: ${trial.journal}, ${trial.year}.`,
        distractorRationales: Object.fromEntries(identification.map((option) => [option.id, rationale(trial.acronym, option.text, trial)])),
        citation: `${trial.acronym}. ${trial.journal}. ${trial.year}.`,
        evidenceQuote: trial.pico.intervention,
        difficulty: "core",
      });
    }

    const yearOptions = choices(String(trial.year), years, `${trial.id}-year`);
    if (yearOptions) {
      addQuestion(questions, seen, {
        id: `${trial.id}-year`,
        type: "sba",
        organId: trial.organId,
        trialId: trial.id,
        stem: `What is the primary publication year stored for ${trial.acronym}?`,
        options: yearOptions,
        correctOptionId: yearOptions.find((option) => option.text === String(trial.year))!.id,
        explanation: `The primary report of ${trial.acronym} in this atlas is ${trial.year}. Later updates keep their own years. Source: trial record ${trial.id}.`,
        distractorRationales: Object.fromEntries(yearOptions.map((option) => [option.id, rationale(String(trial.year), option.text, trial)])),
        citation: `${trial.acronym}. ${trial.journal}. ${trial.year}.`,
        evidenceQuote: String(trial.year),
        difficulty: "core",
      });
    }

    if (trial.sampleSize) {
      const sizeOptions = choices(trial.sampleSize, sizes, `${trial.id}-n`);
      if (sizeOptions) {
        addQuestion(questions, seen, {
          id: `${trial.id}-n`,
          type: "numerical",
          organId: trial.organId,
          trialId: trial.id,
          stem: `Which sample size belongs to ${trial.acronym}?`,
          options: sizeOptions,
          correctOptionId: sizeOptions.find((option) => option.text === trial.sampleSize)!.id,
          explanation: `${trial.acronym} randomized ${trial.sampleSize}. Other options are sample sizes from different trials. Source: ${trial.journal} ${trial.year}.`,
          distractorRationales: Object.fromEntries(sizeOptions.map((option) => [option.id, rationale(trial.sampleSize!, option.text, trial)])),
          citation: `${trial.acronym}. ${trial.journal}. ${trial.year}.`,
          evidenceQuote: trial.sampleSize,
          difficulty: "core",
        });
      }
    }

    const endpointOptions = choices(trial.primaryEndpoint, endpoints, `${trial.id}-ep`);
    if (endpointOptions) {
      addQuestion(questions, seen, {
        id: `${trial.id}-endpoint`,
        type: "sba",
        organId: trial.organId,
        trialId: trial.id,
        stem: `What primary endpoint is recorded for ${trial.acronym}?`,
        options: endpointOptions,
        correctOptionId: endpointOptions.find((option) => option.text === trial.primaryEndpoint)!.id,
        explanation: `Use the endpoint definition from the cited primary report. Source: ${trial.acronym}, ${trial.year}.`,
        distractorRationales: Object.fromEntries(endpointOptions.map((option) => [option.id, rationale(trial.primaryEndpoint, option.text, trial)])),
        citation: `${trial.acronym}. ${trial.journal}. ${trial.year}.`,
        evidenceQuote: trial.primaryEndpoint,
        difficulty: "core",
      });
    }

    const populationOptions = choices(trial.pico.population, populations, `${trial.id}-pop`);
    if (populationOptions) {
      addQuestion(questions, seen, {
        id: `${trial.id}-population`,
        type: "case",
        organId: trial.organId,
        trialId: trial.id,
        stem: `Which population matches ${trial.acronym}?`,
        options: populationOptions,
        correctOptionId: populationOptions.find((option) => option.text === trial.pico.population)!.id,
        explanation: `The population statement is taken from the cited trial record, not from a pooled guideline. Source: ${trial.journal} ${trial.year}.`,
        distractorRationales: Object.fromEntries(populationOptions.map((option) => [option.id, rationale(trial.pico.population, option.text, trial)])),
        citation: `${trial.acronym}. ${trial.journal}. ${trial.year}.`,
        evidenceQuote: trial.pico.population,
        difficulty: "advanced",
      });
    }
  }

  for (const analysis of hrs) {
    const trial = trials.find((item) => item.id === analysis.trialId);
    if (!trial || trial.placeholder) continue;
    const label = `${analysis.hr} (${analysis.ciLabel})`;
    const options = choices(label, hrLabels, analysis.id);
    if (!options) continue;
    const publication = publicationById(analysis.publicationId);
    addQuestion(questions, seen, {
      id: `${analysis.id}-hr`,
      type: analysis.statisticallySignificant === false ? "negative" : "numerical",
      organId: trial.organId,
      trialId: trial.id,
      stem: `In the ${analysis.analysisType} ${analysis.endpoint} analysis "${analysis.id}" of ${trial.acronym}, which hazard ratio and interval were reported?`,
      options,
      correctOptionId: options.find((option) => option.text === label)!.id,
      explanation: `${label} belongs to ${analysis.endpointDefinition} Source: ${citeAnalysis(analysis)} Do not substitute an updated analysis for a primary analysis.`,
      distractorRationales: Object.fromEntries(options.map((option) => [option.id, rationale(label, option.text, trial)])),
      citation: citeAnalysis(analysis),
      sourceAnalysisId: analysis.id,
      evidenceQuote: analysis.hr!,
      difficulty: "advanced",
    });
    if (publication && analysis.significanceNote && analysis.statisticallySignificant === false) {
      const noteOptions = choices(
        analysis.significanceNote,
        verifiedAnalyses()
          .map((item) => item.significanceNote)
          .filter((note): note is string => Boolean(note)),
        `${analysis.id}-note`,
      );
      if (noteOptions) {
        addQuestion(questions, seen, {
          id: `${analysis.id}-boundary`,
          type: "negative",
          organId: trial.organId,
          trialId: trial.id,
          stem: `Which statement correctly describes the ${analysis.analysisType} ${analysis.endpoint} look in ${trial.acronym} (${analysis.id})?`,
          options: noteOptions,
          correctOptionId: noteOptions.find((option) => option.text === analysis.significanceNote)!.id,
          explanation: `A P value alone is not enough when the paper says the boundary was not met. Source: ${citeAnalysis(analysis)}`,
          distractorRationales: Object.fromEntries(noteOptions.map((option) => [option.id, rationale(analysis.significanceNote!, option.text, trial)])),
          citation: citeAnalysis(analysis),
          sourceAnalysisId: analysis.id,
          evidenceQuote: analysis.significanceNote,
          difficulty: "advanced",
        });
      }
    }
  }

  for (const analysis of verifiedAnalyses()) {
    if (!analysis.medianExperimental || !analysis.medianComparator) continue;
    const trial = trials.find((item) => item.id === analysis.trialId);
    if (!trial || trial.placeholder) continue;
    const label = `${analysis.medianExperimental} versus ${analysis.medianComparator}`;
    const options = choices(label, medianLabels, `${analysis.id}-median`);
    if (!options) continue;
    addQuestion(questions, seen, {
      id: `${analysis.id}-median`,
      type: "numerical",
      organId: trial.organId,
      trialId: trial.id,
      stem: `Which experimental-versus-comparator result belongs to ${trial.acronym}, ${analysis.analysisType} ${analysis.endpoint}, population "${analysis.population}"?`,
      options,
      correctOptionId: options.find((option) => option.text === label)!.id,
      explanation: `${label} is stored for ${analysis.id}. ${analysis.significanceNote ?? ""} Source: ${citeAnalysis(analysis)}`,
      distractorRationales: Object.fromEntries(options.map((option) => [option.id, rationale(label, option.text, trial)])),
      citation: citeAnalysis(analysis),
      sourceAnalysisId: analysis.id,
      evidenceQuote: analysis.medianExperimental,
      difficulty: "advanced",
    });
  }

  for (const regimen of regimens) {
    const trial = trials.find((item) => item.id === regimen.trialId);
    if (!trial || trial.placeholder) continue;
    for (const drug of regimen.drugs) {
      if (drug.verificationStatus !== "verified_peer_reviewed" || !drug.dose) continue;
      const pool = regimens.flatMap((item) => item.drugs.map((entry) => entry.dose).filter((dose): dose is string => Boolean(dose)));
      const options = choices(drug.dose, pool, `${regimen.id}-${drug.name}`);
      if (!options) continue;
      const publication = publicationById(regimen.sourcePublicationId);
      addQuestion(questions, seen, {
        id: `${regimen.id}-${drug.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        type: "dose",
        organId: trial.organId,
        trialId: trial.id,
        stem: `Which dose is recorded for ${drug.name} in the ${regimen.armName} arm of ${trial.acronym}?`,
        options,
        correctOptionId: options.find((option) => option.text === drug.dose)!.id,
        explanation: `${drug.name}: ${drug.dose}; ${drug.schedule ?? "schedule in the source"}; ${drug.duration ?? "duration in the source"}. Source: ${publication ? vancouver(publication) : regimen.sourcePublicationId}`,
        distractorRationales: Object.fromEntries(options.map((option) => [option.id, rationale(drug.dose!, option.text, trial)])),
        citation: publication ? vancouver(publication) : trial.acronym,
        sourceRegimenId: regimen.id,
        evidenceQuote: drug.dose,
        difficulty: "advanced",
      });
    }
  }

  const cross = trials.find((trial) => trial.id === "solo1");
  if (cross) {
    const correct = "No. Separate trials do not establish comparative efficacy.";
    const options = [
      { id: "A", text: correct },
      { id: "B", text: "Yes. The lower hazard ratio can be ranked directly." },
      { id: "C", text: "Yes, if both trials used a PARP inhibitor." },
      { id: "D", text: "Yes, because both were phase 3 maintenance studies." },
    ];
    addQuestion(questions, seen, {
      id: "historical-cross-trial",
      type: "historical",
      organId: "ovarian",
      trialId: "solo1",
      stem: "Does a lower hazard ratio in SOLO-1 than in the PAOLA-1 intention-to-treat analysis prove olaparib alone is more effective than olaparib plus bevacizumab?",
      options,
      correctOptionId: "A",
      explanation: "The populations and backbones differ. Source: SOLO-1 limitation in this atlas and the cross-trial warning.",
      distractorRationales: {
        A: "Correct. Cross-trial numerical ranking is not comparative efficacy.",
        B: "Hazard ratios from different trials are not interchangeable.",
        C: "Sharing a drug class does not create a randomized comparison.",
        D: "Phase and setting do not make two control arms equivalent.",
      },
      citation: "SOLO-1 primary publication, DOI 10.1056/NEJMoa1810858. PAOLA-1 primary publication, DOI 10.1056/NEJMoa1911361.",
      evidenceQuote: "This BRCA-selected trial cannot be numerically compared with PAOLA-1 to prove a preferred regimen.",
      difficulty: "advanced",
    });
  }

  for (const pathway of pathways) {
    const trial = trials.find((item) => item.id === pathway.nodes.find((node) => node.trialId)?.trialId);
    if (!trial) continue;
    const correct = pathway.nodes.map((node) => node.title).join(" → ");
    const other = pathways.filter((item) => item.id !== pathway.id).map((item) => item.nodes.map((node) => node.title).join(" → "));
    const options = choices(correct, other, pathway.id);
    if (!options) continue;
    addQuestion(questions, seen, {
      id: `path-${pathway.id}`,
      type: "historical",
      organId: pathway.organId,
      trialId: trial.id,
      stem: `Which sequence matches the seeded treatment-evolution pathway "${pathway.title}"?`,
      options,
      correctOptionId: options.find((option) => option.text === correct)!.id,
      explanation: `${pathway.caption} Source: pathway ${pathway.id}, linked to ${trial.acronym}.`,
      distractorRationales: Object.fromEntries(options.map((option) => [option.id, rationale(correct, option.text, trial)])),
      citation: `${trial.acronym}. ${trial.journal}. ${trial.year}.`,
      evidenceQuote: pathway.caption,
      difficulty: "advanced",
    });
  }

  const typeK = buildTypeK();
  for (const question of typeK) addQuestion(questions, seen, question);
  if (questions.length < 25) warnings.push("Verified question bank is smaller than expected.");
  return { questions, warnings };
}

function buildTypeK(): Question[] {
  const trial = trials.find((item) => item.id === "cleopatra");
  if (!trial) return [];
  const options = [
    { id: "A", text: "1, 2, and 3 are correct" },
    { id: "B", text: "1 and 3 are correct" },
    { id: "C", text: "2 and 4 are correct" },
    { id: "D", text: "4 only is correct" },
  ];
  return [
    {
      id: "typek-cleopatra",
      type: "type_k" as QuestionType,
      organId: "breast",
      trialId: "cleopatra",
      stem: "CLEOPATRA statements: 1) The primary endpoint was independently assessed progression-free survival. 2) The 2012 interim overall-survival analysis met the O'Brien-Fleming stopping boundary. 3) Pertuzumab was given as 840 mg then 420 mg every 3 weeks. 4) Central nervous system metastases were required for enrollment. Which option is correct?",
      options,
      correctOptionId: "B",
      explanation: "Statements 1 and 3 match the 2012 report. Statement 2 is false because the interim overall-survival analysis did not meet the stopping boundary. Statement 4 is false because CNS metastases were an exclusion. Source: DOI 10.1056/NEJMoa1113216.",
      distractorRationales: {
        A: "Statement 2 is false.",
        B: "Statements 1 and 3 are supported by the primary paper.",
        C: "Statements 2 and 4 contradict the primary paper.",
        D: "Statement 4 is an exclusion, not an inclusion.",
      },
      citation: "Author list: see DOI 10.1056/NEJMoa1113216. N Engl J Med. 2012.",
      sourceAnalysisId: "cleopatra-pfs-primary",
      evidenceQuote: "840 mg loading, then 420 mg",
      difficulty: "advanced",
    },
    {
      id: "typek-keynote189",
      type: "type_k",
      organId: "lung",
      trialId: "keynote189",
      stem: "KEYNOTE-189 statements: 1) No alpha was assigned to the updated overall-survival analysis. 2) That update replaces the primary overall-survival hazard ratio. 3) Pemetrexed was dosed at 500 mg/m2. 4) Squamous histology was the enrolled population. Which statements are correct?",
      options,
      correctOptionId: "B",
      explanation: "Statements 1 and 3 match the verified record. Statement 2 is false because the update does not replace the primary analysis. Statement 4 is false because squamous histology was not this trial's population. Source: DOI 10.1056/NEJMoa1801005 and PMID 32150489.",
      distractorRationales: {
        A: "Statement 2 is false.",
        B: "Statements 1 and 3 are supported. Statement 2 is not.",
        C: "Statements 2 and 4 contradict the stored record.",
        D: "Statement 4 is false.",
      },
      citation: "KEYNOTE-189 primary report, DOI 10.1056/NEJMoa1801005. Updated analysis PMID 32150489.",
      sourceAnalysisId: "kn189-os-update",
      evidenceQuote: "No alpha was assigned to this updated analysis.",
      difficulty: "advanced",
    },
  ];
}

let cached: Question[] | null = null;

export function questionBank(): Question[] {
  if (!cached) cached = buildQuestionBank().questions;
  return cached;
}

export function questionsForTrial(trialId: string, limit = 5): Question[] {
  return questionBank().filter((question) => question.trialId === trialId).slice(0, limit);
}

export function buildFlashcards(): Flashcard[] {
  const cards: Flashcard[] = [];
  for (const trial of trials.filter((item) => !item.placeholder && item.resultVerified)) {
    const facts: { topic: string; front: string; back: string; quote: string }[] = [
      { topic: "Acronym", front: `Name the trial: ${trial.pico.intervention}`, back: trial.acronym, quote: trial.pico.intervention },
      { topic: "Year", front: `Primary publication year of ${trial.acronym}`, back: String(trial.year), quote: String(trial.year) },
      { topic: "Population", front: `Population of ${trial.acronym}`, back: trial.pico.population, quote: trial.pico.population },
      { topic: "Comparator", front: `Comparator in ${trial.acronym}`, back: trial.pico.comparator, quote: trial.pico.comparator },
      { topic: "Primary endpoint", front: `Primary endpoint of ${trial.acronym}`, back: trial.primaryEndpoint, quote: trial.primaryEndpoint },
      { topic: "Conclusion", front: `Practice statement for ${trial.acronym}`, back: trial.practiceStatement, quote: trial.practiceStatement },
    ];
    for (const fact of facts) {
      cards.push({
        id: `card-${trial.id}-${fact.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        organId: trial.organId,
        trialId: trial.id,
        topic: fact.topic,
        front: fact.front,
        back: fact.back,
        citation: `${trial.acronym}. ${trial.journal}. ${trial.year}.`,
        evidenceQuote: fact.quote,
      });
    }
  }
  for (const analysis of verifiedAnalyses()) {
    if (!analysis.hr) continue;
    const trial = trials.find((item) => item.id === analysis.trialId);
    if (!trial) continue;
    cards.push({
      id: `card-${analysis.id}-hr`,
      organId: trial.organId,
      trialId: trial.id,
      topic: "Hazard ratio",
      front: `${trial.acronym}: ${analysis.analysisType} ${analysis.endpoint} hazard ratio`,
      back: `${analysis.hr}; ${analysis.ciLabel ?? "interval verification pending"}`,
      citation: citeAnalysis(analysis),
      evidenceQuote: analysis.hr,
    });
  }
  for (const regimen of regimens) {
    const trial = trials.find((item) => item.id === regimen.trialId);
    if (!trial) continue;
    for (const drug of regimen.drugs) {
      if (drug.verificationStatus !== "verified_peer_reviewed" || !drug.dose) continue;
      cards.push({
        id: `card-dose-${regimen.id}-${drug.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        organId: trial.organId,
        trialId: trial.id,
        topic: "Dose",
        front: `${trial.acronym}: dose of ${drug.name}`,
        back: `${drug.dose}. ${drug.schedule ?? ""} ${drug.duration ?? ""}`.trim(),
        citation: `${trial.acronym} regimen ${regimen.id}`,
        evidenceQuote: drug.dose,
      });
    }
  }
  const corpus = evidenceCorpus();
  return cards.filter((card) => corpus.includes(card.evidenceQuote));
}

export function buildViva(): VivaItem[] {
  const items: VivaItem[] = [];
  for (const trial of trials.filter((item) => !item.placeholder && item.resultVerified)) {
    const prompts = [
      ["State the PICO.", `${trial.pico.population} Intervention: ${trial.pico.intervention} Comparator: ${trial.pico.comparator} Outcomes: ${trial.pico.outcomes}`, trial.pico.population],
      ["Why does the primary endpoint matter?", trial.primaryEndpoint, trial.primaryEndpoint],
      ["What is the practice statement, and what must you not over-claim?", trial.practiceStatement, trial.practiceStatement],
      ["Name one limitation stored for this trial.", trial.limitations[0] ?? trial.interpretation, trial.limitations[0] ?? trial.interpretation],
      ["How is this trial interpreted in the atlas?", trial.interpretation, trial.interpretation],
    ] as const;
    prompts.forEach((prompt, index) => {
      items.push({
        id: `viva-${trial.id}-${index + 1}`,
        organId: trial.organId,
        trialId: trial.id,
        question: `${trial.acronym}. ${prompt[0]}`,
        modelAnswer: prompt[1],
        citation: `${trial.acronym}. ${trial.journal}. ${trial.year}.`,
        evidenceQuote: prompt[2],
      });
    });
  }
  const corpus = evidenceCorpus();
  return items.filter((item) => corpus.includes(item.evidenceQuote));
}

export function sampleMock(source: Question[], size: number, seed: number): Question[] {
  const copy = [...source];
  let state = seed >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy.slice(0, Math.min(size, copy.length));
}

export function incorrectIds(attempts: { questionId: string; correct: boolean }[]): string[] {
  const latest = new Map<string, boolean>();
  for (const attempt of attempts) latest.set(attempt.questionId, attempt.correct);
  return [...latest.entries()].filter(([, correct]) => !correct).map(([id]) => id);
}
