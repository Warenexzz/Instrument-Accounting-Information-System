@echo off
chcp 65001 >nul
cls

echo Настройка системы учета инструмента
echo.

REM 1. Проверка PostgreSQL
echo [1] Проверяю PostgreSQL...
where psql >nul 2>&1

if errorlevel 1 (
    echo ❌ PostgreSQL не найден
    echo.
    set /p choice="Установить PostgreSQL? (y/n): "
    
    if /i "%choice%"=="y" (
        start https://www.postgresql.org/download/
        echo Откройте ссылку и установите
    )
    pause
    exit
)

echo ✅ PostgreSQL установлен
echo.

REM 2. Проверка базы
echo [2] Проверяю базу данных...
psql -U postgres -d ToolManagementSystem -c "SELECT 1;" >nul 2>&1

if errorlevel 1 (
    echo ❌ База не найдена
    echo.
    set /p choice="Создать базу данных? (y/n): "
    
    if /i "%choice%"=="y" (
        psql -U postgres -c "CREATE DATABASE \"ToolManagementSystem\";"
        echo ✅ База создана
    ) else (
        echo Создайте базу вручную
    )
) else (
    echo ✅ База существует
)

echo.
echo Готово! Запустите: launch_sys.bat
echo.
pause