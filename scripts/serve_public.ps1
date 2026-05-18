# Publica la app en Internet SIN Railway (Cloudflare Tunnel, gratis).
# Requisitos: Python 3.11+ y cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
#
# Uso:
#   .\scripts\serve_public.ps1
#   .\scripts\serve_public.ps1 -Port 5000

param(
    [int]$Port = 5000
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    Write-Host "Instala cloudflared y vuelve a ejecutar este script."
    Write-Host "https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
    exit 1
}

$env:PORT = "$Port"
$env:FLASK_DEBUG = "0"

Write-Host "Arrancando Flask en http://127.0.0.1:$Port ..."
$flask = Start-Process -FilePath "python" -ArgumentList "app.py" -PassThru -NoNewWindow

Start-Sleep -Seconds 2

Write-Host "Abriendo tunel publico (URL aparecera abajo)..."
try {
    cloudflared tunnel --url "http://127.0.0.1:$Port"
}
finally {
    if ($flask -and -not $flask.HasExited) {
        Stop-Process -Id $flask.Id -Force -ErrorAction SilentlyContinue
    }
}
