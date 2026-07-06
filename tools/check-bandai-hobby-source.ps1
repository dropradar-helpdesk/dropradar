$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$outDir = Join-Path $root "data\source-checks"
$outPath = Join-Path $outDir "bandai-spirits-products.json"
$diffPath = Join-Path $outDir "bandai-spirits-products-diff.json"
$historyDir = Join-Path $outDir "history"
$url = "https://www.bandaispirits.co.jp/products/"
$robotsUrl = "https://www.bandaispirits.co.jp/robots.txt"
$includeUrlPattern = "products|item|schedule|news|calendar|brand|ichibankuji|banpresto|tamashii|gashapon"

New-Item -ItemType Directory -Path $outDir -Force | Out-Null
New-Item -ItemType Directory -Path $historyDir -Force | Out-Null

$headers = @{
  "User-Agent" = "DropRadarPrototype/0.1 local source check"
}

function Get-Sha256Hex {
  param([string]$Text)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
  $hash = $sha.ComputeHash($bytes)
  -join ($hash | ForEach-Object { $_.ToString("x2") })
}

function ConvertTo-AbsoluteUrl {
  param(
    [string]$BaseUrl,
    [string]$Href
  )
  try {
    return ([System.Uri]::new([System.Uri]::new($BaseUrl), $Href)).AbsoluteUri
  } catch {
    return $Href
  }
}

function ConvertFrom-HtmlText {
  param([string]$Text)
  $withoutTags = [regex]::Replace($Text, "<[^>]+>", " ")
  $decoded = [System.Net.WebUtility]::HtmlDecode($withoutTags)
  [regex]::Replace($decoded, "\s+", " ").Trim()
}

function Get-ObjectValue {
  param(
    $Object,
    [string]$Name
  )
  if ($null -eq $Object) { return "" }
  $property = $Object.PSObject.Properties[$Name]
  if ($null -eq $property) { return "" }
  return [string]$property.Value
}

function Get-LinkKey {
  param($Link)
  if ($null -eq $Link) { return "" }
  return Get-ObjectValue $Link "url"
}

$previous = $null
if (Test-Path -LiteralPath $outPath) {
  try {
    $previous = Get-Content -Path $outPath -Raw -Encoding UTF8 | ConvertFrom-Json
  } catch {
    $previous = $null
  }
}

$robotsStatus = $null
$robotsSnippet = ""
try {
  $robots = Invoke-WebRequest -Uri $robotsUrl -Headers $headers -UseBasicParsing -TimeoutSec 20
  $robotsStatus = [int]$robots.StatusCode
  $robotsSnippet = ($robots.Content -split "`n" | Select-Object -First 20) -join "`n"
} catch {
  $robotsStatus = "unavailable"
  $robotsSnippet = $_.Exception.Message
}

$response = Invoke-WebRequest -Uri $url -Headers $headers -UseBasicParsing -TimeoutSec 30
$content = [string]$response.Content

