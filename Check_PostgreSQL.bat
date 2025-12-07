@echo off
chcp 65001 >nul
cls

echo Настройка системы учета инструмента
echo.

REM Установите правильный пароль здесь!
set PGPASSWORD=1234

echo [1] Проверяю PostgreSQL...
where psql >nul 2>&1

if errorlevel 1 (
    echo ❌ PostgreSQL не найден
    pause
    exit /b 1
)

echo ✅ PostgreSQL установлен
echo.

echo [2] Проверяю базу данных...
psql -U postgres -d ToolManagementSystem -c "SELECT 1;" >nul 2>&1

if errorlevel 1 (
    echo ❌ База не найдена
    echo.
    set /p choice="Создать базу данных? (y/n): "
    
    if /i "%choice%"=="y" (
        echo Создаю базу...
        psql -U postgres -c "CREATE DATABASE \"ToolManagementSystem\";" 2>&1
        if errorlevel 1 (
            echo ❌ Ошибка создания базы!
            echo Проверьте пароль в скрипте (строка 8)
        ) else (
            echo ✅ База создана
        )
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

