@echo off
title Atualizar SOT no GitHub
cd /d "%~dp0"

echo ========================================
echo   Atualizando SOT no GitHub
echo ========================================
echo.

echo [1/4] Adicionando arquivos...
git add .
if errorlevel 1 (
    echo ERRO ao adicionar. Verifique se o Git esta instalado.
    pause
    exit /b 1
)
echo OK.
echo.

echo [2/4] Criando commit...
set MSG=Atualizar SOT - %date% %time%
set MSG=%MSG:/=-%
set MSG=%MSG::=-%
git commit -m "%MSG%" 2>nul
if errorlevel 1 (
    echo Nenhuma alteracao nova para commitar. Enviando commits anteriores...
) else (
    echo Commit feito.
)
echo.

echo [3/4] Enviando para o GitHub...
git push origin main
if errorlevel 1 (
    echo.
    echo ERRO no envio. Verifique:
    echo - Internet conectada
    echo - Usuario e token do GitHub (senha = Personal Access Token)
    echo.
    pause
    exit /b 1
)
echo.

echo [4/4] Concluido.
echo.
echo SOT atualizado: https://github.com/thiagod11lopes-ops/SOT
echo.
pause
