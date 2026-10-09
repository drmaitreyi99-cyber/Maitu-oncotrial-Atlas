# Builds site/js/data.js from PubMed abstract text.
# Quotes must be sentences taken from RESULTS or FINDINGS. The script stops if a quote cannot be found.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$catalogPath = Join-Path $root "scripts\atlas-catalog.json"
$abstractPath = Join-Path $env:TEMP "onco-abstracts\all-utf8.txt"
$parsed = [System.IO.File]::ReadAllText($catalogPath) | ConvertFrom-Json
$catalog = @()
foreach ($t in $parsed) { $catalog += $t }
$morePath = Join-Path $root "scripts\atlas-catalog-more.json"
$cachePath = Join-Path $root "scripts\pmid-cache.json"
$pmidCache = [System.IO.File]::ReadAllText($cachePath) | ConvertFrom-Json
$endpointNames = @{ OS = "overall survival"; PFS = "progression-free survival"; EFS = "event-free survival"; DFS = "disease-free survival"; IDFS = "invasive disease-free survival"; RFS = "recurrence-free survival"; ORR = "objective response"; pCR = "pathological complete response"; OTHER = "the primary end point named in the paper" }
$extraUpdates = @{
  "checkmate-816" = @([pscustomobject]@{ pmid = "40454642"; endpoint = "OS"; label = "Overall survival" })
  "checkmate-238" = @([pscustomobject]@{ pmid = "41124198"; endpoint = "OS"; label = "Long-term follow-up" })
  "keynote-522" = @([pscustomobject]@{ pmid = "39282906"; endpoint = "OS"; label = "Overall survival" })
}
foreach ($t in $catalog) {
  if ($extraUpdates.ContainsKey($t.slug)) { $t | Add-Member -NotePropertyName updates -NotePropertyValue (@($t.updates | Where-Object { $_ }) + $extraUpdates[$t.slug]) -Force }
  $t | Add-Member -NotePropertyName curated -NotePropertyValue $true -Force
}
$moreParsed = [System.IO.File]::ReadAllText($morePath) | ConvertFrom-Json
foreach ($t in $moreParsed) {
  if (-not $t.pmid) {
    $cached = $pmidCache.($t.slug)
    if (-not $cached) { Write-Output "SKIP $($t.slug): no verified PMID"; continue }
    $t | Add-Member -NotePropertyName pmid -NotePropertyValue $cached -Force
  }
  $ep = $endpointNames[[string]$t.endpoint]
  if (-not $ep) { throw "Unknown endpoint '$($t.endpoint)' for $($t.slug)" }
  $lc = { param($s) if ($s.Length -gt 1 -and [char]::IsLower($s[1])) { $s.Substring(0,1).ToLower() + $s.Substring(1) } else { $s } }
  $defaults = [ordered]@{
    phase = "III"; result = "POSITIVE"; landmark = $false; hint = $null
    question = $(if ($t.ctrl -match '^None') { "In $(& $lc $t.setting), what ${ep} did $(& $lc $t.exp) achieve?" } else { "In $(& $lc $t.setting), how does $(& $lc $t.exp) compare with $(& $lc $t.ctrl) for ${ep}?" })
    population = "$($t.setting)."; intervention = "$($t.exp)."; comparator = "$($t.ctrl)."
    outcomes = "Primary end point: $ep, as defined in the paper."
    implications = "Check the current NCCN, ESMO, ASCO, or ESGO guideline for how this trial is used today. Guidelines change faster than this card."
    pearl = $null; strengths = @()
  }
  foreach ($k in $defaults.Keys) { if ($null -eq $t.$k) { $t | Add-Member -NotePropertyName $k -NotePropertyValue $defaults[$k] -Force } }
  $t | Add-Member -NotePropertyName curated -NotePropertyValue $false -Force
  $catalog += $t
}

function Collapse([string]$s) { return (($s -replace "\s+", " ").Trim()) }

