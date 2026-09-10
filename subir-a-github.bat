@echo off
title Subir AR Studio a GitHub
echo ========================================================
echo   Subiendo AR Studio a GitHub (Adrw2019/ar-studio)...
echo ========================================================
echo.
set "PATH=C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\Git\cmd;C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\Git\mingw64\bin;%PATH%"
cd /d "%~dp0"

echo Configurando rama principal (main)...
git branch -M main
git remote set-url origin https://github.com/Adrw2019/ar-studio.git

echo.
echo Ejecutando git push...
echo (Si se abre una ventana en tu navegador, dale clic a 'Authorize' o 'Sign in with your browser')
echo.
git push -u origin main

echo.
echo ========================================================
if %ERRORLEVEL% equ 0 (
    echo [EXITO] Tu codigo se ha subido correctamente a GitHub!
    echo.
    echo Ahora solo falta activar GitHub Pages:
    echo 1. Ve a: https://github.com/Adrw2019/ar-studio/settings/pages
    echo 2. En 'Source', selecciona: 'GitHub Actions'
    echo.
    echo El despliegue comenzara automaticamente.
) else (
    echo [AVISO] Si te pide usuario y contrasena:
    echo Recuerda que GitHub no acepta contrasenas normales,
    echo usa 'Sign in with your browser' o un Personal Access Token (PAT).
)
echo ========================================================
echo.
pause
