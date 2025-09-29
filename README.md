# 🎓 EduAssist - AI-Powered Educational Platform

An intelligent educational platform that transforms uploaded content into interactive learning experiences with AI-powered quiz generation, personalized tutoring, and comprehensive analytics.

## 🚀 Quick Start

### Prerequisites
- Python 3.8+ 
- Git

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd eduassist
   ```

2. **Set up environment:**
   ```bash
   # Copy environment template
   cp env.example .env
   
   # Edit .env file with your OpenAI API key (optional but recommended)
   # OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Install Python dependencies:**
   ```bash
   cd backend
   python -m venv virtual
   virtual\Scripts\activate  # Windows
   # source virtual/bin/activate  # Linux/Mac
   pip install -r requirements.txt
   ```

4. **Start the application:**
   
   **Option 1 - One-click start (Windows):**
   ```cmd
   start.bat
   ```
   
   **Option 2 - Manual start:**
   ```bash
   # Terminal 1 - Backend
   cd backend
   virtual\Scripts\activate
   python start.py
   
   # Terminal 2 - Frontend  
   cd frontend
   python server.py
   ```

5. **Access the Application:**
   - **Login Page**: http://localhost:3001/login.html
   - **Student Dashboard**: http://localhost:3001/student.html
   - **Upload Content**: http://localhost:3001/index.html
   - **Quiz Generator**: http://localhost:3001/quiz.html
   - **AI Tutor**: http://localhost:3001/chat.html
   - **Flashcards**: http://localhost:3001/flashcards.html
   - **API Documentation**: http://localhost:8000/docs

## ✅ Currently Implemented Features

### 🎯 Core Student Features
- **📤 Content Upload & Processing**
  - Upload PDFs, videos, audio files
  - Real-time AI transcription and summarization
  - Content organization and management

- **🧠 Quiz Generation System**
  - AI-powered quiz creation from uploaded content
  - Multiple question types (MCQ, True/False, Short Answer)
  - Instant grading and detailed feedback
  - Download functionality for offline practice

- **🤖 AI Tutor/Chatbot**
  - Context-aware responses based on uploaded content
  - Content-specific Q&A support
  - Session management and chat history

- **👨‍🎓 Student Dashboard**
  - Learning progress overview
  - Recent activity tracking
  - Quick action buttons
  - Study schedule generation

### 🛠 Technical Implementation
- **Backend**: FastAPI (Python) with real-time API integration
- **Frontend**: HTML/CSS/JavaScript with responsive design
- **AI Integration**: OpenAI API (with intelligent mock fallbacks)
- **File Processing**: PDF extraction, audio transcription
- **Vector Search**: Content indexing for intelligent retrieval

## 🔄 Advanced Features (Not Yet Implemented)

The following features from your requirements are **not yet implemented** and would need to be built:

### 1. 🎯 Personalized Learning Path
- **Status**: ❌ Not Implemented
- **Required**: FastAPI endpoints for learning path generation, MongoDB/PostgreSQL models, React components
- **Description**: Generate personalized study plans based on quiz results and progress tracking

### 2. 🤔 Doubt Solver with Step-by-Step Explanation
- **Status**: ❌ Not Implemented  
- **Required**: POST `/solve-doubt` endpoint, step-by-step AI explanation logic
- **Description**: Students enter questions → AI generates detailed step-wise explanations

### 3. 📚 Flashcard Generator
- **Status**: ❌ Not Implemented
- **Required**: POST `/generate-flashcards` endpoint, flashcard database models, flip-card UI
- **Description**: Auto-generate Q&A flashcards from uploaded notes/documents

### 4. 📝 Advanced AI Summarizer
- **Status**: ⚠️ Partially Implemented (basic summarization exists)
- **Required**: Enhanced summarization with exam-specific formatting
- **Description**: Advanced exam-ready summaries with key points extraction

### 5. ⏱️ Exam Preparation Mode (Mock Tests)
- **Status**: ❌ Not Implemented
- **Required**: Timed test interface, mock test generation, advanced analytics
- **Description**: Full exam simulation with time limits and comprehensive analysis

### 6. 🏆 Gamification Dashboard
- **Status**: ❌ Not Implemented
- **Required**: Leaderboards, badges system, streak tracking, points system
- **Description**: Gamified learning with achievements, streaks, and social features

## 🔧 Configuration

### Environment Setup
1. **Python Virtual Environment**: `backend/virtual/`
2. **Environment Variables**: Configure `.env` file:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL_TRANSCRIBE=whisper-1
   OPENAI_MODEL_SUMMARY=gpt-4o-mini
   OPENAI_MODEL_CHAT=gpt-4o-mini
   ```

### API Integration
- **With API Key**: Real-time AI processing (transcription, summarization, chat)
- **Without API Key**: Intelligent mock responses for demonstration

## 🏗️ Architecture

```
eduassist/
├── backend/                 # FastAPI Python backend
│   ├── main.py             # Main application and routes
│   ├── services/           # Core business logic
│   │   ├── content_processor.py
│   │   ├── quiz_generator.py
│   │   ├── chatbot_engine.py
│   │   └── vector_search.py
│   ├── requirements.txt    # Python dependencies
│   └── virtual/           # Python virtual environment
├── frontend/              # Static HTML/CSS/JS frontend
│   ├── index.html         # Content upload page
│   ├── student.html       # Student dashboard
│   ├── quiz.html          # Quiz generator
│   ├── chat.html          # AI tutor interface
│   ├── assets/            # CSS, JS, and other assets
│   └── server.py          # Custom frontend server
├── storage/               # File storage for uploads and processed content
└── start.bat             # One-click startup script
```

## 🚧 Next Steps: Building Advanced Features

To implement the missing advanced features, you would need to:

1. **Set up a proper database** (MongoDB or PostgreSQL)
2. **Implement React frontend** with modern UI components
3. **Build the specific FastAPI endpoints** for each feature
4. **Create database models** for user progress, flashcards, gamification
5. **Implement advanced AI logic** for learning paths and step-by-step explanations

Each feature would require:
- Backend API routes with Pydantic models
- Database schemas and relationships  
- React components with proper state management
- Integration between frontend and backend
- Error handling and loading states

## 🎯 Current vs Target State

**Current State**: Functional educational platform with core features
**Target State**: Advanced AI-powered learning platform with gamification and personalized learning

The foundation is solid and ready for building these advanced features on top of the existing architecture.

## 🤝 Contributing

Ready to implement any of the advanced features! Each can be built incrementally while maintaining the existing functionality.