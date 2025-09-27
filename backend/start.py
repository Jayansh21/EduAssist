#!/usr/bin/env python3
"""
EduAssist FastAPI Backend Startup Script
"""

import uvicorn
import sys
import os
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

if __name__ == "__main__":
    print("🚀 Starting EduAssist FastAPI Backend...")
    print("📚 Features: Content Processing, Quiz Generation, AI Chatbot")
    print("🔧 Environment: development")
    print("🌐 API Documentation: http://localhost:8000/docs")
    print("=" * 50)
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["."],
        log_level="info"
    )
