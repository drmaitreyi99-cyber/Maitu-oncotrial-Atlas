# MAITU ONCOTRIAL ATLAS

From Landmark Trials to Latest Breakthroughs.  
Master Oncology Trials. Master Your Exams.

A local study application for DM/DNB Medical Oncology residents, ESMO candidates, fellows, and teachers. It opens in the browser. You do not need to write code to use it.

This is an educational atlas, not a prescribing guide. It does not replace a protocol or a current guideline.

## Open the app on Windows

1. Install Node.js from [https://nodejs.org](https://nodejs.org) (the LTS version).
2. Open this folder.
3. In the address bar of the folder, type `powershell` and press Enter.
4. Run:

```powershell
npm install
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000).

Other checks:

```powershell
npm test
npm run typecheck
npm run lint
```

## Browser-only demo sign-in

The GitHub Pages app has no server or database. Bookmarks, reviews, revision scores, and the demonstration session stay in each visitor's browser.

- Resident demo: `resident@maitu.demo` / `atlas`
- Reviewer-interface demo: `reviewer@maitu.demo` / `review`

The reviewer interface is not secure authentication and must not be used for confidential records. It is only a user-interface demonstration.

## What is verified

Breast, lung, ovarian, and cervical landmark trials are seeded from cited papers. A figure is shown only when its analysis is marked peer-reviewed and linked to a publication, endpoint definition, and, when available, a cutoff date.

If a dose, hazard ratio, or follow-up result was not confirmed for this seed, the screen says **Verification pending**. The app does not guess it.

Primary results and later overall-survival or progression-free survival updates are stored as separate rows. An update does not overwrite the first analysis.

Questions, flashcards, and viva answers are generated from those stored records. They are original items for this atlas. They are not copies of ESMO or university papers.

## Automated literature discovery

The GitHub Actions deployment workflow searches:

- PubMed E-utilities
- ClinicalTrials.gov API version 2
- Crossref

The workflow runs daily at 02:15 UTC, generates `public/data/discovery.json`, builds the static website, and publishes it to GitHub Pages. The browser reads that generated file; it does not call a private backend.

Discovery is metadata-only. It never publishes extracted efficacy. Conference feeds for ESMO, ASCO, ASH, ELCC, WCLC, EHA, and SABCS stay off unless you have a licensed source.

## Publish on GitHub Pages

1. Push this project to a GitHub repository whose default branch is `main`.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **GitHub Actions**.
4. Open **Actions** and run **Deploy Maitu OncoTrial Atlas**, or push to `main`.
5. The workflow tests the evidence logic, builds the static export in `out`, and publishes it.

No database, server, Vercel account, or paid hosting is required.

To refresh discovery data locally:

```powershell
npm run discover
npm run build
```

The build is a static export. Open it locally with:

```powershell
npm run preview
```

## Where to read next

- Trial cards: Organ library, then a trial name
- Timeline: Historical Trial Timeline
- Comparison: Trial Comparison, with the cross-trial warning
- Practice: Flashcards, MCQ bank, Viva, Mock examinations, Revision planner, Error notebook
