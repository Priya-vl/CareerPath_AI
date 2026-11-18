# Applies a new CareerPath zip ON TOP of this folder (no need to delete anything).
# Usage, from this project folder:   .\update.ps1 "C:\Users\LOKESH\Downloads\careerpath-ai(1).zip"
# Keeps: .venv, node_modules, db.sqlite3, .env, .git
param([Parameter(Mandatory = $true)][string]$Zip)
$ErrorActionPreference = "Stop"
if (-not (Test-Path -LiteralPath $Zip)) { throw "Zip not found: $Zip" }
$tmp = Join-Path $env:TEMP ("careerpath_update_" + [guid]::NewGuid().ToString("N"))
Expand-Archive -LiteralPath $Zip -DestinationPath $tmp -Force
$src = Join-Path $tmp "careerpath"
if (-not (Test-Path -LiteralPath $src)) { $src = $tmp }
robocopy $src $PSScriptRoot /E /XD .venv node_modules __pycache__ .git /XF db.sqlite3 .env | Out-Null
$code = $LASTEXITCODE
Remove-Item -LiteralPath $tmp -Recurse -Force
if ($code -ge 8) { throw "Copy failed (robocopy code $code)" }
$global:LASTEXITCODE = 0
Write-Host "Updated. If the backend is running it reloads by itself, and so does the frontend."
Write-Host "Only if told: backend -> python manage.py migrate ; python manage.py seed_data   frontend -> npm install"
