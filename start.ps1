# EduAssist Unified Startup Script
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "       EduAssist - AI Education Platform" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "[1/3] Starting Backend (FastAPI)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-WindowStyle", "Minimized", "-NoExit", "-Command", "cd 'C:\Users\jjaya\OneDrive\Desktop\udaya test\test\backend'; .\virtual\Scripts\Activate.ps1; python start.py"

Write-Host ""
Write-Host "[2/3] Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "[3/3] Starting Frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-WindowStyle", "Minimized", "-NoExit", "-Command", "cd 'C:\Users\jjaya\OneDrive\Desktop\udaya test\test\frontend'; python server.py"

Write-Host ""
Write-Host "Waiting for frontend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "       Application Ready!" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎓 Student Dashboard: http://localhost:3001/student.html" -ForegroundColor White
Write-Host "📤 Upload Content: http://localhost:3001/" -ForegroundColor White
Write-Host "🧠 Quiz Generator: http://localhost:3001/quiz" -ForegroundColor White
Write-Host "🤖 AI Tutor: http://localhost:3001/chat" -ForegroundColor White
Write-Host "🔧 Backend API: http://localhost:8000" -ForegroundColor White
Write-Host "📚 API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "Opening Student Dashboard..." -ForegroundColor Green
Start-Process "http://localhost:3001/student.html"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   Current Features Status" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Basic Features (Implemented):" -ForegroundColor Green
Write-Host "   • Content Upload & Processing" -ForegroundColor White
Write-Host "   • AI-Powered Quiz Generation" -ForegroundColor White
Write-Host "   • Intelligent Chatbot/Tutor" -ForegroundColor White
Write-Host "   • Student Progress Dashboard" -ForegroundColor White
Write-Host ""
Write-Host "🔄 Advanced Features (Not Yet Implemented):" -ForegroundColor Yellow
Write-Host "   • Personalized Learning Paths" -ForegroundColor White
Write-Host "   • Step-by-Step Doubt Solver" -ForegroundColor White
Write-Host "   • Flashcard Generator" -ForegroundColor White
Write-Host "   • Advanced AI Summarizer" -ForegroundColor White
Write-Host "   • Exam Preparation Mode" -ForegroundColor White
Write-Host "   • Gamification Dashboard" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit launcher..." -ForegroundColor Yellow
$Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null
