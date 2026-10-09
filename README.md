# Oncology Evidence Atlas

A browser atlas of practice-changing trials for DM Medical Oncology residents.

It is organised by cancer and by stage. Each trial opens as a PICO card, with the drugs, a dose only when the PubMed abstract states one, and the result as a sentence copied from that abstract.

This is for learning. It is not a prescribing guide and it does not replace a protocol or a current guideline.

## Open it on your computer

1. Open the `site` folder.
2. Double-click `index.html`.

No installation is required. Internet is used only when you open a PubMed or DOI link.

## What you can do

- Choose a cancer, then filter by stage and by biomarker (oldest trial first within each stage)
- Open **Biomarkers** to see every trial for one biomarker, organ by organ and stage by stage
- Open **Guidelines** for links to NCCN, ESMO, ASCO, ESGO, EAU, ASH and EHA guidelines (linked, not copied)
- Read PICO, the abstract quote, and the dose wording
- Search a trial or a drug
- Save a trial in this browser
- Flip flashcards

A result stays marked **Awaiting verification** until a clinician has checked the quote against the full paper.

## Adding trials

1. Add a line to `scripts/atlas-catalog-more.json` with the exact PubMed title in `q`, or the PMID in `pmid`.
2. Run `powershell -NoProfile -File .\scripts\resolve-pmids.ps1`. It accepts a PMID only when the PubMed title matches.
3. Run `powershell -NoProfile -File .\scripts\make-atlas.ps1`. It rebuilds `site/js/data.js` and skips any trial whose abstract has no results sentence.

## Published website

After this repository is pushed to `main`, GitHub Actions publishes the `site` folder.

The public address is:

https://drmaitreyi99-cyber.github.io/Maitu-oncotrial-Atlas/

In the repository, open **Settings → Pages** and set **Build and deployment** to **GitHub Actions** if it is not already set that way.
