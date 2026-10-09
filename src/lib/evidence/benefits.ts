import type { EndpointAnalysis } from "@/lib/types";

export interface BenefitSummary {
  medianDifferenceMonths: number | null;
  absoluteRateDifferencePoints: number | null;
  landmarkTime: string | null;
  display: string;
  caveat: string;
}

const MONTH_VALUE = /^\s*(\d+(?:\.\d+)?)\s+months?\s*$/i;
const RATE_VALUE = /(?:(\d+(?:\.\d+)?)\s*[- ]?(month|year)\s+[A-Z-]*\s*)?(\d+(?:\.\d+)?)%/i;
const VERSUS_RATES = /(?:(\d+(?:\.\d+)?)\s*[- ]?(month|year)\s+[A-Z-]*\s*)?(\d+(?:\.\d+)?)%\s+versus\s+(\d+(?:\.\d+)?)%/i;

function monthValue(value: string | null): number | null {
  const match = value?.match(MONTH_VALUE);
  return match ? Number(match[1]) : null;
}

function rateValue(value: string | null): { rate: number; time: string | null } | null {
  const match = value?.match(RATE_VALUE);
  if (!match) return null;
  return {
    rate: Number(match[3]),
    time: match[1] && match[2] ? `${match[1]}-${match[2].toLowerCase()}` : null,
  };
}

/**
 * Derives only arithmetic contrasts from already verified publication values.
 * A difference between medians is descriptive and is not an individual survival gain.
 */
export function benefitSummary(analysis: EndpointAnalysis): BenefitSummary {
  if (analysis.verificationStatus !== "verified_peer_reviewed") {
    return {
      medianDifferenceMonths: null,
      absoluteRateDifferencePoints: null,
      landmarkTime: null,
      display: "Verification pending",
      caveat: "No difference is calculated until a reviewer verifies both source values.",
    };
  }

  const experimentalMonths = monthValue(analysis.medianExperimental);
  const comparatorMonths = monthValue(analysis.medianComparator);
  if (experimentalMonths !== null && comparatorMonths !== null) {
    const difference = Number((experimentalMonths - comparatorMonths).toFixed(1));
    return {
      medianDifferenceMonths: difference,
      absoluteRateDifferencePoints: null,
      landmarkTime: null,
      display: `${difference >= 0 ? "+" : ""}${difference.toFixed(1)} months median difference`,
      caveat: "Descriptive subtraction of reported medians; it is not an estimate of added survival for an individual patient.",
    };
  }

  const experimentalRate = rateValue(analysis.medianExperimental);
  const comparatorRate = rateValue(analysis.medianComparator);
  if (experimentalRate && comparatorRate && experimentalRate.time === comparatorRate.time) {
    const difference = Number((experimentalRate.rate - comparatorRate.rate).toFixed(1));
    return {
      medianDifferenceMonths: null,
      absoluteRateDifferencePoints: difference,
      landmarkTime: experimentalRate.time,
      display: `${difference >= 0 ? "+" : ""}${difference.toFixed(1)} percentage points at ${experimentalRate.time}`,
      caveat: "Absolute difference between the reported landmark rates in this analysis.",
    };
  }

  const absoluteRates = analysis.absoluteBenefit?.match(VERSUS_RATES);
  if (absoluteRates) {
    const difference = Number((Number(absoluteRates[3]) - Number(absoluteRates[4])).toFixed(1));
    const time = absoluteRates[1] && absoluteRates[2]
      ? `${absoluteRates[1]}-${absoluteRates[2].toLowerCase()}`
      : null;
    return {
      medianDifferenceMonths: null,
      absoluteRateDifferencePoints: difference,
      landmarkTime: time,
      display: `${difference >= 0 ? "+" : ""}${difference.toFixed(1)} percentage points${time ? ` at ${time}` : ""}`,
      caveat: "Absolute difference between the reported landmark rates in this analysis.",
    };
  }

  if (analysis.absoluteBenefit && !/versus/i.test(analysis.absoluteBenefit)) {
    return {
      medianDifferenceMonths: null,
      absoluteRateDifferencePoints: null,
      landmarkTime: null,
      display: analysis.absoluteBenefit,
      caveat: "Absolute contrast reported by the source publication.",
    };
  }

  const reason =
    /not reached/i.test(analysis.medianExperimental ?? "") ||
    /not reached/i.test(analysis.medianComparator ?? "")
      ? "Median difference cannot be calculated because at least one median was not reached."
      : "A month or landmark-rate difference was not estimable from the verified values in this analysis.";

  return {
    medianDifferenceMonths: null,
    absoluteRateDifferencePoints: null,
    landmarkTime: null,
    display: "Not estimable",
    caveat: reason,
  };
}
