# Builds site/js/data.js from PubMed abstract text.
# Quotes must be sentences taken from RESULTS or FINDINGS. The script stops if a quote cannot be found.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$catalogPath = Join-Path $root "scripts\atlas-catalog.json"
$abstractPath = Join-Path $env:TEMP "onco-abstracts\all-utf8.txt"
$catalog = [System.IO.File]::ReadAllText($catalogPath) | ConvertFrom-Json

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
  $m = [regex]::Match($norm, "(?s)(?:RESULTS|FINDINGS):\s+(.+?)(?:\r?\n(?:CONCLUSIONS|CONCLUSION|INTERPRETATION):|\r?\nDOI:)")
  if (-not $m.Success) { return "" }
  return (Collapse $m.Groups[1].Value)
}

function Get-Methods([string]$record) {
  $norm = $record -replace "`r", ""
  $m = [regex]::Match($norm, "(?s)METHODS:\s+(.+?)(?:\r?\n(?:RESULTS|FINDINGS):)")
  if (-not $m.Success) { return "" }
  return (Collapse $m.Groups[1].Value)
}

function Has-Effect([string]$s) {
  return $s -match 'hazard ratio|Hazard ratio|partial response|complete response|objective response|major cytogenetic|percent vs|%'
}
function Pick-Quote([string]$flat, [string]$hint) {
  $sents = @(Get-Sentences $flat | Where-Object { $_ })
  $pool = $sents
  if ($hint) {
    $hinted = @($sents | Where-Object { $_.ToLower().Contains($hint.ToLower()) -and (Has-Effect $_) })
    if ($hinted.Count -gt 0) { $pool = $hinted }
  }
  $hit = $pool | Where-Object { $_ -match 'hazard ratio|Hazard ratio' } | Select-Object -First 1
  if (-not $hit) { $hit = $pool | Where-Object { Has-Effect $_ } | Select-Object -First 1 }
  if (-not $hit) { $hit = $sents | Where-Object { $_ -match 'hazard ratio|Hazard ratio' } | Select-Object -First 1 }
  if (-not $hit) { $hit = $sents | Select-Object -First 1 }
  $idx = 0
  for ($i = 0; $i -lt $sents.Count; $i++) { if ($sents[$i] -eq $hit) { $idx = $i; break } }
  if ($hit -and $hit -cmatch '^[a-z]' -and $idx -gt 0) { $hit = ("$($sents[$idx - 1]) $hit").Trim() }
  if ($hit -and $hit -notmatch 'hazard ratio|Hazard ratio' -and ($idx + 1) -lt $sents.Count -and $sents[$idx + 1] -match 'hazard ratio|Hazard ratio') {
    $hit = ("$hit $($sents[$idx + 1])").Trim()
  }
  if ($hit -match 'hazard ratio|Hazard ratio' -and $idx -gt 0 -and $sents[$idx - 1] -match 'median' -and $hit -notmatch 'median') {
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
  foreach ($id in $missing) {
    Start-Sleep -Milliseconds 400
    $url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&rettype=abstract&retmode=text&id=$id"
    $raw += "`n" + $wc.DownloadString($url)
  }
}

$records = @{}
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
foreach ($t in $catalog) {
  $primary = Pub $t.pmid "Primary report"
  $quote = Pick-Quote $primary.section $t.hint
  if (-not $quote) { throw "No quote for $($t.slug)" }
  if ($primary.section.IndexOf($quote) -lt 0) { throw "Quote is not inside the abstract for $($t.slug)" }
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
    $uq = Pick-Quote $up.section $u.hint
    if (-not $uq -or $up.section.IndexOf($uq) -lt 0) { throw "Bad update quote for $($t.slug)" }
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
  [ordered]@{ slug = "her2"; name = "HER2"; summary = "A growth-factor receptor used to choose antibodies and antibody-drug conjugates in breast and gastric trials in this atlas." },
  [ordered]@{ slug = "hr"; name = "Hormone receptor"; summary = "Estrogen-receptor or progesterone-receptor expression used to choose endocrine therapy in breast cancer." },
  [ordered]@{ slug = "brca"; name = "BRCA1 or BRCA2"; summary = "Germline variants used to choose PARP-inhibitor trials in breast, ovary, pancreas, and prostate." },
  [ordered]@{ slug = "egfr"; name = "EGFR"; summary = "A driver mutation in non-small-cell lung cancer used to choose EGFR tyrosine-kinase inhibitors." },
  [ordered]@{ slug = "alk"; name = "ALK"; summary = "A gene rearrangement in non-small-cell lung cancer used to choose ALK inhibitors." },
  [ordered]@{ slug = "pdl1"; name = "PD-L1"; summary = "A protein stain used in some immunotherapy trials to define the enrolled population." },
  [ordered]@{ slug = "msi"; name = "MSI-H or dMMR"; summary = "Mismatch-repair deficiency used to choose immunotherapy in colorectal and endometrial trials." },
  [ordered]@{ slug = "braf"; name = "BRAF V600E"; summary = "A mutation used to choose targeted therapy in the colorectal trial in this atlas." },
  [ordered]@{ slug = "flt3"; name = "FLT3"; summary = "A mutation used to choose midostaurin in the AML trial in this atlas." },
  [ordered]@{ slug = "bcr-abl"; name = "BCR-ABL1"; summary = "The fusion that defines chronic-phase CML in the imatinib trial." }
)

$data = [ordered]@{ builtOn = (Get-Date -Format "yyyy-MM-dd"); trials = $trials; biomarkers = $biomarkers }
$json = $data | ConvertTo-Json -Depth 8 -Compress
$js = "/* Generated from PubMed abstracts. Do not type result numbers by hand. */`nwindow.ATLAS_DATA = $json;`n"
$out = Join-Path $root "site\js\data.js"
[System.IO.File]::WriteAllText($out, $js, [System.Text.UTF8Encoding]::new($false))
Write-Output ("WROTE {0} trials, {1} bytes" -f $trials.Count, $js.Length)
