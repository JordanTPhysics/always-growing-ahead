$API_KEY = 'AIzaSyCPabE5pGey0aEwV3bJ_L-S1lPrG5FZBbw'
$BASE_URL = 'https://places.googleapis.com/v1/places:searchText'
$COUNTRY = 'United Kingdom'
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$CSV_PATH = Join-Path $SCRIPT_DIR 'uk_places.csv'
$ERROR_LOG_PATH = Join-Path $SCRIPT_DIR 'google_places_api_uk_cities.error.log'
$MAX_PAGES = 3

# Largest UK cities by population.
$CITIES = @(
    'London',
    'Birmingham',
    'Manchester',
    'Glasgow',
    'Leeds',
    'Liverpool',
    'Newcastle upon Tyne',
    'Sheffield',
    'Bristol',
    'Edinburgh',
    'Leicester',
    'Coventry',
    'Bradford',
    'Cardiff',
    'Belfast',
    'Nottingham',
    'Kingston upon Hull',
    'Stoke-on-Trent',
    'Southampton',
    'Plymouth'
)

# Query is the Google text search. Label is the category written to the CSV.
$SEARCHES = @(
    @{ Label = 'barber shop'; Query = 'barber shop' },
    @{ Label = 'tire shop'; Query = 'tyre shop' },
    @{ Label = 'supermarket'; Query = 'supermarket' },
    @{ Label = 'restaurant'; Query = 'restaurant' },
    @{ Label = 'mechanic'; Query = 'mechanic' },
    @{ Label = 'car wash'; Query = 'car wash' }
)

$PLACE_COLUMNS = @(
    'name',
    'categories',
    'url',
    'phone',
    'email',
    'address',
    'postcode',
    'location_lat',
    'location_lng',
    'id',
    'city',
    'search_query'
)

function Write-ErrorLog {
    param(
        [string]$Message,
        $ErrorRecord
    )

    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $lines = @("[$timestamp] $Message")

    if ($ErrorRecord) {
        $lines += "Exception: $($ErrorRecord.Exception.Message)"
        if ($ErrorRecord.Exception.InnerException) {
            $lines += "Inner: $($ErrorRecord.Exception.InnerException.Message)"
        }
        if ($ErrorRecord.ErrorDetails -and $ErrorRecord.ErrorDetails.Message) {
            $lines += "Details: $($ErrorRecord.ErrorDetails.Message)"
        }
        if ($ErrorRecord.ScriptStackTrace) {
            $lines += $ErrorRecord.ScriptStackTrace
        }
    }

    $lines += ''
    Add-Content -Path $ERROR_LOG_PATH -Value ($lines -join [Environment]::NewLine) -Encoding utf8
    Write-Host $Message
}

function Get-AsArray {
    param($Value)
    if ($null -eq $Value) { return @() }
    return @($Value)
}

function Get-UkPostcode {
    param([string]$Address)
    if ([string]::IsNullOrWhiteSpace($Address)) { return '' }
    $match = [regex]::Match($Address, '\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b', 'IgnoreCase')
    if (-not $match.Success) { return '' }
    return ($match.Groups[1].Value.ToUpper() + ' ' + $match.Groups[2].Value.ToUpper())
}

function Get-CsvField {
    param($Value)
    if ($null -eq $Value) {
        return ''
    }
    $text = [string]$Value
    if ($text.IndexOfAny([char[]]@(',', '"', "`n", "`r")) -ge 0) {
        return '"' + $text.Replace('"', '""') + '"'
    }
    return $text
}

function Add-CsvRows {
    param(
        [string]$Path,
        [string[]]$Columns,
        $Rows
    )

    $rowList = @(Get-AsArray $Rows)
    if ($rowList.Count -eq 0) {
        return
    }

    $fileExists = (Test-Path $Path) -and ((Get-Item $Path).Length -gt 0)
    $lines = New-Object System.Collections.Generic.List[string]
    if (-not $fileExists) {
        $lines.Add(($Columns -join ','))
    }
    foreach ($row in $rowList) {
        $fields = foreach ($col in $Columns) {
            Get-CsvField $row[$col]
        }
        $lines.Add(($fields -join ','))
    }

    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::AppendAllText($Path, (($lines -join "`r`n") + "`r`n"), $utf8NoBom)
}