function Get-Sentences([string]$flat) {
  $list = New-Object System.Collections.Generic.List[string]
  $start = 0
  for ($i = 0; $i -lt $flat.Length; $i++) {
    if ($flat[$i] -ne '.') { continue }
    $prev = if ($i -gt 0) { $flat[$i - 1] } else { ' ' }
    $next = if ($i + 2 -lt $flat.Length) { $flat[$i + 2] } else { ' ' }
    $gap = if ($i + 1 -lt $flat.Length) { $flat[$i + 1] } else { ' ' }
    if ($gap -eq ' ' -and $prev -match '[a-zA-Z\)%]' -and $next -match '[A-Z]') {
      $list.Add($flat.Substring($start, $i - $start + 1).Trim())
      $start = $i + 2
    }
  }
  if ($start -lt $flat.Length) { $list.Add($flat.Substring($start).Trim()) }
  return $list
}

function Get-Section([string]$record) {
  $norm = $record -replace "`r", ""
  $m = [regex]::Match($norm, "(?s)(?:RESULTS|FINDINGS):\s+(.+?)(?:\r?\n(?:CONCLUSIONS|CONCLUSION|INTERPRETATION|DISCUSSION):|\r?\nDOI:|\r?\nPMID:)")
  if ($m.Success) { return (Collapse $m.Groups[1].Value) }
  if ($norm -match "(?m)^(BACKGROUND|METHODS|PURPOSE|OBJECTIVE|RESULTS|FINDINGS):\s") { return "" }
  $paras = @($norm -split "\n\s*\n" | Select-Object -Skip 3 | Where-Object { $_ -notmatch '^\s*(Author information|Comment in|Erratum|Update of|Update in|Copyright|©|DOI:|PMID:|Conflict of interest|Collaborators)' })
  $best = $paras | Sort-Object { $_.Length } -Descending | Select-Object -First 1
  if ($best -and $best.Length -gt 300) { return (Collapse $best) }
  return ""
}

function Get-Methods([string]$record) {
  $norm = $record -replace "`r", ""
  $m = [regex]::Match($norm, "(?s)METHODS:\s+(.+?)(?:\r?\n(?:RESULTS|FINDINGS):)")
  if (-not $m.Success) { return "" }
  return (Collapse $m.Groups[1].Value)
}

function Has-Effect([string]$s) {
  return $s -match 'hazard ratio|Hazard ratio|\bHR\b|relative risk|odds ratio|partial response|complete response|objective response|major cytogenetic|percent|%|P\s*[<=]|P less than'
}
function Has-Ratio([string]$s) { return $s -match 'hazard ratio|Hazard ratio|\bHR\b|relative risk|odds ratio' }
function Pick-Quote([string]$flat, [string]$hint) {
  $sents = @(Get-Sentences $flat | Where-Object { $_ })
  $pool = $sents
  if ($hint) {
    $hinted = @($sents | Where-Object { $_.ToLower().Contains($hint.ToLower()) -and (Has-Effect $_) })
    if ($hinted.Count -gt 0) { $pool = $hinted }
  }
  $hit = $pool | Where-Object { Has-Ratio $_ } | Select-Object -First 1
  if (-not $hit) { $hit = $pool | Where-Object { (Has-Effect $_) -and $_ -notmatch '^(A total of|Of the|The analysis included|We enrolled|Overall, \d+ patients)' } | Select-Object -First 1 }
  if (-not $hit) { $hit = $sents | Where-Object { Has-Ratio $_ } | Select-Object -First 1 }
  if (-not $hit) { $hit = $sents | Select-Object -First 1 }
  $idx = 0
  for ($i = 0; $i -lt $sents.Count; $i++) { if ($sents[$i] -eq $hit) { $idx = $i; break } }
  if ($hit -and $hit -cmatch '^([a-z]|Of these|These |This |In these )' -and $idx -gt 0) { $hit = ("$($sents[$idx - 1]) $hit").Trim() }
  if ($hit -and $hit -notmatch 'hazard ratio|Hazard ratio' -and ($idx + 1) -lt $sents.Count -and $sents[$idx + 1] -match 'hazard ratio|Hazard ratio') {
    $hit = ("$hit $($sents[$idx + 1])").Trim()
  }
  if ($hit -match 'hazard ratio|Hazard ratio' -and $idx -gt 0 -and $sents[$idx - 1] -match 'median (overall|progression|event|disease|recurrence|relapse|metastasis|duration|survival|time to)' -and $hit -notmatch 'median') {
    $hit = ("$($sents[$idx - 1]) $hit").Trim()
  }
  return $hit
}

