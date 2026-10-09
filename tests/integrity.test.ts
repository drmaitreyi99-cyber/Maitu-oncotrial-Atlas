import { describe, expect, it } from "vitest";
import { analyses, publications, regimens, trials, updates } from "@/lib/data/seed";
import { benefitSummary } from "@/lib/evidence/benefits";

describe("evidence integrity", () => {
  it("gives every verified analysis a publication, endpoint definition, and at least one figure", () => {
    for (const analysis of analyses.filter((item) => item.verificationStatus === "verified_peer_reviewed")) {
      expect(publications.some((publication) => publication.id === analysis.publicationId)).toBe(true);
      expect(analysis.endpointDefinition.length).toBeGreaterThan(10);
      const hasFigure = [analysis.hr, analysis.medianExperimental, analysis.absoluteBenefit, analysis.pValue].some(Boolean);
      expect(hasFigure).toBe(true);
    }
  });

  it("keeps original and updated analyses as separate rows", () => {
    const ids = analyses.map((analysis) => analysis.id);
    expect(new Set(ids).size).toBe(ids.length);
    const primary = analyses.find((analysis) => analysis.id === "db03-pfs-primary");
    const updated = analyses.find((analysis) => analysis.id === "db03-pfs-update");
    expect(primary?.hr).toBe("0.28");
    expect(updated?.hr).toBe("0.33");
    expect(updated?.priorAnalysisId).toBe(primary?.id);
    expect(analyses.find((analysis) => analysis.id === "pacific-os-pending")?.hr).toBeNull();
  });

  it("does not mark the placeholder trial as verified", () => {
    const placeholder = trials.find((trial) => trial.id === "impassion131");
    expect(placeholder?.placeholder).toBe(true);
    expect(placeholder?.resultVerified).toBe(false);
    expect(analyses.some((analysis) => analysis.trialId === "impassion131" && analysis.hr)).toBe(false);
  });

  it("stores no extracted efficacy on the review queue", () => {
    for (const update of updates) expect(update.extractedEfficacy).toBeNull();
  });

  it("points every regimen at a real publication", () => {
    for (const regimen of regimens) {
      expect(publications.some((publication) => publication.id === regimen.sourcePublicationId)).toBe(true);
    }
  });

  it("calculates descriptive month differences only from verified source values", () => {
    const cleopatra = analyses.find((analysis) => analysis.id === "cleopatra-pfs-primary");
    const pending = analyses.find((analysis) => analysis.id === "pacific-os-pending");
    expect(cleopatra && benefitSummary(cleopatra).display).toBe("+6.1 months median difference");
    expect(pending && benefitSummary(pending).display).toBe("Verification pending");
  });
});
