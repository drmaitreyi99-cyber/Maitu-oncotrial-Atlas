import { describe, expect, it } from "vitest";
import { evidenceCorpus } from "@/lib/data/repository";
import { CROSS_TRIAL_WARNING } from "@/lib/evidence";
import { vancouver } from "@/lib/learning/citations";
import { buildFlashcards, buildQuestionBank, buildViva, incorrectIds, sampleMock } from "@/lib/learning/generate";
import { buildStudyPlan } from "@/lib/learning/planner";
import { initialSrsState, queueFlashcards, reviewCard, weakOrganIds } from "@/lib/learning/srs";
import { publications } from "@/lib/data/seed";
import { asUnverifiedHit, assertNoExtractedEfficacy, dedupeHits } from "@/lib/literature/ingest";

describe("spaced repetition", () => {
  it("grows the interval after a good review and resets after a lapse", () => {
    const start = initialSrsState("2026-10-08");
    const good = reviewCard(start, 4, "2026-10-08");
    expect(good.repetitions).toBe(1);
    expect(good.interval).toBe(1);
    const second = reviewCard(good, 5, good.due);
    expect(second.interval).toBe(6);
    const lapsed = reviewCard(second, 1, second.due);
    expect(lapsed.repetitions).toBe(0);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.ease).toBeGreaterThanOrEqual(1.3);
  });

  it("puts weak organs first in the due queue", () => {
    const cards = [
      { id: "a", organId: "lung", trialId: "flaura", topic: "Year", front: "a", back: "a", citation: "c", evidenceQuote: "a" },
      { id: "b", organId: "breast", trialId: "cleopatra", topic: "Year", front: "b", back: "b", citation: "c", evidenceQuote: "b" },
    ];
    const queued = queueFlashcards(cards, {}, ["breast"], "2026-10-08");
    expect(queued[0].organId).toBe("breast");
  });

  it("flags organs below 70 percent after two attempts", () => {
    expect(weakOrganIds([
      { organId: "lung", correct: false },
      { organId: "lung", correct: false },
      { organId: "breast", correct: true },
    ])).toEqual(["lung"]);
  });
});

describe("question bank", () => {
  const { questions, warnings } = buildQuestionBank();

  it("builds a large original bank without duplicate stems", () => {
    expect(warnings).toEqual([]);
    expect(questions.length).toBeGreaterThanOrEqual(100);
    const stems = questions.map((question) => question.stem.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim());
    expect(new Set(stems).size).toBe(stems.length);
  });

  it("keeps every answer tied to a stored quote and a citation", () => {
    for (const question of questions) {
      expect(question.citation.length).toBeGreaterThan(8);
      expect(question.explanation.toLowerCase()).toContain("source");
      expect(question.evidenceQuote.length).toBeGreaterThan(0);
      expect(evidenceCorpus().includes(question.evidenceQuote)).toBe(true);
      expect(question.options.some((option) => option.id === question.correctOptionId)).toBe(true);
      const correct = question.options.find((option) => option.id === question.correctOptionId)!;
      expect(correct.text.toLowerCase()).not.toContain("verification pending");
    }
  });

  it("keeps the CLEOPATRA primary hazard ratio distinct from the overall-survival update", () => {
    const primary = questions.find((question) => question.id === "cleopatra-pfs-primary-hr");
    expect(primary?.options.find((option) => option.id === primary.correctOptionId)?.text).toContain("0.62");
    const updated = questions.find((question) => question.id === "cleopatra-os-2015-hr");
    expect(updated?.options.find((option) => option.id === updated.correctOptionId)?.text).toContain("0.68");
  });

  it("preserves the ADAURA 99.06 percent interval", () => {
    const question = questions.find((item) => item.id === "adaura-dfs-primary-hr");
    expect(question?.options.find((option) => option.id === question.correctOptionId)?.text).toContain("99.06%");
  });

  it("does not sample duplicate questions into a mock", () => {
    const paper = sampleMock(questions, 50, 7);
    expect(new Set(paper.map((question) => question.id)).size).toBe(paper.length);
  });

  it("tracks the error notebook from the latest attempt", () => {
    expect(incorrectIds([
      { questionId: "q1", correct: false },
      { questionId: "q1", correct: true },
      { questionId: "q2", correct: false },
    ])).toEqual(["q2"]);
  });
});

describe("cards, planner, citations, and literature", () => {
  it("rejects flashcards and viva answers that are not in the evidence text", () => {
    const corpus = evidenceCorpus();
    for (const card of buildFlashcards()) expect(corpus.includes(card.evidenceQuote)).toBe(true);
    for (const item of buildViva()) expect(corpus.includes(item.evidenceQuote)).toBe(true);
    expect(buildViva().filter((item) => item.trialId === "cleopatra").length).toBeGreaterThanOrEqual(5);
  });

  it("plans three organs and four daily blocks", () => {
    const plan = buildStudyPlan({
      examDate: "2026-10-20",
      minutesPerDay: 90,
      organIds: ["breast", "lung", "ovarian", "cervical"],
      startDate: "2026-10-08",
    });
    expect(plan[0].organs).toHaveLength(3);
    expect(plan[0].blocks.map((block) => block.period)).toEqual(["Morning", "Afternoon", "Evening", "Final recall"]);
  });

  it("formats a Vancouver citation and keeps the cross-trial warning", () => {
    const citation = vancouver(publications[0]);
    expect(citation).toContain("N Engl J Med");
    expect(citation).toContain("doi:");
    expect(CROSS_TRIAL_WARNING.toLowerCase()).toContain("do not establish comparative efficacy");
  });

  it("deduplicates literature hits and never stores efficacy", () => {
    const hits = dedupeHits([
      asUnverifiedHit({ source: "pubmed", title: "A", year: 2024, doi: "10.1000/a", pmid: "1", nct: null, url: null }),
      asUnverifiedHit({ source: "crossref", title: "A again", year: 2024, doi: "10.1000/a", pmid: null, nct: null, url: null }),
    ]);
    expect(hits).toHaveLength(1);
    expect(assertNoExtractedEfficacy(hits)).toBe(true);
  });
});
