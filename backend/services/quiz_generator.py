import os
import json
import uuid
import asyncio
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional, Any
import logging
import openai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class QuizGenerator:
    def __init__(self):
        self.storage_root = Path("../storage")
        self.processed_dir = self.storage_root / "processed"
        self.quizzes_dir = self.storage_root / "quizzes"
        self.quizzes_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize OpenAI client
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.client = openai.OpenAI(api_key=self.api_key) if self.api_key else None
        self.model = os.getenv("OPENAI_MODEL_SUMMARY", "gpt-4o-mini")
        
        # Check if API key is available
        self.use_real_api = bool(self.api_key and self.api_key != "your_openai_api_key_here")
        
        if not self.use_real_api:
            logger.warning("OpenAI API key not configured. Using mock quiz generation.")
    
    async def generate_quiz(self, content_path: str, question_types: List[str], question_count: int, title: str = "") -> Dict[str, Any]:
        """Generate quiz based on content with real AI"""
        try:
            # Load content
            content = await self._load_content(content_path)
            
            # Generate quiz using AI
            if self.use_real_api:
                quiz_data = await self._generate_ai_quiz(content, question_types, question_count)
            else:
                quiz_data = await self._generate_mock_quiz(content_path, question_types, question_count)
            
            # Create quiz metadata
            quiz_id = str(uuid.uuid4())
            quiz = {
                "id": quiz_id,
                "title": title or f"Quiz from {Path(content_path).stem}",
                "contentPath": content_path,
                "createdDate": datetime.now().isoformat(),
                "questionTypes": question_types,
                "totalQuestions": question_count,
                "questions": quiz_data,
                "timeLimit": question_count * 2,  # 2 minutes per question
                "status": "active"
            }
            
            # Save quiz
            quiz_file = self.quizzes_dir / f"{quiz_id}.json"
            with open(quiz_file, 'w', encoding='utf-8') as f:
                json.dump(quiz, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Generated quiz {quiz_id} with {len(quiz_data)} questions")
            return quiz
            
        except Exception as e:
            logger.error(f"Error generating quiz: {e}")
            raise
    
    async def _generate_ai_quiz(self, content: str, question_types: List[str], question_count: int) -> List[Dict[str, Any]]:
        """Generate quiz using OpenAI API"""
        try:
            # Prepare question type instructions
            type_instructions = []
            if "multiple_choice" in question_types:
                type_instructions.append("multiple choice questions with 4 options")
            if "true_false" in question_types:
                type_instructions.append("true/false questions")
            if "short_answer" in question_types:
                type_instructions.append("short answer questions")
            
            types_str = ", ".join(type_instructions)
            
            # Create prompt for AI
            prompt = f"""Based on the following educational content, create {question_count} quiz questions. 
            Include {types_str}.
            
            Content:
            {content[:3000]}  # Limit content to avoid token limits
            
            For each question, provide:
            1. Question text
            2. Question type
            3. For multiple choice: 4 options with correct answer indicated
            4. For true/false: correct answer (true/false)
            5. For short answer: sample correct answer and explanation
            6. Explanation for the correct answer
            7. Difficulty level (easy/medium/hard)
            
            Format the response as JSON array with this structure:
            [
                {{
                    "id": "q1",
                    "type": "multiple_choice",
                    "question": "Question text here",
                    "options": ["A", "B", "C", "D"],  // for multiple choice only
                    "correctAnswer": "A",  // or true/false, or text for short answer
                    "explanation": "Explanation text",
                    "difficulty": "medium",
                    "points": 10
                }}
            ]"""
            
            response = await asyncio.to_thread(
                self.client.chat.completions.create,
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert quiz creator for educational content. Create well-structured, clear questions that test understanding of the material."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=2000,
                temperature=0.3
            )
            
            # Parse AI response
            ai_response = response.choices[0].message.content
            
            # Try to extract JSON from response
            try:
                # Find JSON array in response
                start_idx = ai_response.find('[')
                end_idx = ai_response.rfind(']') + 1
                if start_idx != -1 and end_idx != -1:
                    json_str = ai_response[start_idx:end_idx]
                    questions = json.loads(json_str)
                    
                    # Convert letter answers to indices for multiple choice questions
                    for question in questions:
                        if question.get('type') == 'multiple_choice' and 'correctAnswer' in question:
                            correct_answer = question['correctAnswer']
                            if isinstance(correct_answer, str) and len(correct_answer) == 1:
                                # Convert A=0, B=1, C=2, D=3
                                question['correctAnswer'] = ord(correct_answer.upper()) - ord('A')
                    
                    return questions[:question_count]  # Ensure we don't exceed requested count
                else:
                    raise ValueError("No JSON array found in AI response")
            except json.JSONDecodeError:
                logger.warning("Could not parse AI response as JSON, falling back to mock questions")
                return await self._generate_mock_quiz("", question_types, question_count)
            
        except Exception as e:
            logger.error(f"Error generating AI quiz: {e}")
            # Fallback to mock questions
            return await self._generate_mock_quiz("", question_types, question_count)
    
    async def _generate_mock_quiz(self, content_path: str, question_types: List[str], question_count: int) -> List[Dict[str, Any]]:
        """Generate mock quiz for demonstration"""
        questions = []
        question_id = 1
        
        # Create a mix of question types based on what's requested
        remaining_count = question_count
        
        # Multiple choice questions
        if "multiple_choice" in question_types and remaining_count > 0:
            mc_count = min(remaining_count // len(question_types) + 1, remaining_count)
            for i in range(mc_count):
                questions.append({
                    "id": f"q{question_id}",
                    "type": "multiple_choice",
                    "question": f"What is the main concept discussed in topic {i + 1}?",
                    "options": [
                        f"Concept A - Primary definition",
                        f"Concept B - Secondary aspect", 
                        f"Concept C - Related topic",
                        f"Concept D - Unrelated option"
                    ],
                    "correctAnswer": 0,  # Index for first option
                    "explanation": f"The main concept is Concept A as it represents the primary definition discussed in the content.",
                    "difficulty": "medium",
                    "points": 10
                })
                question_id += 1
                remaining_count -= 1
                if remaining_count <= 0:
                    break
        
        # True/False questions
        if "true_false" in question_types and remaining_count > 0:
            tf_count = min(remaining_count // 2 + 1, remaining_count)
            for i in range(tf_count):
                questions.append({
                    "id": f"q{question_id}",
                    "type": "true_false",
                    "question": f"The concept mentioned in section {i + 1} is fundamental to understanding the topic.",
                    "correctAnswer": True if i % 2 == 0 else False,
                    "explanation": f"This statement is {'correct' if i % 2 == 0 else 'incorrect'} because the concept {'is' if i % 2 == 0 else 'is not'} fundamental to the topic understanding.",
                    "difficulty": "easy",
                    "points": 5
                })
                question_id += 1
                remaining_count -= 1
                if remaining_count <= 0:
                    break
        
        # Short answer questions
        if "short_answer" in question_types and remaining_count > 0:
            for i in range(remaining_count):
                questions.append({
                    "id": f"q{question_id}",
                    "type": "short_answer",
                    "question": f"Explain the key principle discussed in the content regarding topic {i + 1}.",
                    "correctAnswer": f"The key principle involves understanding the fundamental concepts and their practical applications in real-world scenarios.",
                    "explanation": f"A good answer should mention the fundamental concepts, their relationships, and practical applications.",
                    "difficulty": "hard", 
                    "points": 15
                })
                question_id += 1
        
        return questions[:question_count]
    
    async def _load_content(self, content_path: str) -> str:
        """Load content from processed files"""
        try:
            if not content_path:
                return "Sample educational content for quiz generation."
            
            # Handle relative paths
            if not content_path.startswith('processed/'):
                content_path = f"processed/{content_path}"
            
            full_path = self.storage_root / content_path
            if full_path.exists():
                with open(full_path, 'r', encoding='utf-8') as f:
                    return f.read()
            else:
                # Search for content files if exact path not found
                for processed_file in self.processed_dir.rglob("*.txt"):
                    if processed_file.stem in content_path:
                        with open(processed_file, 'r', encoding='utf-8') as f:
                            return f.read()
                
                return "Sample educational content for quiz generation."
                
        except Exception as e:
            logger.error(f"Error loading content: {e}")
            return "Sample educational content for quiz generation."
    
    async def get_quiz(self, quiz_id: str) -> Optional[Dict[str, Any]]:
        """Get quiz by ID"""
        try:
            quiz_file = self.quizzes_dir / f"{quiz_id}.json"
            if quiz_file.exists():
                with open(quiz_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            return None
        except Exception as e:
            logger.error(f"Error getting quiz {quiz_id}: {e}")
            return None
    
    async def grade_quiz(self, quiz_id: str, answers: Dict[str, Any]) -> Dict[str, Any]:
        """Grade quiz submission"""
        try:
            quiz = await self.get_quiz(quiz_id)
            if not quiz:
                raise ValueError(f"Quiz {quiz_id} not found")
            
            total_questions = len(quiz["questions"])
            correct_answers = 0
            total_points = 0
            earned_points = 0
            
            results = []
            
            for question in quiz["questions"]:
                question_id = question["id"]
                user_answer = answers.get(question_id)
                correct_answer = question["correctAnswer"]
                points = question.get("points", 10)
                total_points += points
                
                is_correct = False
                if question["type"] in ["multiple_choice", "true_false"]:
                    is_correct = user_answer == correct_answer
                elif question["type"] == "short_answer":
                    # For short answer, do a simple similarity check
                    if user_answer and correct_answer:
                        is_correct = len(set(user_answer.lower().split()) & 
                                       set(correct_answer.lower().split())) >= 2
                
                if is_correct:
                    correct_answers += 1
                    earned_points += points
                
                results.append({
                    "questionId": question_id,
                    "question": question["question"],
                    "userAnswer": user_answer,
                    "correctAnswer": correct_answer,
                    "isCorrect": is_correct,
                    "explanation": question.get("explanation", ""),
                    "points": points if is_correct else 0,
                    "maxPoints": points
                })
            
            # Calculate score
            score_percentage = (earned_points / total_points) * 100 if total_points > 0 else 0
            
            # Determine grade
            if score_percentage >= 90:
                grade = "A"
            elif score_percentage >= 80:
                grade = "B"
            elif score_percentage >= 70:
                grade = "C"
            elif score_percentage >= 60:
                grade = "D"
            else:
                grade = "F"
            
            # Save result
            result_id = str(uuid.uuid4())
            result_data = {
                "id": result_id,
                "quizId": quiz_id,
                "submissionDate": datetime.now().isoformat(),
                "totalQuestions": total_questions,
                "correctAnswers": correct_answers,
                "totalPoints": total_points,
                "earnedPoints": earned_points,
                "scorePercentage": round(score_percentage, 2),
                "grade": grade,
                "results": results
            }
            
            result_file = self.quizzes_dir / f"result_{result_id}.json"
            with open(result_file, 'w', encoding='utf-8') as f:
                json.dump(result_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Graded quiz {quiz_id}: {score_percentage:.1f}% ({correct_answers}/{total_questions})")
            return result_data
            
        except Exception as e:
            logger.error(f"Error grading quiz: {e}")
            raise
    
    async def get_all_quizzes(self) -> List[Dict[str, Any]]:
        """Get all available quizzes"""
        try:
            quizzes = []
            for quiz_file in self.quizzes_dir.glob("*.json"):
                if not quiz_file.name.startswith("result_"):
                    with open(quiz_file, 'r', encoding='utf-8') as f:
                        quiz_data = json.load(f)
                        # Return summary info for listing
                        quizzes.append({
                            "id": quiz_data["id"],
                            "title": quiz_data["title"],
                            "totalQuestions": quiz_data["totalQuestions"],
                            "createdDate": quiz_data["createdDate"],
                            "questionTypes": quiz_data["questionTypes"],
                            "timeLimit": quiz_data.get("timeLimit", 30),
                            "status": quiz_data.get("status", "active")
                        })
            
            # Sort by creation date (newest first)
            quizzes.sort(key=lambda x: x["createdDate"], reverse=True)
            return quizzes
            
        except Exception as e:
            logger.error(f"Error getting all quizzes: {e}")
            return []
    
    async def delete_quiz(self, quiz_id: str) -> bool:
        """Delete a quiz by ID"""
        try:
            quiz_file = self.quizzes_dir / f"{quiz_id}.json"
            if quiz_file.exists():
                quiz_file.unlink()
                logger.info(f"Deleted quiz {quiz_id}")
                return True
            else:
                logger.warning(f"Quiz file not found: {quiz_id}")
                return False
        except Exception as e:
            logger.error(f"Error deleting quiz {quiz_id}: {e}")
            return False