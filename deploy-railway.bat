@echo off
echo ========================================
echo   DEPLOY AUTOMATICO PARA RAILWAY
echo ========================================
echo.

echo [1/4] Verificando se o Railway CLI esta instalado...
railway --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Railway CLI nao encontrado!
    echo 📥 Instalando Railway CLI...
    npm install -g @railway/cli
    if %errorlevel% neq 0 (
        echo ❌ Erro ao instalar Railway CLI
        pause
        exit /b 1
    )
)

echo [2/4] Fazendo login no Railway...
railway login
if %errorlevel% neq 0 (
    echo ❌ Erro no login do Railway
    pause
    exit /b 1
)

echo [3/4] Inicializando projeto no Railway...
railway init
if %errorlevel% neq 0 (
    echo ❌ Erro ao inicializar projeto
    pause
    exit /b 1
)

echo [4/4] Fazendo deploy...
railway up
if %errorlevel% neq 0 (
    echo ❌ Erro no deploy
    pause
    exit /b 1
)

echo Deploy concluido com sucesso! 🎉
echo.
echo 🌐 Seu site esta disponivel em:
railway status
echo.
echo 📝 Lembre-se de configurar as variaveis de ambiente no painel do Railway
echo.
pause
