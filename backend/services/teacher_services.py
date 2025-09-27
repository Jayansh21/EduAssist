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

class TeacherServices:
    def __init__(self):
        self.storage_root = Path("../storage")
        self.assignments_dir = self.storage_root / "assignments"
        self.grades_dir = self.storage_root / "grades"
        self.analytics_dir = self.storage_root / "analytics"
        self.recommendations_dir = self.storage_root / "recommendations"
        self.plagiarism_dir = self.storage_root / "plagiarism"
        self.lesson_plans_dir = self.storage_root / "lesson_plans"
        
        # Create directories
        for directory in [self.assignments_dir, self.grades_dir, self.analytics_dir, 
                         self.recommendations_dir, self.plagiarism_dir, self.lesson_plans_dir]:
            directory.mkdir(parents=True, exist_ok=True)
        
        # Initialize OpenAI client
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.client = openai.OpenAI(api_key=self.api_key) if self.api_key else None
        self.model = os.getenv("OPENAI_MODEL_SUMMARY", "gpt-4o-mini")
        
        # Check if API key is available
        self.use_real_api = bool(self.api_key and self.api_key != "your_openai_api_key_here")
        
        if not self.use_real_api:
            logger.warning("OpenAI API key not configured. Using mock teacher services.")

    # Assignment & Test Creator
    async def generate_assignment(self, teacher_id: str, syllabus_text: str, difficulty: str, 
                                 question_types: List[str] = None, question_count: int = 10) -> Dict[str, Any]:
        """Generate assignment/test from syllabus content"""
        try:
            if question_types is None:
                question_types = ['multiple_choice', 'short_answer', 'long_answer']
            
            if self.use_real_api:
                assignment_data = await self._generate_ai_assignment(syllabus_text, difficulty, question_types, question_count)
            else:
                assignment_data = await self._generate_mock_assignment(difficulty, question_types, question_count)
            
            # Create assignment metadata
            assignment_id = str(uuid.uuid4())
            assignment = {
                "id": assignment_id,
                "teacherId": teacher_id,
                "title": f"Assignment - {difficulty.title()} Level",
                "syllabus": syllabus_text[:200] + "..." if len(syllabus_text) > 200 else syllabus_text,
                "difficulty": difficulty,
                "questionTypes": question_types,
                "totalQuestions": question_count,
                "questions": assignment_data,
                "createdAt": datetime.now().isoformat(),
                "status": "active"
            }
            
            # Save assignment
            assignment_file = self.assignments_dir / f"{assignment_id}.json"
            with open(assignment_file, 'w', encoding='utf-8') as f:
                json.dump(assignment, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Generated assignment {assignment_id} with {len(assignment_data)} questions")
            return assignment
            
        except Exception as e:
            logger.error(f"Error generating assignment: {e}")
            raise

    async def _generate_ai_assignment(self, syllabus_text: str, difficulty: str, 
                                    question_types: List[str], question_count: int) -> List[Dict[str, Any]]:
        """Generate assignment using OpenAI API"""
        try:
            # Prepare question type instructions
            type_instructions = []
            if "multiple_choice" in question_types:
                type_instructions.append("multiple choice questions with 4 options")
            if "short_answer" in question_types:
                type_instructions.append("short answer questions (2-3 sentences)")
            if "long_answer" in question_types:
                type_instructions.append("essay/long answer questions")
            if "true_false" in question_types:
                type_instructions.append("true/false questions")
            
            types_str = ", ".join(type_instructions)
            
            # Create prompt for AI
            prompt = f"""Based on the following syllabus content, create a {difficulty} level assignment with {question_count} questions.
            Include {types_str}.
            
            Syllabus Content:
            {syllabus_text[:3000]}
            
            For each question, provide:
            1. Question text
            2. Question type
            3. For multiple choice: 4 options with correct answer marked
            4. For true/false: correct answer (true/false)
            5. For short/long answer: detailed marking scheme and sample answer
            6. Marks allocated (MCQ: 2 marks, Short: 5 marks, Long: 10 marks, T/F: 1 mark)
            7. Learning objective being tested
            8. Difficulty level justification
            
            Format as JSON array:
            [
                {{
                    "id": "q1",
                    "type": "multiple_choice",
                    "question": "Question text here",
                    "options": ["A", "B", "C", "D"],  // for multiple choice only
                    "correctAnswer": "A",  // or true/false, or detailed answer for subjective
                    "markingScheme": "Detailed rubric for evaluation",
                    "marks": 2,
                    "learningObjective": "What skill/knowledge this tests",
                    "difficulty": "{difficulty}"
                }}
            ]"""
            
            response = await asyncio.to_thread(
                self.client.chat.completions.create,
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert teacher and assessment creator. Create comprehensive, well-structured questions that properly assess student understanding."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=3000,
                temperature=0.3
            )
            
            # Parse AI response
            ai_response = response.choices[0].message.content
            
            # Try to extract JSON from response
            try:
                start_idx = ai_response.find('[')
                end_idx = ai_response.rfind(']') + 1
                if start_idx != -1 and end_idx != -1:
                    json_str = ai_response[start_idx:end_idx]
                    questions = json.loads(json_str)
                    return questions[:question_count]
                else:
                    raise ValueError("No JSON array found in AI response")
            except json.JSONDecodeError:
                logger.warning("Could not parse AI response as JSON, falling back to mock questions")
                return await self._generate_mock_assignment(difficulty, question_types, question_count)
            
        except Exception as e:
            logger.error(f"Error generating AI assignment: {e}")
            return await self._generate_mock_assignment(difficulty, question_types, question_count)

    async def _generate_mock_assignment(self, difficulty: str, question_types: List[str], 
                                      question_count: int) -> List[Dict[str, Any]]:
        """Generate mock assignment for demonstration"""
        questions = []
        question_id = 1
        remaining_count = question_count
        
        # Distribution of question types
        type_distribution = {
            'multiple_choice': max(1, remaining_count // 3),
            'short_answer': max(1, remaining_count // 3),
            'long_answer': max(1, remaining_count // 4),
            'true_false': max(1, remaining_count // 4)
        }
        
        for q_type in question_types:
            if remaining_count <= 0:
                break
                
            count = min(type_distribution.get(q_type, 1), remaining_count)
            
            for i in range(count):
                if q_type == 'multiple_choice':
                    questions.append({
                        "id": f"q{question_id}",
                        "type": "multiple_choice",
                        "question": f"Which of the following best describes the concept discussed in topic {i + 1}? ({difficulty} level)",
                        "options": [
                            "Primary theoretical framework",
                            "Secondary application method",
                            "Tertiary supporting evidence",
                            "Unrelated concept"
                        ],
                        "correctAnswer": "Primary theoretical framework",
                        "markingScheme": "1 mark for correct answer. Look for understanding of core concepts.",
                        "marks": 2,
                        "learningObjective": "Students can identify key theoretical frameworks",
                        "difficulty": difficulty
                    })
                elif q_type == 'short_answer':
                    questions.append({
                        "id": f"q{question_id}",
                        "type": "short_answer",
                        "question": f"Explain the significance of the principle discussed in module {i + 1}. ({difficulty} level)",
                        "correctAnswer": "The principle is significant because it forms the foundation for understanding advanced concepts and provides practical applications in real-world scenarios.",
                        "markingScheme": "5 marks total: 2 marks for identifying the principle, 2 marks for explaining significance, 1 mark for examples",
                        "marks": 5,
                        "learningObjective": "Students can explain significance of key principles",
                        "difficulty": difficulty
                    })
                elif q_type == 'long_answer':
                    questions.append({
                        "id": f"q{question_id}",
                        "type": "long_answer",
                        "question": f"Critically analyze the methodology presented in chapter {i + 1}. Discuss its strengths, limitations, and potential improvements. ({difficulty} level)",
                        "correctAnswer": "A comprehensive analysis should include: methodology overview, strengths (accuracy, reliability), limitations (scope, assumptions), and specific improvement suggestions with justifications.",
                        "markingScheme": "10 marks total: 3 marks for methodology explanation, 3 marks for strengths analysis, 2 marks for limitations, 2 marks for improvement suggestions",
                        "marks": 10,
                        "learningObjective": "Students can critically evaluate methodologies",
                        "difficulty": difficulty
                    })
                elif q_type == 'true_false':
                    questions.append({
                        "id": f"q{question_id}",
                        "type": "true_false",
                        "question": f"The concept introduced in section {i + 1} is fundamental to advanced understanding. ({difficulty} level)",
                        "correctAnswer": True,
                        "markingScheme": "1 mark for correct answer. No partial marks.",
                        "marks": 1,
                        "learningObjective": "Students can identify fundamental concepts",
                        "difficulty": difficulty
                    })
                
                question_id += 1
                remaining_count -= 1
                
                if remaining_count <= 0:
                    break
        
        return questions[:question_count]

    # AI Grading & Feedback
    async def grade_assignment(self, teacher_id: str, assignment_id: str, student_answers: Dict[str, Any],
                              student_id: str = None) -> Dict[str, Any]:
        """Grade assignment and provide AI feedback"""
        try:
            # Load assignment
            assignment_file = self.assignments_dir / f"{assignment_id}.json"
            if not assignment_file.exists():
                raise ValueError(f"Assignment {assignment_id} not found")
            
            with open(assignment_file, 'r', encoding='utf-8') as f:
                assignment = json.load(f)
            
            # Grade each question
            total_marks = 0
            earned_marks = 0
            question_results = []
            
            for question in assignment["questions"]:
                question_id = question["id"]
                student_answer = student_answers.get(question_id, "")
                
                if question["type"] in ["multiple_choice", "true_false"]:
                    # Objective grading
                    is_correct = student_answer == question["correctAnswer"]
                    marks_earned = question["marks"] if is_correct else 0
                    feedback = "Correct!" if is_correct else f"Incorrect. The correct answer is: {question['correctAnswer']}"
                else:
                    # Subjective grading (AI or manual)
                    if self.use_real_api:
                        marks_earned, feedback = await self._grade_subjective_ai(question, student_answer)
                    else:
                        marks_earned, feedback = await self._grade_subjective_mock(question, student_answer)
                
                total_marks += question["marks"]
                earned_marks += marks_earned
                
                question_results.append({
                    "questionId": question_id,
                    "question": question["question"],
                    "studentAnswer": student_answer,
                    "correctAnswer": question.get("correctAnswer", ""),
                    "marksEarned": marks_earned,
                    "totalMarks": question["marks"],
                    "feedback": feedback,
                    "markingScheme": question.get("markingScheme", "")
                })
            
            # Calculate percentage and grade
            percentage = (earned_marks / total_marks) * 100 if total_marks > 0 else 0
            letter_grade = self._calculate_letter_grade(percentage)
            
            # Generate overall feedback
            overall_feedback = await self._generate_overall_feedback(percentage, question_results)
            
            # Create grade record
            grade_id = str(uuid.uuid4())
            grade_record = {
                "id": grade_id,
                "teacherId": teacher_id,
                "assignmentId": assignment_id,
                "studentId": student_id or "anonymous",
                "totalMarks": total_marks,
                "earnedMarks": earned_marks,
                "percentage": round(percentage, 2),
                "letterGrade": letter_grade,
                "questionResults": question_results,
                "overallFeedback": overall_feedback,
                "gradedAt": datetime.now().isoformat(),
                "gradedBy": "AI Assistant"
            }
            
            # Save grade record
            grade_file = self.grades_dir / f"{grade_id}.json"
            with open(grade_file, 'w', encoding='utf-8') as f:
                json.dump(grade_record, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Graded assignment {assignment_id}: {percentage:.1f}% ({earned_marks}/{total_marks})")
            return grade_record
            
        except Exception as e:
            logger.error(f"Error grading assignment: {e}")
            raise

    async def _grade_subjective_ai(self, question: Dict, student_answer: str) -> tuple:
        """Grade subjective question using AI"""
        try:
            if not student_answer.strip():
                return 0, "No answer provided"
            
            prompt = f"""Grade the following student answer based on the marking scheme provided.
            
            Question: {question['question']}
            Total Marks: {question['marks']}
            Marking Scheme: {question.get('markingScheme', 'Standard marking criteria')}
            Expected Answer: {question.get('correctAnswer', 'Not provided')}
            
            Student Answer: {student_answer}
            
            Provide:
            1. Marks earned (out of {question['marks']})
            2. Detailed feedback explaining the grade
            
            Format: MARKS: X/{question['marks']} | FEEDBACK: [detailed feedback]"""
            
            response = await asyncio.to_thread(
                self.client.chat.completions.create,
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert teacher grading student assignments. Be fair but thorough in your evaluation."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500,
                temperature=0.3
            )
            
            ai_response = response.choices[0].message.content
            
            # Parse marks and feedback
            try:
                if "MARKS:" in ai_response and "FEEDBACK:" in ai_response:
                    marks_part = ai_response.split("MARKS:")[1].split("FEEDBACK:")[0].strip()
                    feedback_part = ai_response.split("FEEDBACK:")[1].strip()
                    
                    # Extract numeric marks
                    marks_earned = float(marks_part.split('/')[0])
                    return marks_earned, feedback_part
                else:
                    # Fallback parsing
                    return question['marks'] * 0.7, ai_response  # Give 70% as default
            except:
                return question['marks'] * 0.6, "AI grading encountered an error. Manual review recommended."
                
        except Exception as e:
            logger.error(f"Error in AI grading: {e}")
            return question['marks'] * 0.5, f"Error in AI grading: {str(e)}"

    async def _grade_subjective_mock(self, question: Dict, student_answer: str) -> tuple:
        """Grade subjective question with mock scoring"""
        if not student_answer.strip():
            return 0, "No answer provided"
        
        # Simple mock grading based on answer length and keywords
        answer_length = len(student_answer.split())
        max_marks = question["marks"]
        
        if answer_length < 10:
            marks = max_marks * 0.3
            feedback = "Answer is too brief. Needs more detail and explanation."
        elif answer_length < 30:
            marks = max_marks * 0.6
            feedback = "Good attempt but could be more comprehensive. Consider adding examples."
        elif answer_length < 50:
            marks = max_marks * 0.8
            feedback = "Well-structured answer with good detail. Minor improvements possible."
        else:
            marks = max_marks * 0.9
            feedback = "Excellent comprehensive answer demonstrating clear understanding."
        
        return round(marks, 1), feedback

    def _calculate_letter_grade(self, percentage: float) -> str:
        """Convert percentage to letter grade"""
        if percentage >= 90:
            return "A+"
        elif percentage >= 85:
            return "A"
        elif percentage >= 80:
            return "A-"
        elif percentage >= 75:
            return "B+"
        elif percentage >= 70:
            return "B"
        elif percentage >= 65:
            return "B-"
        elif percentage >= 60:
            return "C+"
        elif percentage >= 55:
            return "C"
        elif percentage >= 50:
            return "C-"
        else:
            return "F"

    async def _generate_overall_feedback(self, percentage: float, question_results: List[Dict]) -> str:
        """Generate overall performance feedback"""
        if percentage >= 85:
            return "Excellent performance! You demonstrate strong understanding of the concepts."
        elif percentage >= 75:
            return "Good work! You show solid grasp of most concepts with room for minor improvements."
        elif percentage >= 65:
            return "Satisfactory performance. Focus on understanding key concepts more deeply."
        elif percentage >= 50:
            return "Needs improvement. Review the fundamental concepts and practice more."
        else:
            return "Significant improvement needed. Consider seeking additional help and reviewing all materials."

    # Get teacher's assignments
    async def get_teacher_assignments(self, teacher_id: str) -> List[Dict[str, Any]]:
        """Get all assignments created by a teacher"""
        try:
            assignments = []
            for assignment_file in self.assignments_dir.glob("*.json"):
                with open(assignment_file, 'r', encoding='utf-8') as f:
                    assignment_data = json.load(f)
                    if assignment_data.get("teacherId") == teacher_id:
                        # Return summary info
                        assignments.append({
                            "id": assignment_data["id"],
                            "title": assignment_data["title"],
                            "difficulty": assignment_data["difficulty"],
                            "totalQuestions": assignment_data["totalQuestions"],
                            "createdAt": assignment_data["createdAt"],
                            "status": assignment_data.get("status", "active")
                        })
            
            # Sort by creation date (newest first)
            assignments.sort(key=lambda x: x["createdAt"], reverse=True)
            return assignments
            
        except Exception as e:
            logger.error(f"Error getting teacher assignments: {e}")
            return []
