# EduAssist Frontend

Modern UI for AI-Powered Educational Content Processor

## 🚀 Quick Start for UI Developers

### Prerequisites
- Node.js installed
- Backend running on http://localhost:8000

### Start Development Server
```bash
npm start
# Or: npx serve . -p 3001
```

### Access Application
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 📁 Structure
```
frontend/
├── index.html          # 📤 Upload page
├── quiz.html           # 🧠 Quiz generator  
├── chat.html           # 🤖 AI chatbot
└── assets/
    ├── css/            # 🎨 All styles
    └── js/             # ⚡ All functionality
```

## 🎨 UI Development Guide

### Current Features (All Working)
- ✅ File upload with drag & drop
- ✅ Content processing and display
- ✅ Quiz generation and taking
- ✅ AI chatbot with context awareness
- ✅ Content management (view, delete)
- ✅ Responsive design (basic)

### Areas for UI Improvement
1. **Design System** - Modernize colors, typography, spacing
2. **Animations** - Add smooth transitions and interactions
3. **Mobile Experience** - Optimize for mobile devices
4. **Loading States** - Better feedback during operations
5. **Accessibility** - Improve contrast and keyboard navigation

### ⚠️ Important for UI Developers
- **DON'T change HTML IDs** - JavaScript depends on them
- **DON'T modify onclick handlers** - Core functionality
- **DON'T change form names** - Backend integration
- **DO improve CSS, layout, and user experience**

## 🔧 Development Workflow

1. **Make UI changes** in CSS/HTML
2. **Test functionality** - Ensure all features work
3. **Check responsiveness** - Test on different screen sizes
4. **Verify integration** - Ensure backend communication works

## 📱 Pages Overview

### 1. Upload Page (`index.html`)
- File upload with drag & drop
- Processed content cards
- Content viewer modal
- File management

### 2. Quiz Page (`quiz.html`) 
- Quiz creation form
- Quiz display cards
- Quiz taking interface
- Results analysis

### 3. Chat Page (`chat.html`)
- Content selection sidebar
- Chat interface
- Sample query buttons
- AI responses with sources

## 🎯 Backend Integration (Already Complete)

All API endpoints are working:
- `POST /api/upload` - File upload
- `GET /api/processed-content` - Get content
- `POST /api/quizzes/generate` - Create quiz
- `POST /api/chatbot/message` - Chat message

## 🚀 Ready for UI Enhancement!

The frontend is fully functional and ready for UI/UX improvements. Focus on making it beautiful while keeping all features working.

See `UI_DEVELOPER_GUIDE.md` for detailed improvement guidelines.