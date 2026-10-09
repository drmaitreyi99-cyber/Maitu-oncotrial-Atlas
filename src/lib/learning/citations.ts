import type { Publication } from "@/lib/types";

export function vancouver(publication: Publication): string {
  const author = publication.authors.trim();
  const journal = publication.journal;
  const year = publication.year;
  const locator = [publication.volume, publication.pages].filter(Boolean).join(":");
  const tail = [
    locator ? `${year};${locator}` : String(year),
    publication.doi ? `doi:${publication.doi}` : null,
    publication.pmid ? `PMID:${publication.pmid}` : null,
  ]
    .filter(Boolean)
    .join(". ");
  return `${author} ${publication.title}. ${journal}. ${tail}.`;
}
