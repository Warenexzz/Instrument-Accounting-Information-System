@echo off
chcp 65001 >nul
echo Запуск системы...

REM 1. Переходим туда, где лежит этот bat-файл
cd /d "%~dp0"

REM 2. Ищем .csproj в текущей папке и подпапках
for /r %%i in (*.csproj) do (
    echo Найден проект: %%i
    cd /d "%%~dpi"
    goto :RUN
)

echo Ошибка: не найден .csproj файл!
pause
exit

:RUN
echo Запускаю сервер...
start dotnet run

echo Жду 5 секунд...
timeout /t 5 >nul

echo Открываю браузер...
start http://localhost:5000
start http://localhost:5000/index.html

echo Готово! Открыто на localhost:5000
pause