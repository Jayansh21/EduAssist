from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
import uvicorn
import os
import json
import uuid
from datetime import datetime
from pathlib import Path
import shutil
from typing import List, Optional, Dict
import logging
from dotenv import load_dotenv
import openai

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="EduAssist API",
    description="AI-Powered Educational Content Processor with Real-time APIs",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/storage", StaticFiles(directory="../storage"), name="storage")

# Storage paths
STORAGE_ROOT = Path("../storage")
UPLOADS_DIR = STORAGE_ROOT / "uploads"
PROCESSED_DIR = STORAGE_ROOT / "processed"
QUIZZES_DIR = STORAGE_ROOT / "quizzes"
CHATBOT_DIR = STORAGE_ROOT / "chatbot"
VECTOR_DIR = STORAGE_ROOT / "vector-search"

# Ensure directories exist
for directory in [UPLOADS_DIR, PROCESSED_DIR, QUIZZES_DIR, CHATBOT_DIR, VECTOR_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Import services
from services.content_processor import ContentProcessor
from services.quiz_generator import QuizGenerator
from services.chatbot_engine import ChatbotEngine
from services.vector_search import VectorSearchService
from services.teacher_services import TeacherServices

# Initialize services
content_processor = ContentProcessor()
quiz_generator = QuizGenerator()
chatbot_engine = ChatbotEngine()
vector_search = VectorSearchService()
teacher_services = TeacherServices()

@app.get("/")
async def root():
    return {"message": "EduAssist API v2.0 - Real-time AI Processing", "version": "2.0.0"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# Content endpoints
@app.post("/api/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    """Upload and process files with real-time AI"""
    try:
        results = []
        
        for file in files:
            if not file.filename:
                continue
                
            # Generate unique filename
            file_id = str(uuid.uuid4())
            file_extension = Path(file.filename).suffix.lower()
            
            # Determine file type and directory
            if file_extension == '.pdf':
                file_type = 'pdf'
                upload_dir = UPLOADS_DIR / file_type
            elif file_extension in ['.mp4', '.avi', '.mov', '.wmv', '.mp3', '.wav', '.m4a']:
                file_type = 'video' if file_extension in ['.mp4', '.avi', '.mov', '.wmv'] else 'audio'
                upload_dir = UPLOADS_DIR / file_type
            else:
                results.append({
                    "filename": file.filename,
                    "status": "unsupported",
                    "message": f"File type {file_extension} not supported"
                })
                continue
            
            # Create date-based directory structure
            date_path = datetime.now().strftime("%Y/%m/%d")
            full_upload_dir = upload_dir / date_path
            full_upload_dir.mkdir(parents=True, exist_ok=True)
            
            # Save file
            file_path = full_upload_dir / f"{file_id}{file_extension}"
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            
            # Save metadata
            metadata = {
                "originalName": file.filename,
                "fileId": file_id,
                "fileType": file_type,
                "uploadDate": datetime.now().isoformat(),
                "size": len(content),
                "path": str(file_path.relative_to(STORAGE_ROOT))
            }
            
            metadata_path = file_path.with_suffix(f"{file_extension}.metadata.json")
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            # Process file with real-time AI
            try:
                await content_processor.process_file(file_path, file.filename)
                
                # Add to vector search
                processed_path = PROCESSED_DIR / file_type / date_path / f"{file_id}.txt"
                if processed_path.exists():
                    vector_search.add_content(str(processed_path), "", file.filename)
                
                results.append({
                    "filename": file.filename,
                    "status": "processed",
                    "fileId": file_id,
                    "message": "File uploaded and processed successfully"
                })
            except Exception as e:
                logger.error(f"Error processing file {file.filename}: {e}")
                results.append({
                    "filename": file.filename,
                    "status": "error",
                    "message": f"Processing failed: {str(e)}"
                })
        
        # Format response to match frontend expectations
        success_count = len([r for r in results if r["status"] == "processed"])
        return {
            "success": True,
            "count": success_count,
            "files": [{"processed": r["status"] == "processed"} for r in results],
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/uploaded-files")
async def get_uploaded_files():
    """Get list of uploaded files"""
    try:
        files = []
        for upload_type in ['pdf', 'video', 'audio']:
            type_dir = UPLOADS_DIR / upload_type
            if type_dir.exists():
                for file_path in type_dir.rglob("*"):
                    if file_path.is_file() and not file_path.name.endswith('.metadata.json'):
                        # Get metadata
                        metadata_path = file_path.with_suffix(f"{file_path.suffix}.metadata.json")
                        if metadata_path.exists():
                            with open(metadata_path, 'r') as f:
                                metadata = json.load(f)
                            
                            files.append({
                                "name": metadata.get("originalName", file_path.name),
                                "type": upload_type,
                                "size": metadata.get("size", 0),
                                "uploadDate": metadata.get("uploadDate", ""),
                                "path": str(file_path.relative_to(STORAGE_ROOT)).replace('\\', '/'),
                                "fileId": metadata.get("fileId", "")
                            })
        
        return {"files": files}
    except Exception as e:
        logger.error(f"Error getting uploaded files: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/processed-content")
async def get_processed_content():
    """Get list of processed content"""
    try:
        content = []
        for content_type in ['pdf', 'video', 'audio']:
            type_dir = PROCESSED_DIR / content_type
            if type_dir.exists():
                for file_path in type_dir.rglob("*.txt"):
                    if file_path.is_file():
                        # Get metadata
                        metadata_path = file_path.with_suffix('.metadata.json')
                        metadata = {}
                        if metadata_path.exists():
                            with open(metadata_path, 'r') as f:
                                metadata = json.load(f)
                        
                        # Check for summary
                        summary_path = file_path.with_suffix('.summary.md')
                        has_summary = summary_path.exists()
                        
                        content.append({
                            "name": metadata.get("originalName", file_path.stem),
                            "type": content_type,
                            "processedDate": metadata.get("processedDate", ""),
                            "path": str(file_path.relative_to(STORAGE_ROOT)).replace('\\', '/'),
                            "hasSummary": has_summary,
                            "size": file_path.stat().st_size if file_path.exists() else 0
                        })
        
        return {"content": content}
    except Exception as e:
        logger.error(f"Error getting processed content: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/processed-content/{content_path:path}")
async def get_processed_content_detail(content_path: str):
    """Get individual processed content"""
    try:
        import urllib.parse
        decoded_path = urllib.parse.unquote(content_path)
        full_path = STORAGE_ROOT / decoded_path
        
        if not full_path.exists():
            raise HTTPException(status_code=404, detail="Content not found")
        
        with open(full_path, 'r', encoding='utf-8') as f:
            transcript = f.read()
        
        summary_path = full_path.with_suffix('.summary.md')
        summary = 'No summary available'
        if summary_path.exists():
            with open(summary_path, 'r', encoding='utf-8') as f:
                summary = f.read()
        
        return {
            "transcript": transcript,
            "summary": summary,
            "path": content_path
        }
    except Exception as e:
        logger.error(f"Error getting content detail: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/processed-content/{content_path:path}")
async def delete_processed_content(content_path: str):
    """Delete processed content"""
    try:
        import urllib.parse
        decoded_path = urllib.parse.unquote(content_path)
        full_path = STORAGE_ROOT / decoded_path
        
        if full_path.exists():
            # Delete main file
            full_path.unlink()
            
            # Delete related files
            summary_path = full_path.with_suffix('.summary.md')
            if summary_path.exists():
                summary_path.unlink()
            
            metadata_path = full_path.with_suffix('.metadata.json')
            if metadata_path.exists():
                metadata_path.unlink()
        
        return {"message": "Content deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting content: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/uploaded-files/{file_path:path}")
async def delete_uploaded_file(file_path: str):
    """Delete uploaded file"""
    try:
        import urllib.parse
        import time
        decoded_path = urllib.parse.unquote(file_path)
        full_path = STORAGE_ROOT / decoded_path
        
        if full_path.exists():
            # Try to delete main file with retry logic
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    full_path.unlink()
                    break
                except PermissionError as pe:
                    if attempt < max_retries - 1:
                        logger.warning(f"File in use, retrying in 1 second... (attempt {attempt + 1})")
                        time.sleep(1)
                    else:
                        logger.error(f"Cannot delete file, it's being used by another process: {e}")
                        return {"message": "File cannot be deleted - it's currently in use", "success": False}
            
            # Delete metadata
            metadata_path = full_path.with_suffix(f"{full_path.suffix}.metadata.json")
            if metadata_path.exists():
                try:
                    metadata_path.unlink()
                except PermissionError:
                    logger.warning(f"Could not delete metadata file: {metadata_path}")
        
        return {"message": "File deleted successfully", "success": True}
    except Exception as e:
        logger.error(f"Error deleting file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Quiz endpoints
@app.post("/api/quiz/generate")
async def generate_quiz(request: dict):
    """Generate quiz from content with real-time AI"""
    try:
        content_path = request.get("contentPath", "")
        question_types = request.get("questionTypes", ["multiple_choice"])
        question_count = request.get("questionCount", 5)
        title = request.get("title", "")
        
        quiz = await quiz_generator.generate_quiz(
            content_path=content_path,
            question_types=question_types,
            question_count=question_count,
            title=title
        )
        
        return quiz
    except Exception as e:
        logger.error(f"Error generating quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/quiz/{quiz_id}")
async def get_quiz(quiz_id: str):
    """Get quiz by ID"""
    try:
        quiz = await quiz_generator.get_quiz(quiz_id)
        if not quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")
        return quiz
    except Exception as e:
        logger.error(f"Error getting quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/quiz/{quiz_id}/submit")
async def submit_quiz(quiz_id: str, submission: dict):
    """Submit quiz answers for grading"""
    try:
        result = await quiz_generator.grade_quiz(quiz_id, submission.get("answers", {}))
        return result
    except Exception as e:
        logger.error(f"Error submitting quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/quizzes")
async def get_quizzes():
    """Get all available quizzes"""
    try:
        quizzes = await quiz_generator.get_all_quizzes()
        return {"quizzes": quizzes}
    except Exception as e:
        logger.error(f"Error getting quizzes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/quiz/{quiz_id}")
async def delete_quiz(quiz_id: str):
    """Delete quiz by ID"""
    try:
        success = await quiz_generator.delete_quiz(quiz_id)
        if not success:
            raise HTTPException(status_code=404, detail="Quiz not found")
        return {"message": "Quiz deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting quiz: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Flashcards endpoints
@app.post("/api/flashcards/generate")
async def generate_flashcards(request: dict):
    """Generate flashcards from content using AI"""
    try:
        content_path = request.get("contentPath", "")
        card_count = request.get("cardCount", 10)
        card_type = request.get("cardType", "qa")
        
        # Load content
        if not content_path.startswith('processed/'):
            content_path = f"processed/{content_path}"
        
        content_file = Path(content_path)
        if not content_file.is_absolute():
            content_file = Path("../storage") / content_path
        
        if not content_file.exists():
            raise HTTPException(status_code=404, detail="Content file not found")
        
        with open(content_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Generate flashcards using AI
        flashcards = await _generate_ai_flashcards(content, card_count, card_type)
        
        return {"flashcards": flashcards}
        
    except Exception as e:
        logger.error(f"Error generating flashcards: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def _generate_ai_flashcards(content: str, card_count: int, card_type: str) -> List[Dict[str, str]]:
    """Generate flashcards using OpenAI API"""
    try:
        # Initialize OpenAI client
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key or api_key == "your_openai_api_key_here":
            # Return mock flashcards if no API key
            return _generate_mock_flashcards(card_count, card_type)
        
        client = openai.OpenAI(api_key=api_key)
        
        # Create prompt based on card type
        type_instructions = {
            "qa": "Create question and answer flashcards",
            "term": "Create term and definition flashcards", 
            "concept": "Create concept and explanation flashcards"
        }
        
        prompt = f"""Create {card_count} {type_instructions.get(card_type, "question and answer")} flashcards from the following educational content:

{content[:4000]}

For each flashcard, provide:
- front: The question/term/concept
- back: The answer/definition/explanation

Return as JSON array with format:
[
  {{"front": "question", "back": "answer"}},
  {{"front": "question", "back": "answer"}}
]

Make the content educational and helpful for learning."""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert educational content creator. Create high-quality flashcards that help students learn effectively."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1500,
            temperature=0.7
        )
        
        # Parse the response
        response_text = response.choices[0].message.content
        
        # Try to extract JSON from response
        import json
        try:
            # Find JSON array in response
            start_idx = response_text.find('[')
            end_idx = response_text.rfind(']') + 1
            if start_idx != -1 and end_idx != 0:
                json_str = response_text[start_idx:end_idx]
                flashcards = json.loads(json_str)
                return flashcards[:card_count]  # Limit to requested count
        except json.JSONDecodeError:
            pass
        
        # Fallback to mock if parsing fails
        return _generate_mock_flashcards(card_count, card_type)
        
    except Exception as e:
        logger.error(f"Error generating AI flashcards: {e}")
        return _generate_mock_flashcards(card_count, card_type)

def _generate_mock_flashcards(card_count: int, card_type: str) -> List[Dict[str, str]]:
    """Generate mock flashcards as fallback"""
    mock_data = {
        "qa": [
            {"front": "What is software engineering?", "back": "Software engineering is the systematic approach to designing, developing, and maintaining software systems."},
            {"front": "What are the main phases of software development?", "back": "Requirements, Design, Implementation, Testing, Deployment, and Maintenance."},
            {"front": "What is a software requirement?", "back": "A software requirement is a description of what the software should do or how it should behave."},
            {"front": "What is version control?", "back": "Version control is a system that records changes to files over time, allowing you to recall specific versions."},
            {"front": "What is debugging?", "back": "Debugging is the process of finding and fixing errors or bugs in software code."}
        ],
        "term": [
            {"front": "Algorithm", "back": "A step-by-step procedure for solving a problem or completing a task."},
            {"front": "API", "back": "Application Programming Interface - a set of protocols and tools for building software applications."},
            {"front": "Database", "back": "An organized collection of data that can be easily accessed, managed, and updated."},
            {"front": "Framework", "back": "A platform for developing software applications that provides reusable components."},
            {"front": "IDE", "back": "Integrated Development Environment - a software application that provides comprehensive facilities for software development."}
        ],
        "concept": [
            {"front": "Object-Oriented Programming", "back": "A programming paradigm based on objects that contain data and code to manipulate that data."},
            {"front": "Agile Development", "back": "A software development methodology that emphasizes iterative development and collaboration."},
            {"front": "Test-Driven Development", "back": "A software development approach where tests are written before the actual code."},
            {"front": "Continuous Integration", "back": "The practice of frequently integrating code changes into a shared repository."},
            {"front": "Microservices Architecture", "back": "A software architecture pattern that structures an application as a collection of loosely coupled services."}
        ]
    }
    
    base_cards = mock_data.get(card_type, mock_data["qa"])
    return (base_cards * ((card_count // len(base_cards)) + 1))[:card_count]

# Chatbot endpoints
@app.post("/api/chatbot/message")
async def send_message(request: dict):
    """Send message to chatbot with real-time AI responses"""
    try:
        session_id = request.get("sessionId")
        message = request.get("message", "")
        selected_content = request.get("selectedContent", [])
        
        if not session_id:
            session_id = str(uuid.uuid4())
        
        response = await chatbot_engine.process_message(
            session_id=session_id,
            message=message,
            selected_content=selected_content
        )
        
        return response
    except Exception as e:
        logger.error(f"Error processing message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chatbot/sessions")
async def get_chat_sessions():
    """Get all chat sessions"""
    try:
        sessions = await chatbot_engine.get_sessions()
        return {"sessions": sessions}
    except Exception as e:
        logger.error(f"Error getting sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chatbot/session/{session_id}")
async def get_chat_session(session_id: str):
    """Get specific chat session"""
    try:
        session = await chatbot_engine.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return session
    except Exception as e:
        logger.error(f"Error getting session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/chatbot/session/{session_id}")
async def delete_chat_session(session_id: str):
    """Delete chat session"""
    try:
        await chatbot_engine.delete_session(session_id)
        return {"message": "Session deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Teacher endpoints
@app.post("/api/teacher/generate-assignment")
async def generate_assignment(request: dict):
    """Generate assignment from syllabus content"""
    try:
        teacher_id = request.get("teacherId", "teacher_1")
        syllabus_text = request.get("syllabusText", "")
        difficulty = request.get("difficulty", "medium")
        question_types = request.get("questionTypes", ["multiple_choice", "short_answer"])
        question_count = request.get("questionCount", 10)
        
        assignment = await teacher_services.generate_assignment(
            teacher_id=teacher_id,
            syllabus_text=syllabus_text,
            difficulty=difficulty,
            question_types=question_types,
            question_count=question_count
        )
        
        return assignment
    except Exception as e:
        logger.error(f"Error generating assignment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/teacher/assignments/{teacher_id}")
async def get_teacher_assignments(teacher_id: str):
    """Get all assignments created by a teacher"""
    try:
        assignments = await teacher_services.get_teacher_assignments(teacher_id)
        return {"assignments": assignments}
    except Exception as e:
        logger.error(f"Error getting teacher assignments: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/teacher/grade")
async def grade_assignment(request: dict):
    """Grade assignment with AI feedback"""
    try:
        teacher_id = request.get("teacherId", "teacher_1")
        assignment_id = request.get("assignmentId")
        student_answers = request.get("answers", {})
        student_id = request.get("studentId", "student_1")
        
        if not assignment_id:
            raise HTTPException(status_code=400, detail="Assignment ID is required")
        
        grade_result = await teacher_services.grade_assignment(
            teacher_id=teacher_id,
            assignment_id=assignment_id,
            student_answers=student_answers,
            student_id=student_id
        )
        
        return grade_result
    except Exception as e:
        logger.error(f"Error grading assignment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/teacher/grades/{class_id}")
async def get_class_grades(class_id: str):
    """Get graded assignments for a class"""
    try:
        # This would typically filter by class_id
        # For now, return all grades as demo
        grades = []
        grades_dir = Path("../storage/grades")
        
        if grades_dir.exists():
            for grade_file in grades_dir.glob("*.json"):
                with open(grade_file, 'r', encoding='utf-8') as f:
                    grade_data = json.load(f)
                    grades.append({
                        "id": grade_data["id"],
                        "studentId": grade_data["studentId"],
                        "assignmentId": grade_data["assignmentId"],
                        "percentage": grade_data["percentage"],
                        "letterGrade": grade_data["letterGrade"],
                        "gradedAt": grade_data["gradedAt"]
                    })
        
        return {"grades": grades}
    except Exception as e:
        logger.error(f"Error getting class grades: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/teacher/class-analytics/{class_id}")
async def get_class_analytics(class_id: str):
    """Get performance analytics for a class"""
    try:
        # Mock analytics data
        analytics = {
            "classId": class_id,
            "totalStudents": 25,
            "averageScore": 78.5,
            "highestScore": 95.0,
            "lowestScore": 45.0,
            "topPerformers": [
                {"name": "Student A", "score": 95.0},
                {"name": "Student B", "score": 92.0},
                {"name": "Student C", "score": 89.0}
            ],
            "weakTopics": [
                {"topic": "Advanced Concepts", "averageScore": 65.0},
                {"topic": "Practical Applications", "averageScore": 70.0},
                {"topic": "Theory Fundamentals", "averageScore": 75.0}
            ],
            "performanceDistribution": {
                "A": 6,
                "B": 12,
                "C": 5,
                "D": 2,
                "F": 0
            },
            "lastUpdated": datetime.now().isoformat()
        }
        
        return analytics
    except Exception as e:
        logger.error(f"Error getting class analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/teacher/recommendations/{class_id}")
async def get_content_recommendations(class_id: str):
    """Get content recommendations based on class performance"""
    try:
        # Mock recommendations
        recommendations = {
            "classId": class_id,
            "recommendations": [
                {
                    "topic": "Advanced Problem Solving",
                    "reason": "Class average below 70% in this area",
                    "resources": [
                        {"type": "video", "title": "Problem Solving Techniques", "url": "#", "duration": "15 min"},
                        {"type": "article", "title": "Advanced Methods Guide", "url": "#", "readTime": "10 min"},
                        {"type": "quiz", "title": "Practice Problems", "url": "#", "questions": 20}
                    ]
                },
                {
                    "topic": "Conceptual Understanding",
                    "reason": "Students struggling with theoretical concepts",
                    "resources": [
                        {"type": "interactive", "title": "Concept Visualization", "url": "#", "duration": "20 min"},
                        {"type": "worksheet", "title": "Guided Practice", "url": "#", "exercises": 15}
                    ]
                }
            ],
            "generatedAt": datetime.now().isoformat()
        }
        
        return recommendations
    except Exception as e:
        logger.error(f"Error getting recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/teacher/check-plagiarism")
async def check_plagiarism(request: dict):
    """Check content for plagiarism"""
    try:
        content = request.get("content", "")
        if not content:
            raise HTTPException(status_code=400, detail="Content is required")
        
        # Mock plagiarism check
        import random
        
        originality_percent = random.randint(65, 95)
        
        result = {
            "originalityPercent": originality_percent,
            "plagiarismPercent": 100 - originality_percent,
            "matches": [
                {
                    "source": "Academic Paper - Educational Technology",
                    "similarity": 15.5,
                    "url": "https://example.com/paper1"
                },
                {
                    "source": "Wikipedia - Learning Management Systems",
                    "similarity": 8.2,
                    "url": "https://wikipedia.org/wiki/lms"
                }
            ] if originality_percent < 85 else [],
            "status": "original" if originality_percent >= 85 else "potential_plagiarism",
            "checkedAt": datetime.now().isoformat()
        }
        
        return result
    except Exception as e:
        logger.error(f"Error checking plagiarism: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/teacher/generate-lesson-plan")
async def generate_lesson_plan(request: dict):
    """Generate lesson plan for given topic"""
    try:
        teacher_id = request.get("teacherId", "teacher_1")
        topic = request.get("topic", "")
        class_level = request.get("classLevel", "intermediate")
        duration = request.get("duration", 60)
        
        if not topic:
            raise HTTPException(status_code=400, detail="Topic is required")
        
        # Mock lesson plan generation
        lesson_plan = {
            "id": str(uuid.uuid4()),
            "teacherId": teacher_id,
            "topic": topic,
            "classLevel": class_level,
            "duration": duration,
            "objectives": [
                f"Students will understand the key concepts of {topic}",
                f"Students will be able to apply {topic} in practical scenarios",
                f"Students will analyze different aspects of {topic}"
            ],
            "activities": [
                {
                    "time": "0-10 min",
                    "activity": "Introduction and warm-up",
                    "description": f"Brief overview of {topic} and its importance"
                },
                {
                    "time": "10-30 min",
                    "activity": "Main instruction",
                    "description": f"Detailed explanation of {topic} with examples"
                },
                {
                    "time": "30-45 min",
                    "activity": "Interactive practice",
                    "description": "Students work on guided exercises"
                },
                {
                    "time": "45-60 min",
                    "activity": "Assessment and wrap-up",
                    "description": "Quick quiz and summary of key points"
                }
            ],
            "materials": [
                "Whiteboard/Projector",
                "Handouts with exercises",
                "Reference materials"
            ],
            "assessment": [
                "Formative: Class participation and questioning",
                "Summative: End-of-lesson quiz"
            ],
            "homework": f"Practice exercises on {topic} - Pages 1-3",
            "createdAt": datetime.now().isoformat()
        }
        
        # Save lesson plan
        lesson_plans_dir = Path("../storage/lesson_plans")
        lesson_plans_dir.mkdir(parents=True, exist_ok=True)
        
        plan_file = lesson_plans_dir / f"{lesson_plan['id']}.json"
        with open(plan_file, 'w', encoding='utf-8') as f:
            json.dump(lesson_plan, f, indent=2, ensure_ascii=False)
        
        return lesson_plan
    except Exception as e:
        logger.error(f"Error generating lesson plan: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)