function Dose-Sentence([string]$methods, [string]$drug) {
  if (-not $methods -or $methods -notmatch 'mg') { return "" }
  $mg = [regex]::Match($methods, '\d[\d\.·]*\s*mg')
  if (-not $mg.Success) { return "" }
  $idx = [Math]::Max(0, $mg.Index - 28)
  if ($drug) {
    $best = $null
    $bestDist = 9999
    foreach ($tok in ($drug -split '[^A-Za-z]+')) {
      if ($tok.Length -lt 5) { continue }
      $at = $methods.ToLower().IndexOf($tok.ToLower())
      if ($at -lt 0) { continue }
      $dist = [Math]::Abs($at - $mg.Index)
      if ($dist -lt $bestDist -and $dist -le 160) { $best = $at; $bestDist = $dist }
    }
    if ($null -ne $best) { $idx = $best }
  }
  function Snap([int]$at) {
    if ($at -gt 0 -and $methods[$at - 1] -match '[A-Za-z0-9]') {
      $space = $methods.LastIndexOf(' ', $at)
      if ($space -ge 0) { return $space + 1 }
    }
    return $at
  }
  $idx = Snap $idx
  $len = [Math]::Min(260, $methods.Length - $idx)
  $excerpt = $methods.Substring($idx, $len)
  $mgAt = $excerpt.ToLower().IndexOf('mg')
  if ($mgAt -lt 0) {
    $idx = Snap ([Math]::Max(0, $mg.Index - 48))
    $excerpt = $methods.Substring($idx, [Math]::Min(220, $methods.Length - $idx))
    $mgAt = $excerpt.ToLower().IndexOf('mg')
  }
  if ($mgAt -ge 0) {
    $period = $excerpt.IndexOf('. ', $mgAt)
    if ($period -gt 0) { $excerpt = $excerpt.Substring(0, $period + 1) }
  }
  if ($excerpt.Length -gt 220) {
    $space = $excerpt.LastIndexOf(' ')
    if ($space -gt 140) { $excerpt = $excerpt.Substring(0, $space) }
  }
  $excerpt = $excerpt.Trim().TrimEnd(',')
  if ($excerpt -notmatch 'mg' -or $methods.IndexOf($excerpt) -lt 0) { return "" }
  return $excerpt
}

$raw = [System.IO.File]::ReadAllText($abstractPath)
$needed = @()
foreach ($t in $catalog) {
  $needed += [string]$t.pmid
  foreach ($u in @($t.updates)) { if ($u.pmid) { $needed += [string]$u.pmid } }
}
$missing = $needed | Select-Object -Unique | Where-Object { $raw -notmatch ("PMID:\s*" + $_ + "\b") }
if ($missing) {
  $wc = New-Object System.Net.WebClient
  $wc.Encoding = [System.Text.Encoding]::UTF8
  $wc.Headers.Add("User-Agent", "MaituOncoAtlas/1.0")
  $missing = @($missing)
  for ($i = 0; $i -lt $missing.Count; $i += 50) {
    $batch = $missing[$i..([Math]::Min($i + 49, $missing.Count - 1))] -join ','
    Start-Sleep -Milliseconds 500
    $url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&rettype=abstract&retmode=text&id=$batch"
    $raw += "`n`n" + $wc.DownloadString($url)
  }
  [System.IO.File]::WriteAllText($abstractPath, $raw, [System.Text.UTF8Encoding]::new($false))
}

$records = @{}
$raw = [regex]::Replace($raw, '(PMID:\s*\d+(?:\s*\[[^\]\n]+\])?)(?=\d+\.\s)', "`$1`n`n")
$parts = [regex]::Split($raw, '(?m)^(?=\d+\. )')
foreach ($p in $parts) {
  if ($p -match 'PMID:\s*(\d+)') { $records[$Matches[1]] = ($p -replace "`r", "") }
}

