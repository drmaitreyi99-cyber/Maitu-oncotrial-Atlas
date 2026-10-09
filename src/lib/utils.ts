import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { VerificationStatus } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function displayStat(status: VerificationStatus, value: string | null | undefined): string {
  if (status !== "verified_peer_reviewed" || value == null || value.trim() === "") {
    return "Verification pending";
  }
  return value;
}

export function publicationLink(doi: string | null, pmid: string | null, url: string | null): string | null {
  if (doi) return `https://doi.org/${doi}`;
  if (pmid) return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
  return url;
}

export function normalizeStem(stem: string): string {
  return stem.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function todayIso(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function statusLabel(status: VerificationStatus): string {
  switch (status) {
    case "verified_peer_reviewed":
      return "Peer-reviewed";
    case "verification_pending":
      return "Verification pending";
    case "conference_abstract":
      return "Conference abstract";
    case "press_release":
      return "Press release";
    case "unpublished":
      return "Unpublished";
  }
}
