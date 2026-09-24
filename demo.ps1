# Demo de FerreMax: prepara backend y frontend, siembra datos y levanta ambos servidores.
#   .\demo.ps1               levanta todo (siembra solo si la base esta vacia)
#   .\demo.ps1 -Resembrar    borra la base, siembra las 420 boletas y reentrena FP-Growth
#   .\demo.ps1 -Evaluar      ademas corre la evaluacion offline (CSV en backend\salidas)
#   .\demo.ps1 -Detener      detiene los servidores de los puertos 8000 y 5173
param(
    [switch]$Resembrar,
    [switch]$Evaluar,
    [switch]$Detener,
    [int]$PuertoBackend = 8000,
    [int]$PuertoFrontend = 5173
)

$ErrorActionPreference = "Stop"
$Raiz = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Raiz "backend"
$Frontend = Join-Path $Raiz "frontend"
$Python = Join-Path $Backend ".venv\Scripts\python.exe"

function Detener-Puerto([int]$Puerto) {
    # En Windows no existe pkill: se busca el PID con netstat y se termina con taskkill
    $lineas = netstat -ano | Select-String -Pattern ":$Puerto\s+\S+\s+LISTENING"
    foreach ($l in $lineas) {
        $procId = ($l.ToString() -split "\s+")[-1]
        if ($procId -and $procId -ne "0") {
            & taskkill /F /T /PID $procId | Out-Null
            Write-Host "  Detenido PID $procId (puerto $Puerto)"
        }
    }
}

function Esperar-Url([string]$Url, [int]$Segundos = 60) {
    $limite = (Get-Date).AddSeconds($Segundos)
    while ((Get-Date) -lt $limite) {
        try {
            $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
            if ($r.StatusCode -eq 200) { return $true }
        } catch { Start-Sleep -Milliseconds 700 }
    }
    return $false
}

if ($Detener) {
    Write-Host "Deteniendo servidores..."
    Detener-Puerto $PuertoBackend
    Detener-Puerto $PuertoFrontend
    exit 0
}

Write-Host "== FerreMax: demostracion ==" -ForegroundColor Cyan

# 1. Backend: entorno virtual y dependencias
if (-not (Test-Path $Python)) {
    Write-Host "Creando entorno virtual de Python..."
    & python -m venv (Join-Path $Backend ".venv")
    & $Python -m pip install --quiet -r (Join-Path $Backend "requirements.txt")
}

# 2. Base de datos: siembra determinista (semilla 42) y entrenamiento de reglas
Push-Location $Backend
try {
    if ($Resembrar -or -not (Test-Path (Join-Path $Backend "ferremax.db"))) {
        Write-Host "Sembrando 420 comprobantes y reentrenando el modelo..."
        & $Python seed.py --reset --reentrenar
    } else {
        & $Python seed.py
    }
    if ($LASTEXITCODE -ne 0) { throw "Fallo la siembra de datos" }
    if ($Evaluar) {
        Write-Host "Ejecutando evaluacion offline (Capa 1)..."
        & $Python evaluacion_offline.py | Out-Null
        Write-Host "  CSV: backend\salidas\evaluacion_offline.csv"
    }
} finally { Pop-Location }

# 3. Frontend: dependencias
if (-not (Test-Path (Join-Path $Frontend "node_modules"))) {
    Write-Host "Instalando dependencias del frontend..."
    Push-Location $Frontend
    & npm.cmd install --no-audit --no-fund
    Pop-Location
}

# 4. Levantar servidores (liberando antes los puertos)
Detener-Puerto $PuertoBackend
Detener-Puerto $PuertoFrontend

Write-Host "Levantando backend en http://localhost:$PuertoBackend ..."
Start-Process -FilePath $Python -ArgumentList "-m uvicorn main:app --port $PuertoBackend" `
    -WorkingDirectory $Backend -WindowStyle Minimized | Out-Null

Write-Host "Levantando frontend en http://localhost:$PuertoFrontend ..."
$env:VITE_API_URL = "http://localhost:$PuertoBackend"
Start-Process -FilePath "npm.cmd" -ArgumentList "run dev -- --port $PuertoFrontend --strictPort" `
    -WorkingDirectory $Frontend -WindowStyle Minimized | Out-Null

$okB = Esperar-Url "http://localhost:$PuertoBackend/api/productos"
$okF = Esperar-Url "http://localhost:$PuertoFrontend/"
if (-not ($okB -and $okF)) {
    Write-Host "No respondio algun servidor (backend=$okB, frontend=$okF)." -ForegroundColor Red
    exit 1
}

$cfg = Invoke-RestMethod "http://localhost:$PuertoBackend/api/admin/config"
Write-Host ""
Write-Host "Listo. Modo activo del recomendador: $($cfg.modo_activo)" -ForegroundColor Green
Write-Host "  Tienda:  http://localhost:$PuertoFrontend/"
Write-Host "  Panel:   http://localhost:$PuertoFrontend/admin/login   (admin / admin123)"
Write-Host "  API:     http://localhost:$PuertoBackend/docs"
Write-Host "Para detener:  .\demo.ps1 -Detener"
