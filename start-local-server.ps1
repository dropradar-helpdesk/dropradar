$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$port = 8765
$python = Get-Command python -ErrorAction SilentlyContinue
$py = Get-Command py -ErrorAction SilentlyContinue

Write-Host "DropRadar local server"
Write-Host "Folder: $root"
Write-Host "URL: http://127.0.0.1:$port/"
Write-Host ""

if ($python) {
  & python -m http.server $port --bind 127.0.0.1
} elseif ($py) {
  & py -m http.server $port --bind 127.0.0.1
} else {
  throw "Python was not found. Install Python or use another static file server."
}
