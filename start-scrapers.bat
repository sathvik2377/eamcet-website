@echo off
echo ========================================
echo    TS EAMCET Parallel Scraper System
echo ========================================
echo.
echo This will start 5 scrapers simultaneously
echo Each scraper runs 3 parallel processes
echo Total: 15 concurrent scraping operations
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause >nul

echo.
echo Starting all scrapers...
node run-all-scrapers.js

echo.
echo Press any key to exit...
pause >nul
