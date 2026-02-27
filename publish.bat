@echo off
cd /d C:\repos\kurzy-status

echo === Generuji HTML ===
node scripts\generate.js

echo === Kontrola změn ===
git add index.html

git diff --cached --quiet
IF %ERRORLEVEL% EQU 0 (
    echo === Žádná změna, commit se neprovadi ===
) ELSE (
    echo === Commit ===
    git commit -m "auto: daily status update"
    echo === Push ===
    git push
)

echo === Hotovo ===