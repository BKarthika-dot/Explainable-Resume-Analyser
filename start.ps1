# start.ps1 - Runs backend + frontend together. Ctrl+C stops both.
# Run this from the project root (same folder as main.py), with your
# venv already activated (you're already doing that - good).
#
# Usage:
#   .\start.ps1

$ErrorActionPreference = "Stop"

$BackendDir  = "."                      # main.py lives here directly
$FrontendDir = "./resume-analyser-ui"   # <-- EDIT if your frontend folder is named differently
$BackendPort = 8000

Write-Host "[start.ps1] Starting backend (uvicorn via 'python main.py') on :$BackendPort ..."

# 🎯 THE FIX: this used to build the uvicorn command line by hand via
# `-ArgumentList "-m","uvicorn",...,"--reload-exclude","data/*",...`.
# Start-Process flattens -ArgumentList into a single Windows command-line
# string rather than passing a real argv array, and wildcard tokens like
# "data/*" and "storage/*" were getting expanded into literal matching
# filenames before uvicorn's CLI parser ever saw them - hence
# "Got unexpected extra arguments (data\data_analyst data\sap ...)".
# main.py's own `if __name__ == "__main__":` block already calls
# uvicorn.run(..., reload_excludes=[...]) with those same patterns defined as
# a plain Python list, which completely avoids shell/argv quoting and
# wildcard-expansion pitfalls. So we just run the script directly.
$pythonExe = if (Test-Path ".\myenv\Scripts\python.exe") { ".\myenv\Scripts\python.exe" } else { "python" }
$backendProc = Start-Process -FilePath $pythonExe `
  -ArgumentList "main.py" `
  -WorkingDirectory $BackendDir `
  -NoNewWindow -PassThru

try {
    Write-Host "[start.ps1] Waiting for backend to come up (first run can take a few minutes while it builds the vector indexes)..."
    $ready = $false
    $maxWaitSeconds = 300
    for ($i = 0; $i -lt $maxWaitSeconds; $i++) {
        try {
            Invoke-WebRequest -Uri "http://127.0.0.1:$BackendPort/docs" -UseBasicParsing -TimeoutSec 2 | Out-Null
            $ready = $true
            break
        } catch {
            Start-Sleep -Seconds 1
        }
    }

    if (-not $ready) {
        Write-Host "[start.ps1] Backend never responded after $maxWaitSeconds s. Check the output above for import/startup errors (e.g. missing GOOGLE_API_KEY)."
        exit 1
    }
    Write-Host "[start.ps1] Backend is up."

    Write-Host "[start.ps1] Starting frontend (vite) ..."
    Push-Location $FrontendDir
    npm run dev
    Pop-Location
}
finally {
    Write-Host "`n[start.ps1] Shutting down backend..."
    if ($backendProc -and -not $backendProc.HasExited) {
        Stop-Process -Id $backendProc.Id -Force -ErrorAction SilentlyContinue
    }
}
