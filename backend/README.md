# EduAssist FastAPI Backend

AI-Powered Educational Content Processor Backend

## Setup

### Option 1: Using npm (Recommended)
```bash
# From project root
npm run install:all
npm run dev
```

### Option 2: Manual Setup
```bash
# Create virtual environment
python -m venv virtual

# Activate virtual environment (Windows)
.\virtual\Scripts\Activate.ps1

# Install dependencies
pip install fastapi uvicorn python-multipart

# Start server
python start.py
```

### Option 3: Using Scripts
```bash
# Windows Batch
run.bat

# PowerShell
.\run.ps1
```

## API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## Features

- ✅ File Upload & Processing
- ✅ Quiz Generation
- ✅ AI Chatbot
- ✅ Vector Search
- ✅ Content Management
- ✅ Auto API Documentation

## Endpoints

- `POST /api/upload` - Upload files
- `GET /api/uploaded-files` - List uploaded files
- `GET /api/processed-content` - List processed content
- `POST /api/quizzes/generate` - Generate quiz
- `POST /api/chatbot/message` - Send chatbot message
- `GET /api/health` - Health check

## Architecture

```
backend/
├── main.py              # FastAPI application
├── start.py             # Startup script
├── requirements.txt     # Dependencies
├── services/           # Service modules
│   ├── content_processor.py
│   ├── quiz_generator.py
│   ├── chatbot_engine.py
│   └── vector_search.py
└── virtual/            # Virtual environment
```