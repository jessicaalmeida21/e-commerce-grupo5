@echo off
echo Atualizando projeto no GitHub...
echo.

echo Adicionando arquivos modificados...
git add .

echo.
echo Fazendo commit das mudanças...
git commit -m "Update: %date% %time%"

echo.
echo Enviando para o GitHub...
git push origin main

echo.
echo ✅ Projeto atualizado no GitHub com sucesso!
echo.
pause