function ConvertFrom-Place {
    param($Place, [string]$City, [string]$SearchLabel)

    $placeId = ''
    if ($Place.name) {
        $parts = $Place.name -split '/'
        $placeId = $parts[-1]
    }

    $location = $Place.location
    $types = Get-AsArray $Place.types
    $address = $Place.formattedAddress

    return @{
        name         = $Place.displayName.text
        categories   = ($types -join ',')
        url          = $Place.websiteUri
        phone        = $Place.nationalPhoneNumber
        email        = ''
        address      = $address
        postcode     = Get-UkPostcode $address
        location_lat = $location.latitude
        location_lng = $location.longitude
        id           = $placeId
        city         = $City
        search_query = $SearchLabel
    }
}

function Get-PlacesPage {
    param(
        [string]$TextQuery,
        [string]$PageToken
    )

    $fieldMask = @(
        'places.displayName',
        'places.types',
        'places.formattedAddress',
        'places.location',
        'places.websiteUri',
        'places.name',
        'places.nationalPhoneNumber',
        'nextPageToken'
    ) -join ','

    $headers = @{
        'Content-Type'     = 'application/json'
        'Accept'           = 'application/json'
        'X-Goog-Api-Key'   = $API_KEY
        'X-Goog-FieldMask' = $fieldMask
    }

    $body = @{
        textQuery  = $TextQuery
        pageSize   = 20
        regionCode = 'GB'
    }
    if ($PageToken) {
        $body.pageToken = $PageToken
    }

    $json = $body | ConvertTo-Json -Compress -Depth 5

    try {
        return Invoke-RestMethod -Uri $BASE_URL -Method POST -Headers $headers -Body $json -ContentType 'application/json'
    } catch {
        $detail = $_.ErrorDetails.Message
        if (-not $detail) { $detail = $_.Exception.Message }
        Write-ErrorLog "HTTP request failed for '$TextQuery': $detail" -ErrorRecord $_
        return $null
    }
}

function Start-CitySearch {
    param(
        [string]$City,
        [string]$SearchLabel,
        [string]$SearchQuery,
        [System.Collections.Generic.HashSet[string]]$Seen
    )

    $textQuery = "$SearchQuery in $City, $COUNTRY"
    $pageToken = $null
    $saved = 0

    for ($page = 1; $page -le $MAX_PAGES; $page++) {
        Write-Host "[$City / $SearchLabel] page $page"
        $response = Get-PlacesPage -TextQuery $textQuery -PageToken $pageToken
        if ($null -eq $response) {
            break
        }

        $rows = @()
        foreach ($place in (Get-AsArray $response.places)) {
            $row = ConvertFrom-Place -Place $place -City $City -SearchLabel $SearchLabel
            if ([string]::IsNullOrWhiteSpace($row.name) -or [string]::IsNullOrWhiteSpace($row.id)) {
                continue
            }
            $key = "$City|$SearchLabel|$($row.id)"
            if (-not $Seen.Add($key)) {
                continue
            }
            $rows += $row
        }

        Add-CsvRows -Path $CSV_PATH -Columns $PLACE_COLUMNS -Rows $rows
        $saved += @($rows).Count

        $pageToken = $response.nextPageToken
        if ([string]::IsNullOrWhiteSpace($pageToken)) {
            break
        }
        Start-Sleep -Milliseconds 200
    }

    Write-Host "[$City / $SearchLabel] saved $saved"
    return $saved
}

if (Test-Path $CSV_PATH) {
    Remove-Item $CSV_PATH -Force
}

$seen = New-Object 'System.Collections.Generic.HashSet[string]'
$total = 0
$combination = 0
$combinationCount = $CITIES.Count * $SEARCHES.Count

try {
    foreach ($city in $CITIES) {
        foreach ($search in $SEARCHES) {
            $combination++
            Write-Host "Search $combination of $combinationCount"
            $total += Start-CitySearch -City $city -SearchLabel $search.Label -SearchQuery $search.Query -Seen $seen
        }
    }
    Write-Host "Wrote $total place(s) to $CSV_PATH"
} catch {
    Write-ErrorLog 'Unhandled script error' -ErrorRecord $_
}
