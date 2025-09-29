# Script PowerShell para atualizar automaticamente no GitHub
Write-Host "🚀 Atualizando projeto no GitHub..." -ForegroundColor Green
Write-Host ""

# Adicionar todos os arquivos modificados
Write-Host "📁 Adicionando arquivos modificados..." -ForegroundColor Yellow
git add .

# Fazer commit com timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "💾 Fazendo commit das mudanças..." -ForegroundColor Yellow
git commit -m "Update: $timestamp"

# Enviar para o GitHub
Write-Host "☁️ Enviando para o GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host ""
Write-Host "✅ Projeto atualizado no GitHub com sucesso!" -ForegroundColor Green
Write-Host "🔗 https://github.com/jessicaalmeida21/e-commerce-grupo5" -ForegroundColor Cyan
