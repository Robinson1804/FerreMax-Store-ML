$host.UI.RawUI.WindowTitle = "FerreMax - Antigravity en vivo"
Write-Host "Registro en vivo de la construccion. Ctrl+C para salir." -ForegroundColor Cyan
Get-Content -Path "E:\PROYECTOS DE TESIS\UPN-1-ING-SISTEMAS\FerreMax_App\.agents\driver.log" -Wait -Tail 60 -Encoding UTF8
