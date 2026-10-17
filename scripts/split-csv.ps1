param(
    [string]$Path = (Join-Path $PSScriptRoot 'uk_places.csv'),
    [int]$MaxRows = 500
)

$ErrorActionPreference = 'Stop'

if ($MaxRows -lt 1) {
    throw 'MaxRows must be at least 1'
}
if (-not (Test-Path -LiteralPath $Path)) {
    throw "File not found: $Path"
}

$fullPath = (Resolve-Path -LiteralPath $Path).Path
$stream = [System.IO.File]::Open(
    $fullPath,
    [System.IO.FileMode]::Open,
    [System.IO.FileAccess]::Read,
    [System.IO.FileShare]::ReadWrite
)
try {
    $reader = New-Object System.IO.StreamReader($stream, (New-Object System.Text.UTF8Encoding $false), $true)
    $text = $reader.ReadToEnd()
} finally {
    if ($reader) { $reader.Dispose() }
    $stream.Dispose()
}
if ($text.Length -gt 0 -and [int][char]$text[0] -eq 0xFEFF) {
    $text = $text.Substring(1)
}

$records = New-Object System.Collections.Generic.List[string]
$start = 0
$inQuotes = $false

for ($i = 0; $i -lt $text.Length; $i++) {
    $c = $text[$i]
    if ($c -eq '"') {
        if ($inQuotes -and ($i + 1) -lt $text.Length -and $text[$i + 1] -eq '"') {
            $i++
        } else {
            $inQuotes = -not $inQuotes
        }
    } elseif (-not $inQuotes -and $c -eq "`n") {
        $length = $i - $start
        if ($length -gt 0 -and $text[$i - 1] -eq "`r") {
            $length--
        }
        $record = $text.Substring($start, $length)
        if ($record.Trim().Length -gt 0) {
            $records.Add($record)
        }
        $start = $i + 1
    }
}

if ($start -lt $text.Length) {
    $record = $text.Substring($start).TrimEnd("`r", "`n")
    if ($record.Trim().Length -gt 0) {
        $records.Add($record)
    }
}

if ($records.Count -lt 2) {
    throw 'CSV has no data rows'
}

$header = $records[0]
$dataCount = $records.Count - 1
$sourceName = [System.IO.Path]::GetFileNameWithoutExtension($Path)
$outDir = Join-Path ([System.IO.Path]::GetDirectoryName((Resolve-Path -LiteralPath $Path))) ($sourceName + '_batches')

if (Test-Path -LiteralPath $outDir) {
    Remove-Item -LiteralPath $outDir -Recurse -Force
}
New-Item -ItemType Directory -Path $outDir | Out-Null

$utf8 = New-Object System.Text.UTF8Encoding $false
$batch = 0

for ($offset = 1; $offset -lt $records.Count; $offset += $MaxRows) {
    $batch++
    $count = [Math]::Min($MaxRows, $records.Count - $offset)
    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add($header)
    for ($j = 0; $j -lt $count; $j++) {
        $lines.Add($records[$offset + $j])
    }

    $fileName = '{0}-{1:D3}.csv' -f $sourceName, $batch
    $outPath = Join-Path $outDir $fileName
    [System.IO.File]::WriteAllText($outPath, (($lines -join "`r`n") + "`r`n"), $utf8)
    Write-Host "$fileName  $count rows"
}

Write-Host "Wrote $batch file(s), $dataCount data rows, to $outDir"
