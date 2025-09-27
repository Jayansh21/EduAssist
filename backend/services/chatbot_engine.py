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
from .vector_search import VectorSearchService

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class ChatbotEngine:
    def __init__(self):
        self.storage_root = Path("../storage")
        self.chatbot_dir = self.storage_root / "chatbot"
        self.processed_dir = self.storage_root / "processed"
        self.chatbot_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize OpenAI client
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.client = openai.OpenAI(api_key=self.api_key) if self.api_key else None
        self.model = os.getenv("OPENAI_MODEL_CHAT", "gpt-4o-mini")
        
        # Initialize vector search
        self.vector_search = VectorSearchService()
        
        # Check if API key is available
        self.use_real_api = bool(self.api_key and self.api_key != "your_openai_api_key_here")
        
        if not self.use_real_api:
            logger.warning("OpenAI API key not configured. Using mock chatbot responses.")
    
    async def process_message(self, session_id: str, message: str, selected_content: List[str] = None) -> Dict[str, Any]:
        """Process user message and generate AI response"""
        try:
            # Get or create session
            session = await self._get_or_create_session(session_id)
            
            # Search for relevant content
            sources = []
            context = ""
            
            if selected_content:
                # Use selected content for context
                context = await self._get_selected_content_context(selected_content)
                sources = await self._get_sources(selected_content)
            else:
                # Search all available content
                search_results = self.vector_search.search_content(message, limit=3)
                if search_results:
                    context = "\n\n".join([result["content"] for result in search_results])
                    sources = await self._get_sources_from_search(search_results)
            
            # Generate response
            if self.use_real_api:
                response_text = await self._generate_ai_response(message, context, session["messages"])
            else:
                response_text = await self._generate_mock_response(message, context)
            
            # Create message objects
            user_message = {
                "id": str(uuid.uuid4()),
                "role": "user",
                "content": message,
                "timestamp": datetime.now().isoformat()
            }
            
            bot_message = {
                "id": str(uuid.uuid4()),
                "role": "assistant",
                "content": response_text,
                "timestamp": datetime.now().isoformat(),
                "sources": sources
            }
            
            # Update session
            session["messages"].extend([user_message, bot_message])
            session["lastActivity"] = datetime.now().isoformat()
            session["messageCount"] = len(session["messages"])
            
            # Save session
            await self._save_session(session)
            
            logger.info(f"Processed message in session {session_id}")
            return {
                "sessionId": session_id,
                "message": bot_message,
                "sources": sources
            }
            
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            raise
    
    async def _generate_ai_response(self, message: str, context: str, conversation_history: List[Dict]) -> str:
        """Generate response using OpenAI API"""
        try:
            # Prepare conversation context
            system_prompt = """You are an intelligent educational assistant. Your role is to help students understand their uploaded educational content.

Rules:
1. Answer questions based ONLY on the provided context from the uploaded educational materials
2. If the context doesn't contain relevant information, politely say you don't have enough information
3. Keep responses educational, clear, and helpful
4. Break down complex concepts into understandable parts
5. Encourage learning and critical thinking
6. If asked about topics outside the provided context, redirect to the available materials

Be conversational but professional, and always aim to enhance the student's learning experience."""
            
            # Build messages for the conversation
            messages = [{"role": "system", "content": system_prompt}]
            
            # Add context if available
            if context:
                context_message = f"Educational content context:\n\n{context[:3000]}"  # Limit context
                messages.append({"role": "system", "content": context_message})
            
            # Add recent conversation history (last 6 messages)
            recent_history = conversation_history[-6:] if len(conversation_history) > 6 else conversation_history
            for msg in recent_history:
                if msg["role"] in ["user", "assistant"]:
                    messages.append({
                        "role": msg["role"],
                        "content": msg["content"]
                    })
            
            # Add current user message
            messages.append({"role": "user", "content": message})
            
            # Generate response
            response = await asyncio.to_thread(
                self.client.chat.completions.create,
                model=self.model,
                messages=messages,
                max_tokens=500,
                temperature=0.7
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error generating AI response: {e}")
            return "I apologize, but I'm having trouble generating a response right now. Please try again."
    
    async def _generate_mock_response(self, message: str, context: str) -> str:
        """Generate mock response for demonstration"""
        message_lower = message.lower()
        
        # Predefined responses based on common patterns
        if any(word in message_lower for word in ["summary", "summarize", "main points"]):
            return """Based on the uploaded content, here are the main points I can identify:

📝 **Key Concepts:**
- Core educational principles covered in the material
- Important definitions and terminology
- Practical applications and examples

📚 **Learning Objectives:**
- Understanding fundamental concepts
- Developing critical thinking skills
- Applying knowledge to real-world scenarios

🎯 **Focus Areas:**
- Essential topics for assessment
- Areas requiring deeper study
- Connections between different concepts

*Note: This is a demonstration response. With a configured OpenAI API key, I would provide specific insights based on your actual uploaded content.*"""

        elif any(word in message_lower for word in ["explain", "what is", "define"]):
            return """I'd be happy to explain that concept! 

Based on the educational material you've uploaded, this topic typically involves:

🔍 **Definition:** The concept refers to fundamental principles that are essential for understanding the subject matter.

💡 **Key Points:**
- Important characteristics and features
- How it relates to other concepts
- Why it's significant in this context

📖 **Examples:** Real-world applications that demonstrate the concept in practice.

🤔 **Critical Thinking:** Consider how this concept connects to what you already know and how it might apply in different situations.

*For more specific explanations based on your exact content, please ensure your OpenAI API key is configured.*"""

        elif any(word in message_lower for word in ["quiz", "test", "assessment", "questions"]):
            return """Great question about assessment preparation! 

📝 **Study Recommendations:**
- Review the key concepts highlighted in the summary
- Focus on definitions and their applications
- Practice explaining concepts in your own words
- Look for connections between different topics

🎯 **Likely Assessment Areas:**
- Core principles and definitions
- Practical applications and examples
- Analytical and critical thinking questions
- Synthesis of multiple concepts

💪 **Preparation Tips:**
- Use the quiz generator to create practice questions
- Review both the transcript and summary materials
- Focus on understanding rather than memorization

Would you like me to help you focus on any specific topic from your uploaded content?"""

        elif any(word in message_lower for word in ["help", "stuck", "don't understand", "confused"]):
            return """I'm here to help! 🤗

Let me guide you through this:

1️⃣ **Identify the specific concept** you're struggling with
2️⃣ **Review the relevant section** in your uploaded materials
3️⃣ **Break it down** into smaller, manageable parts
4️⃣ **Connect it** to concepts you already understand

💡 **Study Strategies:**
- Try explaining the concept to someone else
- Look for real-world examples
- Create visual diagrams or concept maps
- Practice with different scenarios

🤝 **I can help you with:**
- Clarifying confusing concepts
- Providing different explanations
- Connecting ideas together
- Suggesting study approaches

What specific part would you like to explore together?"""

        else:
            return f"""Thank you for your question about "{message}".

Based on the educational content you've uploaded, I can help you understand this topic better. Here's what I can offer:

🔍 **Analysis:** I can analyze your uploaded materials to find relevant information about this topic.

📚 **Educational Support:** I provide explanations, summaries, and study guidance based on your specific content.

💡 **Learning Enhancement:** I help break down complex concepts and connect different ideas together.

🎯 **Assessment Preparation:** I can guide you on what to focus on for quizzes and tests.

To provide more specific and detailed responses based on your actual uploaded content, please ensure your OpenAI API key is configured in the system settings.

Is there a particular aspect of this topic you'd like me to focus on?"""
    
    async def _get_selected_content_context(self, selected_content: List[str]) -> str:
        """Get context from selected content files"""
        try:
            context_parts = []
            
            for content_path in selected_content:
                # Normalize path - remove any leading slashes or dots
                normalized_path = content_path.strip('/').strip('.')
                
                # Ensure it starts with processed/
                if not normalized_path.startswith('processed/'):
                    normalized_path = f"processed/{normalized_path}"
                
                # Use absolute path from storage directory
                full_path = self.storage_root / normalized_path
                
                # Convert to string for better path handling
                full_path_str = str(full_path.resolve())
                
                if os.path.exists(full_path_str):
                    with open(full_path_str, 'r', encoding='utf-8') as f:
                        content = f.read()
                        # Take first 1000 characters to avoid token limits
                        context_parts.append(content[:1000])
                else:
                    logger.warning(f"Content file not found: {full_path_str}")
            
            return "\n\n---\n\n".join(context_parts)
            
        except Exception as e:
            logger.error(f"Error getting selected content context: {e}")
            return ""
    
    async def _get_sources(self, selected_content: List[str]) -> List[Dict[str, str]]:
        """Get source information for selected content"""
        try:
            sources = []
            
            for content_path in selected_content:
                # Get metadata for original filename
                if not content_path.startswith('processed/'):
                    content_path = f"processed/{content_path}"
                
                full_path = self.storage_root / content_path
                metadata_path = full_path.with_suffix('.metadata.json')
                original_name = full_path.stem
                
                if metadata_path.exists():
                    with open(metadata_path, 'r') as f:
                        metadata = json.load(f)
                        original_name = metadata.get("originalName", original_name)
                
                sources.append({
                    "title": original_name,
                    "path": content_path,
                    "excerpt": "Content from uploaded educational material"
                })
            
            return sources
            
        except Exception as e:
            logger.error(f"Error getting sources: {e}")
            return []
    
    async def _get_sources_from_search(self, search_results: List[Dict]) -> List[Dict[str, str]]:
        """Get source information from vector search results"""
        try:
            sources = []
            
            for result in search_results:
                source_path = result.get("source", "")
                title = Path(source_path).stem if source_path else "Educational Content"
                
                # Try to get original filename from metadata
                if source_path:
                    metadata_path = (self.storage_root / source_path).with_suffix('.metadata.json')
                    if metadata_path.exists():
                        with open(metadata_path, 'r') as f:
                            metadata = json.load(f)
                            title = metadata.get("originalName", title)
                
                sources.append({
                    "title": title,
                    "path": source_path,
                    "excerpt": result.get("content", "")[:200] + "..."
                })
            
            return sources
            
        except Exception as e:
            logger.error(f"Error getting sources from search: {e}")
            return []
    
    async def _get_or_create_session(self, session_id: str) -> Dict[str, Any]:
        """Get existing session or create new one"""
        try:
            session_file = self.chatbot_dir / f"{session_id}.json"
            
            if session_file.exists():
                with open(session_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            else:
                # Create new session
                session = {
                    "id": session_id,
                    "title": f"Study Session {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                    "createdDate": datetime.now().isoformat(),
                    "lastActivity": datetime.now().isoformat(),
                    "messages": [],
                    "messageCount": 0
                }
                return session
                
        except Exception as e:
            logger.error(f"Error getting/creating session: {e}")
            # Return default session
            return {
                "id": session_id,
                "title": f"Study Session {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                "createdDate": datetime.now().isoformat(),
                "lastActivity": datetime.now().isoformat(),
                "messages": [],
                "messageCount": 0
            }
    
    async def _save_session(self, session: Dict[str, Any]):
        """Save session to file"""
        try:
            session_file = self.chatbot_dir / f"{session['id']}.json"
            with open(session_file, 'w', encoding='utf-8') as f:
                json.dump(session, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error saving session: {e}")
    
    async def get_sessions(self) -> List[Dict[str, Any]]:
        """Get all chat sessions"""
        try:
            sessions = []
            
            for session_file in self.chatbot_dir.glob("*.json"):
                with open(session_file, 'r', encoding='utf-8') as f:
                    session_data = json.load(f)
                    # Return summary info for listing
                    sessions.append({
                        "id": session_data["id"],
                        "title": session_data["title"],
                        "createdDate": session_data["createdDate"],
                        "lastActivity": session_data["lastActivity"],
                        "messageCount": session_data["messageCount"]
                    })
            
            # Sort by last activity (most recent first)
            sessions.sort(key=lambda x: x["lastActivity"], reverse=True)
            return sessions
            
        except Exception as e:
            logger.error(f"Error getting sessions: {e}")
            return []
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get specific session"""
        try:
            session_file = self.chatbot_dir / f"{session_id}.json"
            if session_file.exists():
                with open(session_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            return None
        except Exception as e:
            logger.error(f"Error getting session {session_id}: {e}")
            return None
    
    async def delete_session(self, session_id: str):
        """Delete chat session"""
        try:
            session_file = self.chatbot_dir / f"{session_id}.json"
            if session_file.exists():
                session_file.unlink()
        except Exception as e:
            logger.error(f"Error deleting session {session_id}: {e}")
            raise