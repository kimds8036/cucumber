# UTF-8 console
chcp 65001 | Out-Null
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$uri = "http://localhost:8001/clean"
$outFile = Join-Path $scriptDir "results3.txt"
$casesFile = Join-Path $scriptDir "manual_test_cases.json"

$utf8 = New-Object System.Text.UTF8Encoding $false

function Read-Utf8Text([string]$path) {
    $bytes = [System.IO.File]::ReadAllBytes($path)
    $offset = 0
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        $offset = 3
    }
    return $utf8.GetString($bytes, $offset, $bytes.Length - $offset)
}

function Invoke-CleanApi([string]$url, [byte[]]$bodyBytes) {
    $request = [System.Net.HttpWebRequest]::Create($url)
    $request.Method = "POST"
    $request.ContentType = "application/json; charset=utf-8"
    $request.ContentLength = $bodyBytes.Length

    $stream = $request.GetRequestStream()
    $stream.Write($bodyBytes, 0, $bodyBytes.Length)
    $stream.Close()

    $response = $request.GetResponse()
    try {
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream(), $utf8)
        return $reader.ReadToEnd()
    }
    finally {
        $response.Close()
    }
}

$tests = Read-Utf8Text $casesFile | ConvertFrom-Json
$chunks = New-Object System.Collections.Generic.List[string]

foreach ($text in $tests) {
    $bodyJson = (@{ text = $text } | ConvertTo-Json -Compress)
    $bodyBytes = $utf8.GetBytes($bodyJson)
    $chunks.Add((Invoke-CleanApi $uri $bodyBytes))
}

[System.IO.File]::WriteAllText($outFile, (($chunks -join "`n`n") + "`n"), $utf8)
Write-Host "Done. See $outFile"
