export interface LiteratureHit {
  source: "pubmed" | "clinicaltrials" | "crossref";
  title: string;
  year: number | null;
  doi: string | null;
  pmid: string | null;
  nct: string | null;
  url: string | null;
  verificationStatus: "verification_pending";
  extractedEfficacy: null;
  suggestedOrganId: string | null;
  suggestionBasis: "keyword_only";
}

const ORGAN_KEYWORDS: { id: string; words: string[] }[] = [
  { id: "breast", words: ["breast"] },
  { id: "lung", words: ["lung", "nsclc", "sclc"] },
  { id: "ovarian", words: ["ovarian"] },
  { id: "endometrial", words: ["endometrial", "endometrium"] },
  { id: "cervical", words: ["cervical", "cervix"] },
  { id: "colorectal", words: ["colorectal", "colon cancer", "rectal cancer"] },
  { id: "prostate", words: ["prostate"] },
  { id: "melanoma", words: ["melanoma"] },
];

export function suggestOrgan(title: string): string | null {
  const text = title.toLowerCase();
  return ORGAN_KEYWORDS.find((row) => row.words.some((word) => text.includes(word)))?.id ?? null;
}

export function asUnverifiedHit(input: Omit<LiteratureHit, "verificationStatus" | "extractedEfficacy" | "suggestedOrganId" | "suggestionBasis">): LiteratureHit {
  return {
    ...input,
    verificationStatus: "verification_pending",
    extractedEfficacy: null,
    suggestedOrganId: suggestOrgan(input.title),
    suggestionBasis: "keyword_only",
  };
}

export function dedupeHits(hits: LiteratureHit[]): LiteratureHit[] {
  const unique: LiteratureHit[] = [];
  for (const hit of hits) {
    const keys = [hit.nct, hit.pmid, hit.doi].filter((value): value is string => Boolean(value)).map((value) => value.toLowerCase());
    const title = hit.title.trim().toLowerCase();
    const duplicate = unique.some((existing) => {
      const existingKeys = [existing.nct, existing.pmid, existing.doi].filter((value): value is string => Boolean(value)).map((value) => value.toLowerCase());
      if (keys.some((key) => existingKeys.includes(key))) return true;
      return keys.length === 0 && existingKeys.length === 0 && title === existing.title.trim().toLowerCase();
    });
    if (!duplicate) unique.push(hit);
  }
  return unique;
}

export function assertNoExtractedEfficacy(hits: LiteratureHit[]): boolean {
  return hits.every((hit) => hit.extractedEfficacy === null && hit.verificationStatus === "verification_pending");
}