$regexOptions = [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::Singleline
$titleMatch = [regex]::Match($content, "<title[^>]*>(.*?)</title>", $regexOptions)
$title = if ($titleMatch.Success) { ConvertFrom-HtmlText $titleMatch.Groups[1].Value } else { "" }

$rawLinks = @()
try {
  $rawLinks = @($response.Links)
} catch {
  $rawLinks = @()
}

$dq = [char]34
$sq = [char]39
$linkPattern = "<a[^>]+href=[$dq$sq]([^$dq$sq]+)[$dq$sq][^>]*>(.*?)</a>"
$anchorMatches = [regex]::Matches($content, $linkPattern, $regexOptions)
foreach ($match in $anchorMatches) {
  $href = [string]$match.Groups[1].Value
  if ([string]::IsNullOrWhiteSpace($href)) { continue }
  $rawLinks += [PSCustomObject]@{
    href = $href
    innerText = [string]$match.Groups[2].Value
  }
}

$links = $rawLinks |
  ForEach-Object {
    $href = Get-ObjectValue $_ "href"
    $text = ConvertFrom-HtmlText (Get-ObjectValue $_ "innerText")
    if ([string]::IsNullOrWhiteSpace($href)) { return }
    [PSCustomObject]@{
      text = $text
      url = ConvertTo-AbsoluteUrl $url $href
    }
  } |
  Where-Object {
    $_.url -like "*bandaispirits.co.jp*" -and $_.url -match $includeUrlPattern
  } |
  Sort-Object -Property url -Unique |
  Select-Object -First 40

$stableParts = @($title)
$stableParts += @($links | ForEach-Object { "$($_.url)|$($_.text)" })
$stableContent = $stableParts -join "`n"

$result = [PSCustomObject]@{
  sourceId = "bandai-hobby-kuji-prize"
  checkedAt = (Get-Date).ToString("o")
  sourceUrl = $url
  robotsUrl = $robotsUrl
  robotsStatus = $robotsStatus
  robotsSnippet = $robotsSnippet
  statusCode = [int]$response.StatusCode
  title = $title
  pageSha256 = Get-Sha256Hex $content
  contentSha256 = Get-Sha256Hex $stableContent
  candidateLinks = @($links)
  note = "Manual local source check only. Diff hash is based on title and candidate links, not the full dynamic page."
}

$previousLinks = @()
if ($previous -and $previous.PSObject.Properties.Name -contains "candidateLinks") {
  $previousLinks = @($previous.candidateLinks)
}

$currentLinks = @($links)
$previousUrls = @($previousLinks | ForEach-Object { Get-LinkKey $_ } | Where-Object { $_ })
$currentUrls = @($currentLinks | ForEach-Object { Get-LinkKey $_ } | Where-Object { $_ })

$addedUrls = @($currentUrls | Where-Object { $previousUrls -notcontains $_ })
$removedUrls = @($previousUrls | Where-Object { $currentUrls -notcontains $_ })

$addedLinks = @($currentLinks | Where-Object { $addedUrls -contains $_.url })
$removedLinks = @($previousLinks | Where-Object { $removedUrls -contains $_.url })
$hashChanged = $true
if ($previous -and $previous.PSObject.Properties.Name -contains "contentSha256") {
  $hashChanged = [string]$previous.contentSha256 -ne [string]$result.contentSha256
}

$diff = [PSCustomObject]@{
  sourceId = $result.sourceId
  sourceUrl = $result.sourceUrl
  checkedAt = $result.checkedAt
  previousCheckedAt = if ($previous) { $previous.checkedAt } else { $null }
  firstRun = $null -eq $previous
  statusCode = $result.statusCode
  robotsStatus = $result.robotsStatus
  title = $result.title
  previousContentSha256 = if ($previous) { $previous.contentSha256 } else { $null }
  currentContentSha256 = $result.contentSha256
  hashChanged = $hashChanged
  previousLinkCount = @($previousLinks).Count
  currentLinkCount = @($currentLinks).Count
  addedCount = @($addedLinks).Count
  removedCount = @($removedLinks).Count
  addedLinks = @($addedLinks)
  removedLinks = @($removedLinks)
  note = "Diff is based on candidate official links and a stable title/link hash. Human review is required before publishing as official news."
}

$result | ConvertTo-Json -Depth 8 | Set-Content -Path $outPath -Encoding UTF8
$diff | ConvertTo-Json -Depth 8 | Set-Content -Path $diffPath -Encoding UTF8

$historyStamp = (Get-Date).ToString("yyyyMMdd-HHmmss")
$historyPath = Join-Path $historyDir "bandai-spirits-products-$historyStamp.json"
$diff | ConvertTo-Json -Depth 8 | Set-Content -Path $historyPath -Encoding UTF8

Write-Host "Saved source check:"
Write-Host $outPath
Write-Host "Saved diff:"
Write-Host $diffPath
Write-Host "Candidate links:" @($links).Count
Write-Host "Added:" @($addedLinks).Count "Removed:" @($removedLinks).Count "HashChanged:" $hashChanged
