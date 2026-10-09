export type VerificationStatus =
  | "verified_peer_reviewed"
  | "verification_pending"
  | "conference_abstract"
  | "press_release"
  | "unpublished";

export type ResultClass = "positive" | "negative" | "inconclusive" | "de_escalation";

export type EndpointName =
  | "PFS"
  | "OS"
  | "DFS"
  | "EFS"
  | "RFS"
  | "IDFS"
  | "DDFS"
  | "ORR"
  | "pCR"
  | "DoR";

export interface OrganSystem {
  id: string;
  name: string;
  group: string;
  summary: string;
  subtypes: string[];
}

export interface Publication {
  id: string;
  trialId: string;
  title: string;
  authors: string;
  journal: string;
  year: number;
  volume: string | null;
  pages: string | null;
  doi: string | null;
  pmid: string | null;
  url: string;
  publicationType: "peer_reviewed" | "conference_abstract" | "press_release" | "correction";
  isPrimaryReport: boolean;
  retracted: boolean;
  correctionNote: string | null;
}

export interface Trial {
  id: string;
  acronym: string;
  fullName: string;
  organId: string;
  disease: string;
  subtype: string;
  histology: string;
  stage: string;
  biomarkers: string[];
  setting: string;
  lineOfTherapy: string;
  modality: string;
  phase: string;
  design: string;
  nct: string | null;
  sampleSize: string | null;
  randomization: string | null;
  year: number;
  journal: string;
  pico: {
    population: string;
    intervention: string;
    comparator: string;
    outcomes: string;
  };
  inclusion: string[];
  exclusion: string[];
  primaryEndpoint: string;
  secondaryEndpoints: string[];
  limitations: string[];
  interpretation: string;
  practiceStatement: string;
  resultClass: ResultClass;
  resultVerified: boolean;
  currentRelevance: string;
  historicalStandard: string;
  newerStandard: string;
  highYieldPoints: string[];
  landmark: boolean;
  placeholder: boolean;
}

export interface EndpointAnalysis {
  id: string;
  trialId: string;
  publicationId: string;
  endpoint: EndpointName;
  endpointDefinition: string;
  analysisType: "primary" | "updated" | "interim" | "subgroup" | "secondary";
  priorAnalysisId: string | null;
  cutoffDate: string | null;
  population: string;
  experimentalLabel: string;
  comparatorLabel: string;
  medianExperimental: string | null;
  medianComparator: string | null;
  hr: string | null;
  ciLabel: string | null;
  pValue: string | null;
  absoluteBenefit: string | null;
  statisticallySignificant: boolean | null;
  significanceNote: string | null;
  verificationStatus: VerificationStatus;
}

export interface RegimenDrug {
  name: string;
  dose: string | null;
  schedule: string | null;
  duration: string | null;
  verificationStatus: VerificationStatus;
}

export interface Regimen {
  id: string;
  trialId: string;
  arm: "experimental" | "comparator";
  armName: string;
  drugs: RegimenDrug[];
  sourcePublicationId: string;
}

export interface AdverseEvent {
  id: string;
  trialId: string;
  publicationId: string;
  term: string;
  grade: string;
  experimentalRate: string | null;
  comparatorRate: string | null;
  narrative: string;
  verificationStatus: VerificationStatus;
}

export interface UpdateCandidate {
  id: string;
  trialId: string | null;
  organId: string;
  biomarker: string;
  lineOfTherapy: string;
  title: string;
  journal: string;
  year: number;
  doi: string | null;
  pmid: string | null;
  url: string | null;
  publishedDate: string;
  status: "pending_review" | "approved_citation" | "rejected";
  extractedEfficacy: null;
  note: string;
  source: "PubMed" | "ClinicalTrials.gov" | "Crossref" | "Curated seed";
}

export interface EvolutionNode {
  id: string;
  title: string;
  detail: string;
  kind: "historical" | "trial" | "benefit" | "standard" | "negative" | "pending";
  trialId?: string;
}

export interface EvolutionPathway {
  id: string;
  organId: string;
  title: string;
  caption: string;
  nodes: EvolutionNode[];
  edges: { source: string; target: string; label: string }[];
}

export type QuestionType =
  | "sba"
  | "type_k"
  | "numerical"
  | "dose"
  | "identification"
  | "negative"
  | "historical"
  | "case";

export interface Question {
  id: string;
  type: QuestionType;
  organId: string;
  trialId: string;
  stem: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  explanation: string;
  distractorRationales: Record<string, string>;
  citation: string;
  sourceAnalysisId?: string;
  sourceRegimenId?: string;
  evidenceQuote: string;
  difficulty: "core" | "advanced";
}

export interface Flashcard {
  id: string;
  organId: string;
  trialId: string;
  topic: string;
  front: string;
  back: string;
  citation: string;
  evidenceQuote: string;
}

export interface VivaItem {
  id: string;
  organId: string;
  trialId: string;
  question: string;
  modelAnswer: string;
  citation: string;
  evidenceQuote: string;
}

export interface SrsState {
  ease: number;
  interval: number;
  repetitions: number;
  due: string;
  lapses: number;
}

export interface Attempt {
  questionId: string;
  organId: string;
  correct: boolean;
  at: string;
}

export interface DemoUser {
  email: string;
  password: string;
  name: string;
  role: "resident" | "reviewer";
}
