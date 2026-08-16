@echo off
chcp 65001 >nul
title CY9 Desktop Shortcut
cls
echo ===============================================================
echo            CY9 AI ASSISTANT - DESKTOP SHORTCUT
echo ===============================================================
echo.
echo [*] جاري إنشاء اختصار سطح المكتب الرسمي لـ CY9 ...

cscript //nologo "%~dp0create_shortcut.vbs"

echo.
echo [✓] تم إنشاء الاختصار على سطح المكتب بنجاح!
echo [✓] يمكنك الآن تشغيل CY9 بنقرة واحدة من سطح المكتب مباشرة.
echo.
pause
