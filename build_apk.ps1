# BillStor Android Build Automation Script

Write-Host "Starting BillStor Android Build..." -ForegroundColor Cyan

# 1. Build the React Web App
Write-Host "`n[1/3] Building React Web App..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "React build failed!"; exit 1 }

# 2. Sync with Capacitor
Write-Host "`n[2/3] Syncing with Capacitor..." -ForegroundColor Yellow
npx cap sync
if ($LASTEXITCODE -ne 0) { Write-Error "Capacitor sync failed!"; exit 1 }

# 3. Build APK with Gradle
Write-Host "`n[3/3] Building Android APK with Gradle..." -ForegroundColor Yellow

# Set Environment Variables for this session
$env:JAVA_HOME = "C:\Program Files\Java\jdk-18"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"

cd android
./gradlew clean assembleDebug
if ($LASTEXITCODE -ne 0) { Write-Error "Gradle build failed!"; exit 1 }

$sourceApk = "app/build/outputs/apk/debug/app-debug.apk"
$destApk = "app/build/outputs/apk/debug/BillStor-debug.apk"

if (Test-Path $sourceApk) {
    Move-Item -Path $sourceApk -Destination $destApk -Force
    Write-Host "`nSUCCESS! APK generated at:" -ForegroundColor Green
    Write-Host "$PWD/$destApk" -ForegroundColor White
} else {
    Write-Error "APK file not found at $sourceApk"
    exit 1
}

cd ..