function Pub([string]$pmid, [string]$label) {
  $p = $records[$pmid]
  if (-not $p) { throw "Missing abstract for $pmid" }
  $titleM = [regex]::Match($p, "(?s)\n\n(.+?)\n\n")
  $title = if ($titleM.Success) { Collapse $titleM.Groups[1].Value } else { "" }
  $author = ""
  $authorPattern = "((?:van der |van den |van |de |da |di )?[A-Z][\p{L}'\-]+)\s+[A-Z]{1,4}\s*\(1\)"
  $am = [regex]::Match($p, "(?m)^$authorPattern")
  if (-not $am.Success) { $am = [regex]::Match($p, $authorPattern) }
  if ($am.Success) { $author = $am.Groups[1].Value.Trim() }
  $head = (($p -split "`n") | Where-Object { $_.Trim() } | Select-Object -First 1)
  $journal = "Peer-reviewed journal"
  $year = $null
  if ($head -match '^(?:\d+\.\s*)?(?<j>.+?)\.\s+(?<y>\d{4})') { $journal = $Matches['j'].Trim(); $year = [int]$Matches['y'] }
  $doi = ""
  if ($p -match 'doi:\s*(\S+)') { $doi = $Matches[1].TrimEnd('.') }
  $nct = ""
  if ($p -match '(NCT\d{8})') { $nct = $Matches[1] }
  return [pscustomobject]@{ pmid = $pmid; title = $title; author = $author; journal = $journal; year = $year; doi = $doi; nct = $nct; label = $label; section = (Get-Section $p); methods = (Get-Methods $p) }
}

$trials = @()
$skipped = @()
foreach ($t in $catalog) {
  $primary = Pub $t.pmid "Primary report"
  $quote = if ($primary.section) { Pick-Quote $primary.section $t.hint } else { $null }  if (-not $quote -or $primary.section.IndexOf($quote) -lt 0) {
    if ($t.curated) { throw "No verifiable quote for $($t.slug)" }
    Write-Output "SKIP $($t.slug): no results sentence in the PubMed abstract (section $($primary.section.Length) chars)"
    $skipped += $t.slug
    continue
  }
  if (-not $t.curated -and @($t.strengths).Count -eq 0) {
    $s = @()
    if ($t.ctrl -notmatch '^None') { $s += "Randomised comparison against $(& $lc $t.ctrl)." }
    $s += "Published in $($primary.journal) ($($primary.year))."
    $t.strengths = $s
  }
  $dose = Dose-Sentence $primary.methods $t.exp
  $expDose = if ($dose) { $dose } else { "The PubMed abstract does not state a milligram dose. Read the full paper or the current label before using a dose." }
  $outcomes = @([ordered]@{
    endpoint = $t.endpoint; analysisLabel = "Abstract of the primary report"; isPrimary = $true
    expLabel = $t.exp; ctrlLabel = $t.ctrl; experimentalValue = $null; controlValue = $null
    pmid = [string]$t.pmid; sourceQuote = $quote
  })
  $pubs = @([ordered]@{ pmid = [string]$t.pmid; title = $primary.title; author = $primary.author; journal = $primary.journal; year = $primary.year; doi = $primary.doi; label = "Primary report" })
  $nct = $primary.nct
  foreach ($u in @($t.updates)) {
    if (-not $u.pmid) { continue }
    $up = Pub $u.pmid $u.label
    $uq = if ($up.section) { Pick-Quote $up.section $u.hint } else { $null }
    if (-not $uq -or $up.section.IndexOf($uq) -lt 0) { Write-Output "SKIP update $($u.pmid) for $($t.slug)"; continue }
    $outcomes += [ordered]@{
      endpoint = $u.endpoint; analysisLabel = $u.label; isPrimary = $false
      expLabel = $t.exp; ctrlLabel = $t.ctrl; experimentalValue = $null; controlValue = $null
      pmid = [string]$u.pmid; sourceQuote = $uq
    }
    $pubs += [ordered]@{ pmid = [string]$u.pmid; title = $up.title; author = $up.author; journal = $up.journal; year = $up.year; doi = $up.doi; label = $u.label }
    if (-not $nct -and $up.nct) { $nct = $up.nct }
  }
  $trials += [ordered]@{
    slug = $t.slug; acronym = $t.acronym; title = $primary.title; disease = $t.disease; setting = $t.setting
    stages = @($t.stages); phase = $t.phase; year = $primary.year; result = $t.result; landmark = [bool]$t.landmark
    biomarkers = @($t.biomarkers); question = $t.question
    pico = [ordered]@{ population = $t.population; intervention = $t.intervention; comparator = $t.comparator; outcomes = $t.outcomes }
    arms = @(
      [ordered]@{ label = $t.exp; role = "EXPERIMENTAL"; dosing = $expDose; doseQuote = $(if ($dose) { $dose } else { $null }) },
      [ordered]@{ label = $t.ctrl; role = "CONTROL"; dosing = "Comparator as named in the abstract."; doseQuote = $null }
    )
    publications = $pubs; outcomes = $outcomes; nct = $(if ($nct) { $nct } else { $null })
    strengths = @($t.strengths)
    limitations = @(
      "Numbers on this card are from the PubMed abstract, not a re-analysis of the full paper.",
      "A later publication or a guideline may have changed how the result is used."
    )
    implications = $t.implications; pearl = $t.pearl
  }
  Write-Output ("OK {0} :: {1}" -f $t.slug, $(if ($quote.Length -gt 140) { $quote.Substring(0,140) } else { $quote }))
}

