# Spento Web - Cloud Functions Deployment Script
# Run this script to deploy your Cloud Functions

Write-Host "🚀 Spento Web - Cloud Functions Deployment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Firebase CLI is installed
Write-Host "📋 Checking Firebase CLI..." -ForegroundColor Yellow
$firebaseExists = Get-Command firebase -ErrorAction SilentlyContinue

if (-not $firebaseExists) {
    Write-Host "❌ Firebase CLI not found!" -ForegroundColor Red
    Write-Host "📦 Install it with: npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Firebase CLI found" -ForegroundColor Green
Write-Host ""

# Check if logged in
Write-Host "🔐 Checking Firebase authentication..." -ForegroundColor Yellow
$loginCheck = firebase projects:list 2>&1

if ($loginCheck -match "not logged in") {
    Write-Host "❌ Not logged in to Firebase!" -ForegroundColor Red
    Write-Host "🔑 Running: firebase login" -ForegroundColor Yellow
    firebase login
}

Write-Host "✅ Authenticated" -ForegroundColor Green
Write-Host ""

# Install dependencies
Write-Host "📦 Installing Cloud Functions dependencies..." -ForegroundColor Yellow
Push-Location functions
npm install
$installExitCode = $LASTEXITCODE
Pop-Location

if ($installExitCode -ne 0) {
    Write-Host "❌ Failed to install dependencies!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Check if Gemini API key is configured
Write-Host "🔑 Checking Gemini API key configuration..." -ForegroundColor Yellow
$config = firebase functions:config:get 2>&1 | ConvertFrom-Json

if (-not $config.gemini.key) {
    Write-Host "⚠️  Gemini API key not configured!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To configure it, run:" -ForegroundColor Cyan
    Write-Host 'firebase functions:config:set gemini.key="YOUR_API_KEY_HERE"' -ForegroundColor White
    Write-Host ""
    Write-Host "Get your API key from: https://makersuite.google.com/app/apikey" -ForegroundColor Cyan
    Write-Host ""
    
    $response = Read-Host "Do you want to set it now? (y/n)"
    
    if ($response -eq "y" -or $response -eq "Y") {
        $apiKey = Read-Host "Enter your Gemini API key"
        firebase functions:config:set gemini.key="$apiKey"
        Write-Host "✅ API key configured" -ForegroundColor Green
    } else {
        Write-Host "⏭️  Skipping API key configuration" -ForegroundColor Yellow
        Write-Host "⚠️  Receipt analysis will not work without it!" -ForegroundColor Red
    }
} else {
    Write-Host "✅ Gemini API key is configured" -ForegroundColor Green
}

Write-Host ""

# Deploy
Write-Host "🚀 Deploying Cloud Functions..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Gray
Write-Host ""

firebase deploy --only functions

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🧪 Test your Cloud Function:" -ForegroundColor Cyan
    Write-Host "1. Open test-cloud-function.html in your browser" -ForegroundColor White
    Write-Host "2. Sign in if needed" -ForegroundColor White
    Write-Host "3. Upload a receipt image" -ForegroundColor White
    Write-Host "4. Click 'Test Analysis'" -ForegroundColor White
    Write-Host ""
    Write-Host "📊 View logs with: firebase functions:log" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host "Check the error messages above" -ForegroundColor Yellow
    exit 1
}
