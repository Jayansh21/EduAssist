@echo off
echo ==============================================
echo        EduAssist - Full Application
echo ==============================================
echo.
echo Starting Backend (FastAPI)...
start "EduAssist Backend" cmd /c "cd backend && virtual\Scripts\activate && python start.py"

echo.
echo Waiting for backend to initialize...
timeout /t 3 /nobreak >nul

echo.
echo Starting Frontend...
start "EduAssist Frontend" cmd /c "cd frontend && python server.py"

echo.
echo Waiting for frontend to initialize...
timeout /t 2 /nobreak >nul

echo.
echo ==============================================
echo        Application Ready!
echo ==============================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3001
echo Student Dashboard: http://localhost:3001/student.html
echo API Docs: http://localhost:8000/docs
echo.
echo Opening application...
start http://localhost:3001/student.html

echo.
echo Press any key to exit...
pause >nul
