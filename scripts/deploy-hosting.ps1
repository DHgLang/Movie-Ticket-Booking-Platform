# Deploy frontend/dist to Amplify Hosting (manual upload)
# Usage: .\scripts\deploy-hosting.ps1

$ErrorActionPreference = "Stop"
$AppId = "d2zv6ka00i1nyo"
$Region = "ap-southeast-1"
$Root = Split-Path $PSScriptRoot -Parent

Push-Location "$Root\frontend\dist"
try {
  # tar creates zip with forward slashes — required by Amplify (Compress-Archive uses backslashes)
  tar -caf "$Root\frontend-dist.zip" *
} finally {
  Pop-Location
}

$deploy = aws amplify create-deployment --app-id $AppId --branch-name main --region $Region --output json | ConvertFrom-Json
$code = curl.exe -s -o NUL -w "%{http_code}" -X PUT -T "$Root\frontend-dist.zip" -H "Content-Type: application/zip" $deploy.zipUploadUrl
if ($code -ne "200") { throw "Upload failed HTTP $code" }

aws amplify start-deployment --app-id $AppId --branch-name main --job-id $deploy.jobId --region $Region | Out-Null
Write-Host "Deployment job $($deploy.jobId) started. URL: https://main.$AppId.amplifyapp.com"
