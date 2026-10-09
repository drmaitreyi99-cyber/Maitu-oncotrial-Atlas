$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$morePath = Join-Path $PSScriptRoot 'atlas-catalog-more.json'
$cachePath = Join-Path $PSScriptRoot 'pmid-cache.json'
$more = [System.IO.File]::ReadAllText($morePath) | ConvertFrom-Json
$cache = @{}
if (Test-Path $cachePath) {
  ([System.IO.File]::ReadAllText($cachePath) | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $cache[$_.Name] = $_.Value }
}

$wc = New-Object System.Net.WebClient
$wc.Encoding = [System.Text.Encoding]::UTF8
$wc.Headers.Add('User-Agent', 'MaituOncoAtlas/1.0')
$eu = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'

function Norm($s) { ($s.ToLowerInvariant() -replace '[^\p{L}\p{N}]', '') }

function Resolve-Title($q) {
  $words = ($q -replace '[^\p{L}\p{N}\- ]', ' ' -split '\s+' | Where-Object { $_.Length -gt 3 } | Select-Object -First 12) -join ' '
  $term = [uri]::EscapeDataString("($words)[Title]")
  Start-Sleep -Milliseconds 400
  $s = $wc.DownloadString("$eu/esearch.fcgi?db=pubmed&retmode=json&retmax=40&term=$term") | ConvertFrom-Json
  $ids = @($s.esearchresult.idlist)
  if ($ids.Count -eq 0) { return $null }
  Start-Sleep -Milliseconds 400
  $sum = $wc.DownloadString("$eu/esummary.fcgi?db=pubmed&retmode=json&id=$($ids -join ',')") | ConvertFrom-Json
  $nq = Norm $q
  $hits = @()
  foreach ($id in $ids) {
    $r = $sum.result.$id
    if (-not $r) { continue }
    $nt = Norm $r.title
    if ($nt -eq $nq -or ($nt.Length -gt 30 -and $nq.StartsWith($nt)) -or ($nq.Length -gt 30 -and $nt.StartsWith($nq))) {
      if (@($r.pubtype) -notcontains 'Published Erratum' -and @($r.pubtype) -notcontains 'Comment') { $hits += [int]$id }
    }
  }
  if ($hits.Count -eq 0) { return $null }
  return [string](($hits | Sort-Object)[0])
}

$missing = @()
foreach ($t in $more) {
  $items = @()
  if ($t.q -and -not $t.pmid) { $items += @{ key = $t.slug; q = $t.q } }
  foreach ($u in @($t.updates)) { if ($u -and $u.q -and -not $u.pmid) { $items += @{ key = "$($t.slug)#$($u.label)"; q = $u.q } } }
  foreach ($it in $items) {
    if ($cache.ContainsKey($it.key)) { continue }
    $p = Resolve-Title $it.q
    if ($p) { $cache[$it.key] = $p; Write-Host "OK   $($it.key) -> $p" }
    else { $missing += $it.key; Write-Host "MISS $($it.key)" }
  }
}

$ordered = [ordered]@{}
$cache.Keys | Sort-Object | ForEach-Object { $ordered[$_] = $cache[$_] }
[System.IO.File]::WriteAllText($cachePath, ($ordered | ConvertTo-Json), (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Resolved: $($cache.Count). Missing: $($missing.Count) $($missing -join ', ')"