$biomarkers = @(
  [ordered]@{ slug = "her2"; name = "HER2"; summary = "Amplification, overexpression, or mutation used to choose anti-HER2 antibodies, kinase inhibitors, and antibody-drug conjugates." },
  [ordered]@{ slug = "her2-low"; name = "HER2-low / ultralow"; summary = "Low HER2 immunohistochemistry without amplification, used to select trastuzumab deruxtecan in breast cancer." },
  [ordered]@{ slug = "hr"; name = "Hormone receptor"; summary = "Estrogen-receptor or progesterone-receptor expression used to choose endocrine therapy in breast cancer." },
  [ordered]@{ slug = "esr1"; name = "ESR1 mutation"; summary = "An acquired estrogen-receptor mutation, often found in ctDNA, used to select oral SERDs and PROTACs." },
  [ordered]@{ slug = "pik3ca"; name = "PIK3CA / AKT pathway"; summary = "PI3K-pathway alterations used to select alpelisib, capivasertib, inavolisib, and aspirin trials." },
  [ordered]@{ slug = "genomic"; name = "Genomic risk score"; summary = "Multigene expression assays (21-gene, 70-gene) used to decide on adjuvant chemotherapy." },
  [ordered]@{ slug = "brca"; name = "BRCA1 or BRCA2"; summary = "Germline or somatic variants used to choose PARP inhibitors in breast, ovary, pancreas, and prostate." },
  [ordered]@{ slug = "hrd"; name = "HRD"; summary = "Homologous-recombination deficiency beyond BRCA, used to select PARP-inhibitor maintenance in ovarian cancer." },
  [ordered]@{ slug = "hrr"; name = "HRR gene alteration"; summary = "Homologous-recombination repair gene alterations used to select PARP-inhibitor combinations in prostate cancer." },
  [ordered]@{ slug = "egfr"; name = "EGFR"; summary = "Activating mutations, including exon 20 insertions, used to choose EGFR-targeted therapy in NSCLC." },
  [ordered]@{ slug = "alk"; name = "ALK"; summary = "A gene rearrangement in NSCLC used to choose ALK inhibitors." },
  [ordered]@{ slug = "ros1"; name = "ROS1"; summary = "A gene rearrangement in NSCLC used to choose ROS1 inhibitors." },
  [ordered]@{ slug = "ret"; name = "RET"; summary = "Fusions in NSCLC and mutations in medullary thyroid cancer used to choose selective RET inhibitors." },
  [ordered]@{ slug = "met"; name = "MET"; summary = "MET exon 14 skipping or amplification used to choose MET inhibitors." },
  [ordered]@{ slug = "ntrk"; name = "NTRK fusion"; summary = "A tumour-agnostic fusion used to choose TRK inhibitors." },
  [ordered]@{ slug = "kras"; name = "KRAS"; summary = "KRAS G12C and other KRAS alterations used to choose direct KRAS inhibitors." },
  [ordered]@{ slug = "ras"; name = "RAS wild-type"; summary = "Extended RAS testing used to select anti-EGFR antibodies in colorectal cancer." },
  [ordered]@{ slug = "braf"; name = "BRAF V600"; summary = "A mutation used to choose BRAF-directed therapy in melanoma, NSCLC, and colorectal cancer." },
  [ordered]@{ slug = "pdl1"; name = "PD-L1"; summary = "A protein stain (TPS or CPS) used in immunotherapy trials to define the enrolled population or subgroups." },
  [ordered]@{ slug = "msi"; name = "MSI-H or dMMR"; summary = "Mismatch-repair deficiency used to choose immunotherapy across colorectal, endometrial, and other tumours." },
  [ordered]@{ slug = "cldn18"; name = "Claudin 18.2"; summary = "A tight-junction protein used to select zolbetuximab in gastric cancer." },
  [ordered]@{ slug = "fgfr"; name = "FGFR"; summary = "FGFR2 fusions in cholangiocarcinoma and FGFR3 alterations in urothelial cancer used to choose FGFR inhibitors." },
  [ordered]@{ slug = "idh"; name = "IDH1 or IDH2"; summary = "Mutations used to choose IDH inhibitors in cholangiocarcinoma, glioma, and AML." },
  [ordered]@{ slug = "folr1"; name = "Folate receptor alpha"; summary = "High FRα expression used to select mirvetuximab soravtansine in ovarian cancer." },
  [ordered]@{ slug = "hpv"; name = "HPV / p16"; summary = "HPV-associated oropharyngeal cancer, studied in de-escalation trials." },
  [ordered]@{ slug = "ctdna"; name = "ctDNA"; summary = "Circulating tumour DNA used to detect resistance mutations or minimal residual disease and guide therapy." },
  [ordered]@{ slug = "psma"; name = "PSMA"; summary = "PSMA PET positivity used to select lutetium-177 PSMA radioligand therapy." },
  [ordered]@{ slug = "sstr"; name = "Somatostatin receptor"; summary = "SSTR expression on imaging used to select peptide-receptor radionuclide therapy in NETs." },
  [ordered]@{ slug = "mgmt"; name = "MGMT methylation"; summary = "Promoter methylation that predicts temozolomide benefit in glioblastoma." },
  [ordered]@{ slug = "kit"; name = "KIT / PDGFRA"; summary = "Driver mutations in GIST that underpin imatinib and later-line kinase inhibitors." },
  [ordered]@{ slug = "dll3"; name = "DLL3"; summary = "A surface target in small-cell lung cancer used by tarlatamab." },
  [ordered]@{ slug = "tissue-factor"; name = "Tissue factor"; summary = "A surface target used by tisotumab vedotin in cervical cancer." },
  [ordered]@{ slug = "hla-a2"; name = "HLA-A*02:01"; summary = "The HLA type required for tebentafusp in uveal melanoma." },
  [ordered]@{ slug = "flt3"; name = "FLT3"; summary = "FLT3-ITD or TKD mutations used to choose FLT3 inhibitors in AML." },
  [ordered]@{ slug = "pml-rara"; name = "PML-RARA"; summary = "The fusion that defines acute promyelocytic leukaemia and its ATRA plus arsenic therapy." },
  [ordered]@{ slug = "bcr-abl"; name = "BCR-ABL1"; summary = "The fusion that defines CML and Ph-positive ALL, targeted by tyrosine-kinase inhibitors." },
  [ordered]@{ slug = "tp53"; name = "TP53 / del(17p)"; summary = "High-risk genetics in CLL that change the choice of first-line therapy." },
  [ordered]@{ slug = "cd19"; name = "CD19"; summary = "A B-cell antigen targeted by blinatumomab and CAR-T cells." },
  [ordered]@{ slug = "cd22"; name = "CD22"; summary = "A B-cell antigen targeted by inotuzumab ozogamicin." },
  [ordered]@{ slug = "cd30"; name = "CD30"; summary = "A Hodgkin and anaplastic lymphoma antigen targeted by brentuximab vedotin." },
  [ordered]@{ slug = "bcma"; name = "BCMA"; summary = "A plasma-cell antigen targeted by CAR-T cells and bispecific antibodies in myeloma." },
  [ordered]@{ slug = "mrd"; name = "MRD"; summary = "Measurable residual disease used to stratify or guide therapy in leukaemia and myeloma." }
)

$data = [ordered]@{ builtOn = (Get-Date -Format "yyyy-MM-dd"); trials = $trials; biomarkers = $biomarkers }
$json = $data | ConvertTo-Json -Depth 8 -Compress
$js = "/* Generated from PubMed abstracts. Do not type result numbers by hand. */`nwindow.ATLAS_DATA = $json;`n"
$out = Join-Path $root "site\js\data.js"
[System.IO.File]::WriteAllText($out, $js, [System.Text.UTF8Encoding]::new($false))
Write-Output ("WROTE {0} trials, {1} bytes. Skipped: {2}" -f $trials.Count, $js.Length, ($skipped -join ', '))
