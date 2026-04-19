# Bootstrap QMD contexts for this repository.
# Usage (from repo root): .\qmd-context-bootstrap.ps1

$ErrorActionPreference = "Continue"
$qmd = "qmd.cmd"
$collectionName = "math"

function Get-CollectionName {
    param([string]$PreferredName)

    $out = (& $qmd collection add . --name $PreferredName --mask "**/*.md") 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0) {
        return $PreferredName
    }

    # Reuse existing collection shown in qmd error output.
    if ($out -match 'Name:\s+([^\s\(]+)') {
        return $Matches[1]
    }

    throw "Failed to resolve collection name. qmd output:`n$out"
}

function Add-QmdContext {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Text
    )

    Write-Host "Adding context: $Path"
    $out = (& $qmd context add -- $Path $Text) 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) {
        if ($out -match 'already exists|duplicate|conflict') {
            Write-Host "Skipped existing context: $Path"
            return
        }
        throw "Failed adding context for $Path`n$out"
    }
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$contextFile = Join-Path $scriptDir "qmd-contexts.json"
if (-not (Test-Path $contextFile)) {
    throw "Missing context file: $contextFile"
}

$entries = Get-Content -Raw -Encoding UTF8 -Path $contextFile | ConvertFrom-Json
$collectionName = Get-CollectionName -PreferredName $collectionName
$root = "qmd://$collectionName"

foreach ($e in $entries) {
    $target = if ([string]::IsNullOrWhiteSpace($e.path)) { $root } else { "$root/$($e.path)" }
    Add-QmdContext -Path $target -Text $e.text
}

Write-Host "Done. Collection: $collectionName"
Write-Host "Next recommended commands:"
Write-Host "  qmd update"
Write-Host "  qmd embed"
Write-Host "  qmd query \"如何判定正定二次型\" -n 8 --min-score 0.25"
